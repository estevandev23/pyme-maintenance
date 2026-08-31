import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  cambioPorcentual,
  parsearRango,
  periodoAnterior,
  rangoAISO,
  serieMensual,
  type RangoFechas,
} from "@/lib/estadisticas"

interface Alcance {
  equiposWhere: Record<string, unknown>
  mantenimientosWhere: Record<string, unknown>
}

/**
 * El alcance de datos que le corresponde al rol del usuario. Se construye una
 * sola vez y se reutiliza en todos los indicadores: antes cada métrica repetía
 * las tres ramas por rol, y bastaba olvidarse de una para filtrar de menos.
 */
function construirAlcance(session: {
  user: { id: string; role: string; empresaId?: string | null }
}): Alcance {
  const { id, role, empresaId } = session.user

  if (role === "CLIENTE" && empresaId) {
    return {
      equiposWhere: { empresaId },
      mantenimientosWhere: { equipo: { empresaId } },
    }
  }

  if (role === "TECNICO") {
    return { equiposWhere: {}, mantenimientosWhere: { tecnicoId: id } }
  }

  return { equiposWhere: {}, mantenimientosWhere: {} }
}

/**
 * Filtro por fecha de referencia: la realizada si existe, la programada si no.
 * Expresa en Prisma el mismo criterio que aplica `fechaReferencia`.
 */
function filtroDeRango(rango: RangoFechas) {
  return {
    OR: [
      { fechaRealizada: { gte: rango.desde, lte: rango.hasta } },
      {
        fechaRealizada: null,
        fechaProgramada: { gte: rango.desde, lte: rango.hasta },
      },
    ],
  }
}

