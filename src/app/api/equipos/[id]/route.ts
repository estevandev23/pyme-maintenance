import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateEquipoSchema } from "@/lib/validations/equipo"

// GET /api/equipos/[id] - Obtener un equipo por ID
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

    const equipo = await prisma.equipo.findUnique({
      where: { id },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        mantenimientos: {
          select: {
            id: true,
            tipo: true,
            estado: true,
            fechaProgramada: true,
            fechaRealizada: true,
            descripcion: true,
            tecnico: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: {
            fechaProgramada: "desc",
          },
        },
        historial: {
          select: {
            id: true,
            fecha: true,
            observaciones: true,
            tecnico: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: {
            fecha: "desc",
          },
        },
      },
    })

    if (!equipo) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Si es cliente, verificar que sea de su empresa
    if (session.user.role === "CLIENTE" && session.user.empresaId) {
      if (equipo.empresaId !== session.user.empresaId) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }

    return NextResponse.json(equipo)
  } catch (error) {
    console.error("Error al obtener equipo:", error)
    return NextResponse.json(
      { error: "Error al obtener equipo" },
      { status: 500 }
    )
  }
}

// PUT /api/equipos/[id] - Actualizar equipo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role === "TECNICO") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const validatedData = updateEquipoSchema.parse(body)

    // Verificar que el equipo existe
    const existingEquipo = await prisma.equipo.findUnique({
      where: { id },
    })

    if (!existingEquipo) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Si es cliente, verificar que sea de su empresa
    if (session.user.role === "CLIENTE" && session.user.empresaId) {
      if (existingEquipo.empresaId !== session.user.empresaId) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
      // Cliente no puede cambiar de empresa ni el estado del equipo
      delete validatedData.empresaId
      delete validatedData.estado
    }

    // Si se actualiza el serial, verificar que no exista
    if (validatedData.serial && validatedData.serial !== existingEquipo.serial) {
      const serialExists = await prisma.equipo.findUnique({
        where: { serial: validatedData.serial },
      })

      if (serialExists) {
        return NextResponse.json(
          { error: "Ya existe un equipo con este serial" },
          { status: 400 }
        )
      }
    }

    // Si se cambia la empresa, verificar que exista
    if (validatedData.empresaId && validatedData.empresaId !== existingEquipo.empresaId) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: validatedData.empresaId },
      })

      if (!empresa) {
        return NextResponse.json(
          { error: "Empresa no encontrada" },
          { status: 404 }
        )
      }
    }

    const equipo = await prisma.equipo.update({
      where: { id },
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

    return NextResponse.json(equipo)
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al actualizar equipo:", error)
    return NextResponse.json(
      { error: "Error al actualizar equipo" },
      { status: 500 }
    )
  }
}

// DELETE /api/equipos/[id] - Eliminar equipo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede eliminar equipos
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Verificar que el equipo existe
    const equipo = await prisma.equipo.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mantenimientos: true,
            historial: true,
          },
        },
      },
    })

    if (!equipo) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si tiene datos relacionados
    if (equipo._count.mantenimientos > 0 || equipo._count.historial > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar el equipo porque tiene mantenimientos o historial asociado",
          details: {
            mantenimientos: equipo._count.mantenimientos,
            historial: equipo._count.historial,
          }
        },
        { status: 400 }
      )
    }

    await prisma.equipo.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Equipo eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar equipo:", error)
    return NextResponse.json(
      { error: "Error al eliminar equipo" },
      { status: 500 }
    )
  }
}
