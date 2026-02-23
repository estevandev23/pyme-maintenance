import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { solicitudSchema } from "@/lib/validations/solicitud"

// GET /api/solicitudes - Listar solicitudes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo ADMIN y CLIENTE pueden ver solicitudes
    if (session.user.role === "TECNICO") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado")
    const prioridad = searchParams.get("prioridad")
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")

    const where: any = {}

    // CLIENTE solo ve sus propias solicitudes
    if (session.user.role === "CLIENTE") {
      where.clienteId = session.user.id
    }

    if (estado && estado !== "all") {
      where.estado = estado
    }

    if (prioridad && prioridad !== "all") {
      where.prioridad = prioridad
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
      cliente: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
    }

    // Paginación
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10") || 10))
      const skip = (page - 1) * limit

      const [solicitudes, total] = await Promise.all([
        prisma.solicitudServicio.findMany({
          where,
          include,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.solicitudServicio.count({ where }),
      ])

      return NextResponse.json({
        data: solicitudes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    const solicitudes = await prisma.solicitudServicio.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(solicitudes)
  } catch (error) {
    console.error("Error al obtener solicitudes:", error)
    return NextResponse.json(
      { error: "Error al obtener solicitudes" },
      { status: 500 }
    )
  }
}

// POST /api/solicitudes - Crear solicitud (solo CLIENTE)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo CLIENTE puede crear solicitudes
    if (session.user.role !== "CLIENTE") {
      return NextResponse.json(
        { error: "Solo los clientes pueden crear solicitudes de servicio" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = solicitudSchema.parse(body)

    // Verificar que el equipo existe
    const equipo = await prisma.equipo.findUnique({
      where: { id: validatedData.equipoId },
    })

    if (!equipo) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el equipo pertenece a la empresa del cliente
    if (session.user.empresaId && equipo.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: "No tiene permisos sobre este equipo" },
        { status: 403 }
      )
    }

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        equipoId: validatedData.equipoId,
        clienteId: session.user.id,
        descripcion: validatedData.descripcion,
        prioridad: validatedData.prioridad,
      },
      include: {
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
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(solicitud, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al crear solicitud:", error)
    return NextResponse.json(
      { error: "Error al crear solicitud" },
      { status: 500 }
    )
  }
}
