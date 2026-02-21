import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const hoy = new Date()
    const tresDiasAdelante = new Date(hoy)
    tresDiasAdelante.setDate(tresDiasAdelante.getDate() + 3)

    // Mantenimientos próximos a vencer (próximos 3 días)
    const proximosAVencer = await prisma.mantenimiento.findMany({
      where: {
        ...mantenimientosWhere,
        estado: "PROGRAMADO",
        fechaProgramada: {
          gte: hoy,
          lte: tresDiasAdelante,
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
        fechaProgramada: {
          lt: hoy,
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
      const diasAtrasado = Math.floor(
        (hoy.getTime() - new Date(mant.fechaProgramada).getTime()) / (1000 * 60 * 60 * 24)
      )
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
      const diasRestantes = Math.ceil(
        (new Date(mant.fechaProgramada).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      )
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
