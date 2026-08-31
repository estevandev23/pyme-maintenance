import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/lib/validations/user"

// GET /api/usuarios/[id] - Obtener un usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede ver detalles de usuarios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        role: true,
        empresaId: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
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
            equipo: {
              select: {
                tipo: true,
                marca: true,
                serial: true,
              },
            },
          },
          orderBy: {
            fechaProgramada: "desc",
          },
          take: 10,
        },
      },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    )
  }
}

// PUT /api/usuarios/[id] - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede actualizar usuarios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Si se actualiza el email, verificar que no exista
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: "Ya existe un usuario con este email" },
          { status: 400 }
        )
      }
    }

    // Si se cambia a CLIENTE, debe tener empresa
    if (validatedData.role === "CLIENTE" && !validatedData.empresaId && !existingUser.empresaId) {
      return NextResponse.json(
        { error: "Los usuarios de tipo CLIENTE deben estar asociados a una empresa" },
        { status: 400 }
      )
    }

    // Si se proporciona empresa, verificar que exista
    if (validatedData.empresaId) {
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

    const usuario = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        nombre: true,
        role: true,
        empresaId: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    })

    return NextResponse.json(usuario)
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al actualizar usuario:", error)
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}

// DELETE /api/usuarios/[id] - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede eliminar usuarios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mantenimientos: true,
            historial: true,
            // Un cliente con solicitudes tenía una clave foránea restrictiva
            // que esta comprobación no miraba: el borrado pasaba el guard y
            // reventaba contra la base con un error interno.
            solicitudes: true,
          },
        },
      },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // No permitir eliminar al propio usuario
    if (usuario.id === session.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 }
      )
    }

    // Verificar si tiene datos relacionados
    if (
      usuario._count.mantenimientos > 0 ||
      usuario._count.historial > 0 ||
      usuario._count.solicitudes > 0
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el usuario porque tiene mantenimientos, historial o solicitudes asociadas",
          details: {
            mantenimientos: usuario._count.mantenimientos,
            historial: usuario._count.historial,
            solicitudes: usuario._count.solicitudes,
          }
        },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Usuario eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}
