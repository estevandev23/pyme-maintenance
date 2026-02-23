import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateSolicitudSchema } from "@/lib/validations/solicitud"

// GET /api/solicitudes/[id] - Obtener solicitud por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const solicitud = await prisma.solicitudServicio.findUnique({
      where: { id },
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

    if (!solicitud) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    // CLIENTE solo puede ver sus propias solicitudes
    if (session.user.role === "CLIENTE" && solicitud.clienteId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    return NextResponse.json(solicitud)
  } catch (error) {
    console.error("Error al obtener solicitud:", error)
    return NextResponse.json(
      { error: "Error al obtener solicitud" },
      { status: 500 }
    )
  }
}

// PUT /api/solicitudes/[id] - Actualizar solicitud
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateSolicitudSchema.parse(body)

    const existingSolicitud = await prisma.solicitudServicio.findUnique({
      where: { id },
    })

    if (!existingSolicitud) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    // ADMIN puede cambiar estado y agregar respuesta
    if (session.user.role === "ADMIN") {
      const solicitud = await prisma.solicitudServicio.update({
        where: { id },
        data: validatedData,
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

      return NextResponse.json(solicitud)
    }

    // CLIENTE solo puede cancelar (rechazar) si está PENDIENTE
    if (session.user.role === "CLIENTE") {
      if (existingSolicitud.clienteId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }

      if (existingSolicitud.estado !== "PENDIENTE") {
        return NextResponse.json(
          { error: "Solo puede cancelar solicitudes pendientes" },
          { status: 400 }
        )
      }

      const solicitud = await prisma.solicitudServicio.update({
        where: { id },
        data: { estado: "RECHAZADA", respuesta: "Cancelada por el cliente" },
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

      return NextResponse.json(solicitud)
    }

    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al actualizar solicitud:", error)
    return NextResponse.json(
      { error: "Error al actualizar solicitud" },
      { status: 500 }
    )
  }
}

// DELETE /api/solicitudes/[id] - Eliminar solicitud (solo ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    const solicitud = await prisma.solicitudServicio.findUnique({
      where: { id },
    })

    if (!solicitud) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    await prisma.solicitudServicio.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Solicitud eliminada exitosamente" })
  } catch (error) {
    console.error("Error al eliminar solicitud:", error)
    return NextResponse.json(
      { error: "Error al eliminar solicitud" },
      { status: 500 }
    )
  }
}
