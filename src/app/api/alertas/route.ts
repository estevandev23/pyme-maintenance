import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  DIAS_VENTANA_PROXIMIDAD,
  diasNaturalesHasta,
  ventanaDeProximidad,
} from "@/lib/dias-naturales"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    const userId = session.user.id
    const empresaId = session.user.empresaId

    // Filtros basados en rol
    let mantenimientosWhere: Record<string, unknown> = {}

    if (userRole === "CLIENTE" && empresaId) {
      mantenimientosWhere = { equipo: { empresaId } }
    } else if (userRole === "TECNICO") {
      mantenimientosWhere = { tecnicoId: userId }
    }

    // El criterio es por DÍA NATURAL, no por instante.
    //
    // Antes se comparaba contra `new Date()` sin normalizar, así que un
    // mantenimiento programado para hoy quedaba por debajo de «ahora» en cuanto
    // pasaba un segundo y salía como «atrasado por 0 día(s)», en rojo y con
    // prioridad alta, mientras el listado de mantenimientos —que sí compara por
    // días— lo pintaba en amarillo como «programado para hoy». Dos pantallas
    // contradiciéndose sobre el mismo registro el mismo día.
    const hoy = new Date()
    const { desde: comienzoDeHoy, hasta: finDeLaVentana } =
      ventanaDeProximidad(DIAS_VENTANA_PROXIMIDAD, hoy)

    // Mantenimientos próximos a vencer: desde hoy hasta el final de la ventana.
    const proximosAVencer = await prisma.mantenimiento.findMany({
      where: {
        ...mantenimientosWhere,
        estado: "PROGRAMADO",
        fechaProgramada: {
          gte: comienzoDeHoy,
          lte: finDeLaVentana,
        },
      },
      include: {
        equipo: {
          select: {
            tipo: true,
            marca: true,
            modelo: true,
            serial: true,
            empresa: {
              select: {
                nombre: true,
              },
            },
          },
        },
        tecnico: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaProgramada: "asc",
      },
    })

    // Mantenimientos atrasados (fecha programada pasada y aún no completados)
    const atrasados = await prisma.mantenimiento.findMany({
      where: {
        ...mantenimientosWhere,
        estado: {
          in: ["PROGRAMADO", "EN_PROCESO"],
        },
        // Atrasado es «su día ya pasó», no «su instante ya pasó». Quien tiene
        // el trabajo programado para hoy tiene todo el día para hacerlo.
        fechaProgramada: {
          lt: comienzoDeHoy,
        },
      },
      include: {
        equipo: {
          select: {
            tipo: true,
            marca: true,
            modelo: true,
            serial: true,
            empresa: {
              select: {
                nombre: true,
              },
            },
          },
        },
        tecnico: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaProgramada: "asc",
      },
    })

    // Equipos críticos (en mantenimiento o dados de baja)
    let equiposWhere: Record<string, unknown> = {
      estado: {
        in: ["EN_MANTENIMIENTO", "DADO_DE_BAJA"],
      },
    }

    if (userRole === "CLIENTE" && empresaId) {
      equiposWhere = { ...equiposWhere, empresaId }
    } else if (userRole === "TECNICO") {
      // Los técnicos ven equipos de mantenimientos asignados a ellos
      const equiposIds = await prisma.mantenimiento.findMany({
        where: { tecnicoId: userId },
        select: { equipoId: true },
        distinct: ["equipoId"],
      })
      equiposWhere = {
        ...equiposWhere,
        id: { in: equiposIds.map((m) => m.equipoId) },
      }
    }

    // Mantenimientos abiertos que esperan técnico.
    //
    // Solo se consultan para el ADMIN: es el único que puede resolverlos. Para
    // los demás roles la lista queda vacía sin necesidad de ir a la base.
    const sinTecnico =
      userRole === "ADMIN"
        ? await prisma.mantenimiento.findMany({
            where: {
              tecnicoId: null,
              estado: { in: ["PROGRAMADO", "EN_PROCESO"] },
            },
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
            orderBy: { fechaProgramada: "asc" },
          })
        : []

    const equiposCriticos = await prisma.equipo.findMany({
      where: equiposWhere,
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    // Construir alertas
    const alertas = []

    // Alertas de mantenimientos atrasados
    for (const mant of atrasados) {
      const diasAtrasado = Math.abs(diasNaturalesHasta(mant.fechaProgramada, hoy))
      alertas.push({
        id: `atrasado-${mant.id}`,
        tipo: "ATRASADO",
        prioridad: "ALTA",
        titulo: "Mantenimiento atrasado",
        mensaje: `El mantenimiento ${mant.tipo.toLowerCase()} del equipo ${mant.equipo.tipo} está atrasado por ${diasAtrasado} día(s)`,
        mantenimiento: mant,
        fecha: mant.fechaProgramada,
      })
    }

    // Alertas de mantenimientos próximos
    for (const mant of proximosAVencer) {
      const diasRestantes = diasNaturalesHasta(mant.fechaProgramada, hoy)
      alertas.push({
        id: `proximo-${mant.id}`,
        tipo: "PROXIMO",
        prioridad: diasRestantes <= 1 ? "ALTA" : "MEDIA",
        titulo: "Mantenimiento próximo",
        mensaje: `El mantenimiento ${mant.tipo.toLowerCase()} del equipo ${mant.equipo.tipo} está programado ${diasRestantes === 0 ? "para hoy" : `en ${diasRestantes} día(s)`}`,
        mantenimiento: mant,
        fecha: mant.fechaProgramada,
      })
    }

    // Alertas de equipos críticos
    for (const equipo of equiposCriticos) {
      alertas.push({
        id: `critico-${equipo.id}`,
        tipo: "CRITICO",
        prioridad: equipo.estado === "DADO_DE_BAJA" ? "ALTA" : "MEDIA",
        titulo: "Equipo crítico",
        mensaje: `El equipo ${equipo.tipo} (${equipo.marca}) está en estado: ${equipo.estado === "EN_MANTENIMIENTO" ? "En Mantenimiento" : "Dado de Baja"}`,
        equipo,
        fecha: new Date(),
      })
    }

    // Alertas de mantenimientos sin técnico asignado.
    //
    // Solo para el administrador: es él quien puede resolverlas. Al cliente no
    // se le presenta como una incidencia suya —no puede hacer nada— y al
    // técnico no le corresponde trabajo que no tiene asignado.
    //
    // La alerta es derivada, como las otras tres: desaparece sola en cuanto se
    // asigne un técnico, sin ningún estado que mantener sincronizado.
    for (const mant of sinTecnico) {
      alertas.push({
        id: `sin-tecnico-${mant.id}`,
        tipo: "SIN_TECNICO",
        prioridad: "ALTA",
        titulo: "Mantenimiento sin técnico",
        mensaje: `El mantenimiento ${mant.tipo.toLowerCase()} del equipo ${mant.equipo.tipo} espera técnico: la empresa no tenía ninguno disponible al crearlo`,
        mantenimiento: mant,
        fecha: mant.fechaProgramada,
      })
    }

    // Ordenar alertas por prioridad y fecha
    alertas.sort((a, b) => {
      const prioridadOrden: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }
      if (prioridadOrden[a.prioridad] !== prioridadOrden[b.prioridad]) {
        return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
      }
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    })

    return NextResponse.json({
      alertas,
      contadores: {
        atrasados: atrasados.length,
        proximos: proximosAVencer.length,
        criticos: equiposCriticos.length,
        sinTecnico: sinTecnico.length,
        total: alertas.length,
      },
    })
  } catch (error) {
    console.error("Error al obtener alertas:", error)
    return NextResponse.json(
      { error: "Error al obtener alertas" },
      { status: 500 }
    )
  }
}
