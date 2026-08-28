import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const equipoId = searchParams.get("equipoId")
    const tecnicoId = searchParams.get("tecnicoId")
    const empresaId = searchParams.get("empresaId")
    const fechaDesde = searchParams.get("fechaDesde")
    const fechaHasta = searchParams.get("fechaHasta")
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")

    const userRole = session.user.role
    const userEmpresaId = session.user.empresaId
    const userId = session.user.id

    // Construir filtros base según rol
    const whereClause: Prisma.HistorialWhereInput = {}

    // Filtros por rol
    if (userRole === "CLIENTE" && userEmpresaId) {
      whereClause.equipo = { empresaId: userEmpresaId }
    } else if (userRole === "TECNICO") {
      whereClause.tecnicoId = userId
    }

    // Filtros adicionales
    if (equipoId) {
      whereClause.equipoId = equipoId
    }

    if (tecnicoId && userRole === "ADMIN") {
      whereClause.tecnicoId = tecnicoId
    }

    if (empresaId && userRole === "ADMIN") {
      whereClause.equipo = { empresaId }
    }

    // Filtros de fecha. Se arma aparte porque `whereClause.fecha` admite varias
    // formas y no se le pueden ir añadiendo claves una a una.
    if (fechaDesde || fechaHasta) {
      const fecha: Prisma.DateTimeFilter = {}
      if (fechaDesde) {
        fecha.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        fecha.lte = new Date(fechaHasta)
      }
      whereClause.fecha = fecha
    }

    const include = {
      equipo: {
        select: {
          id: true,
          tipo: true,
          marca: true,
          modelo: true,
          serial: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
      tecnico: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      mantenimiento: {
        select: {
          id: true,
          tipo: true,
          estado: true,
          descripcion: true,
        },
      },
    }

    // Si se solicita paginación
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10") || 10))
      const skip = (page - 1) * limit

      const [historial, total] = await Promise.all([
        prisma.historial.findMany({ where: whereClause, include, orderBy: { fecha: "desc" }, skip, take: limit }),
        prisma.historial.count({ where: whereClause }),
      ])

      return NextResponse.json({
        data: historial,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    const historial = await prisma.historial.findMany({
      where: whereClause,
      include,
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(historial)
  } catch (error) {
    console.error("Error al obtener historial:", error)
    return NextResponse.json(
      { error: "Error al obtener historial" },
      { status: 500 }
    )
  }
}
