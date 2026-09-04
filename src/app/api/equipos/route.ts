import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { filtrosDeEquipos } from "@/lib/filtros-listado.server"
import { Prisma, type EstadoEquipo } from "@prisma/client"
import { equipoSchema } from "@/lib/validations/equipo"

// GET /api/equipos - Listar todos los equipos
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
    const where = filtrosDeEquipos(searchParams, session.user)

    const include = {
      empresa: {
        select: {
          id: true,
          nombre: true,
          nit: true,
        },
      },
      _count: {
        select: {
          mantenimientos: true,
        },
      },
    }

    // Si se solicita paginación
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10") || 10))
      const skip = (page - 1) * limit

      const [equipos, total] = await Promise.all([
        prisma.equipo.findMany({ where, orderBy: { createdAt: "desc" }, include, skip, take: limit }),
        prisma.equipo.count({ where }),
      ])

      return NextResponse.json({
        data: equipos,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    const equipos = await prisma.equipo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include,
    })

    return NextResponse.json(equipos)
  } catch (error) {
    console.error("Error al obtener equipos:", error)
    return NextResponse.json(
      { error: "Error al obtener equipos" },
      { status: 500 }
    )
  }
}

// POST /api/equipos - Crear nuevo equipo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // El inventario es de la empresa de mantenimiento: solo el administrador
    // da de alta equipos. Escrito en positivo a propósito. La forma anterior
    // —rechazar al técnico y dejar pasar al resto— es la que dio permiso al
    // cliente sin que nadie lo decidiera, cuando se añadió ese rol.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = equipoSchema.parse(body)

    // El estado de mantenimiento lo determina el trabajo abierto del equipo, no
    // lo que se declare al registrarlo: uno recién creado no tiene ninguno. Se
    // normaliza en lugar de rechazar, porque el valor correcto es deducible sin
    // ambigüedad y un desplegable mal puesto no es un fallo que merezca parar.
    if (validatedData.estado === "EN_MANTENIMIENTO") {
      validatedData.estado = "ACTIVO"
    }

    // Verificar que el serial no exista
    const existingEquipo = await prisma.equipo.findUnique({
      where: { serial: validatedData.serial },
    })

    if (existingEquipo) {
      return NextResponse.json(
        { error: "Ya existe un equipo con este serial" },
        { status: 400 }
      )
    }

    // Verificar que la empresa exista
    const empresa = await prisma.empresa.findUnique({
      where: { id: validatedData.empresaId },
    })

    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      )
    }

    const equipo = await prisma.equipo.create({
      data: validatedData,
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    })

    return NextResponse.json(equipo, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al crear equipo:", error)
    return NextResponse.json(
      { error: "Error al crear equipo" },
      { status: 500 }
    )
  }
}
