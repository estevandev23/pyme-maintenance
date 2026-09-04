import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { filtrosDeHistorial } from "@/lib/filtros-listado.server"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")

    // Ver `filtros-listado.server`: la pantalla y la descarga preguntan lo mismo.
    const whereClause = filtrosDeHistorial(searchParams, session.user)

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