const seleccionMantenimiento = {
  id: true,
  tipo: true,
  estado: true,
  fechaProgramada: true,
  fechaRealizada: true,
  equipoId: true,
  equipo: {
    select: {
      tipo: true,
      marca: true,
      modelo: true,
      serial: true,
      empresa: { select: { nombre: true } },
    },
  },
} as const

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const resultadoRango = parsearRango(
      searchParams.get("desde"),
      searchParams.get("hasta")
    )

    if (!resultadoRango.ok) {
      return NextResponse.json({ error: resultadoRango.error }, { status: 400 })
    }

    const rango = resultadoRango.rango
    const anterior = periodoAnterior(rango)
    const alcance = construirAlcance(session)

    // Inventario de equipos: no se acota por fechas, no es un dato de periodo.
    const [totalEquipos, equiposPorEstado, equiposCriticos] = await Promise.all([
      prisma.equipo.count({ where: alcance.equiposWhere }),
      prisma.equipo.groupBy({
        by: ["estado"],
        _count: true,
        where: alcance.equiposWhere,
      }),
      prisma.equipo.count({
        where: {
          ...alcance.equiposWhere,
          estado: { in: ["EN_MANTENIMIENTO", "DADO_DE_BAJA"] },
        },
      }),
    ])

    // Un solo viaje por los mantenimientos del periodo: todos los indicadores
    // del informe salen de aquí, así ninguno puede quedar con otro criterio.
    const [mantenimientos, mantenimientosAnteriores, proximosMantenimientos] =
      await Promise.all([
        prisma.mantenimiento.findMany({
          where: { ...alcance.mantenimientosWhere, ...filtroDeRango(rango) },
          select: seleccionMantenimiento,
        }),
        prisma.mantenimiento.findMany({
          where: { ...alcance.mantenimientosWhere, ...filtroDeRango(anterior) },
          select: { estado: true },
        }),
        prisma.mantenimiento.findMany({
          where: {
            ...alcance.mantenimientosWhere,
            estado: { in: ["PROGRAMADO", "EN_PROCESO"] },
          },
          orderBy: { fechaProgramada: "asc" },
          take: 10,
          include: {
            equipo: {
              select: {
                tipo: true,
                marca: true,
                modelo: true,
                serial: true,
                empresa: { select: { nombre: true } },
              },
            },
            tecnico: { select: { nombre: true } },
          },
        }),
      ])

    const mantenimientosPorEstado: Record<string, number> = {}
    const mantenimientosPorTipo: Record<string, number> = {}
    const correctivosPorEquipo = new Map<string, number>()

    let completadosPeriodo = 0
    let mantenimientosPendientes = 0
    let sumaDesviacionDias = 0
    let completadosConFecha = 0

    for (const mantenimiento of mantenimientos) {
      mantenimientosPorEstado[mantenimiento.estado] =
        (mantenimientosPorEstado[mantenimiento.estado] ?? 0) + 1
      mantenimientosPorTipo[mantenimiento.tipo] =
        (mantenimientosPorTipo[mantenimiento.tipo] ?? 0) + 1

      if (mantenimiento.estado === "COMPLETADO") {
        completadosPeriodo += 1

        if (mantenimiento.fechaRealizada) {
          const diferencia =
            mantenimiento.fechaRealizada.getTime() -
            mantenimiento.fechaProgramada.getTime()
          sumaDesviacionDias += diferencia / (1000 * 60 * 60 * 24)
          completadosConFecha += 1
        }
      }

      if (
        mantenimiento.estado === "PROGRAMADO" ||
        mantenimiento.estado === "EN_PROCESO"
      ) {
        mantenimientosPendientes += 1
      }

      // Un mantenimiento cancelado no es evidencia de que el equipo haya
      // fallado: no llegó a realizarse. Importa ahora porque con la creación
      // automática el cliente puede abrir y cancelar, y sin esta condición cada
      // ticket cancelado seguiría contando como una avería del equipo.
      if (mantenimiento.tipo === "CORRECTIVO" && mantenimiento.estado !== "CANCELADO") {
        correctivosPorEquipo.set(
          mantenimiento.equipoId,
          (correctivosPorEquipo.get(mantenimiento.equipoId) ?? 0) + 1
        )
      }
    }

    let completadosAnterior = 0
    let pendientesAnterior = 0

    for (const mantenimiento of mantenimientosAnteriores) {
      if (mantenimiento.estado === "COMPLETADO") completadosAnterior += 1
      if (
        mantenimiento.estado === "PROGRAMADO" ||
        mantenimiento.estado === "EN_PROCESO"
      ) {
        pendientesAnterior += 1
      }
    }

    // Diferencia media entre la fecha realizada y la programada. Es desviación
    // de agenda, no tiempo de resolución de una solicitud: puede ser negativa
    // cuando el trabajo se adelantó.
    const desviacionPromedioProgramacion =
      completadosConFecha > 0
        ? Math.round((sumaDesviacionDias / completadosConFecha) * 10) / 10
        : 0

    const detallePorEquipo = new Map(
      mantenimientos.map((mantenimiento) => [
        mantenimiento.equipoId,
        mantenimiento.equipo,
      ])
    )

    const fallasRecurrentes = Array.from(correctivosPorEquipo.entries())
      .filter(([, cantidad]) => cantidad >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([equipoId, cantidadFallas]) => {
        const equipo = detallePorEquipo.get(equipoId)
        return {
          equipoId,
          cantidadFallas,
          equipo: equipo
            ? {
                tipo: equipo.tipo,
                marca: equipo.marca,
                modelo: equipo.modelo,
                serial: equipo.serial,
                empresa: equipo.empresa?.nombre || "N/A",
              }
            : null,
        }
      })

    const mantenimientosPorMes = serieMensual(rango, mantenimientos)

    return NextResponse.json({
      rango: rangoAISO(rango),
      totalEquipos,
      equiposPorEstado: equiposPorEstado.reduce(
        (
          acc: Record<string, number>,
          item: { estado: string; _count: number }
        ) => {
          acc[item.estado] = item._count
          return acc
        },
        {} as Record<string, number>
      ),
      equiposCriticos,
      // Total del periodo: coincide con la suma de la serie mensual.
      totalMantenimientos: mantenimientos.length,
      mantenimientosPorEstado,
      mantenimientosPorTipo,
      completadosPeriodo,
      cambioCompletados: cambioPorcentual(completadosPeriodo, completadosAnterior),
      mantenimientosPendientes,
      cambioPendientes: cambioPorcentual(
        mantenimientosPendientes,
        pendientesAnterior
      ),
      desviacionPromedioProgramacion,
      fallasRecurrentes,
      mantenimientosPorMes,
      proximosMantenimientos,
    })
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
