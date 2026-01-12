import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateMantenimientoSchema } from "@/lib/validations/mantenimiento"

// GET /api/mantenimientos/[id] - Obtener un mantenimiento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const mantenimiento = await prisma.mantenimiento.findUnique({
      where: { id: params.id },
      include: {
        equipo: {
          select: {
            id: true,
            tipo: true,
            marca: true,
            modelo: true,
            serial: true,
            ubicacion: true,
            empresa: {
              select: {
                id: true,
                nombre: true,
                nit: true,
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
        historial: {
          select: {
            id: true,
            fecha: true,
            observaciones: true,
            tecnico: {
              select: {
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

    if (!mantenimiento) {
      return NextResponse.json(
        { error: "Mantenimiento no encontrado" },
        { status: 404 }
      )
    }

    // Si es técnico, verificar que sea asignado a él
    if (session.user.role === "TECNICO" && mantenimiento.tecnicoId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Si es cliente, verificar que sea de su empresa
    if (session.user.role === "CLIENTE" && session.user.empresaId) {
      if (mantenimiento.equipo.empresa.id !== session.user.empresaId) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }

    return NextResponse.json(mantenimiento)
  } catch (error) {
    console.error("Error al obtener mantenimiento:", error)
    return NextResponse.json(
      { error: "Error al obtener mantenimiento" },
      { status: 500 }
    )
  }
}

// PUT /api/mantenimientos/[id] - Actualizar mantenimiento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateMantenimientoSchema.parse(body)

    // Verificar que el mantenimiento existe
    const existingMantenimiento = await prisma.mantenimiento.findUnique({
      where: { id: params.id },
      include: {
        equipo: true,
      },
    })

    if (!existingMantenimiento) {
      return NextResponse.json(
        { error: "Mantenimiento no encontrado" },
        { status: 404 }
      )
    }

    // Si es técnico, solo puede actualizar sus mantenimientos
    if (session.user.role === "TECNICO" && existingMantenimiento.tecnicoId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Si es cliente, verificar empresa
    if (session.user.role === "CLIENTE" && session.user.empresaId) {
      if (existingMantenimiento.equipo.empresaId !== session.user.empresaId) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {}

    if (validatedData.tipo) updateData.tipo = validatedData.tipo
    if (validatedData.descripcion) updateData.descripcion = validatedData.descripcion
    if (validatedData.observaciones !== undefined) updateData.observaciones = validatedData.observaciones
    if (validatedData.reporteUrl !== undefined) updateData.reporteUrl = validatedData.reporteUrl

    if (validatedData.fechaProgramada) {
      updateData.fechaProgramada = new Date(validatedData.fechaProgramada)
    }

    if (validatedData.fechaRealizada) {
      updateData.fechaRealizada = new Date(validatedData.fechaRealizada)
    }

    if (validatedData.estado) {
      updateData.estado = validatedData.estado

      // Si se completa, establecer fecha realizada automáticamente
      if (validatedData.estado === "COMPLETADO" && !validatedData.fechaRealizada) {
        updateData.fechaRealizada = new Date()
      }
    }

    // Actualizar en transacción con historial
    const result = await prisma.$transaction(async (tx) => {
      const mantenimiento = await tx.mantenimiento.update({
        where: { id: params.id },
        data: updateData,
        include: {
          equipo: {
            select: {
              id: true,
              tipo: true,
              marca: true,
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
        },
      })

      // Crear entrada en historial si cambió el estado
      if (validatedData.estado && validatedData.estado !== existingMantenimiento.estado) {
        await tx.historial.create({
          data: {
            equipoId: existingMantenimiento.equipoId,
            mantenimientoId: params.id,
            tecnicoId: session.user.id,
            observaciones: `Estado cambiado a: ${validatedData.estado}${validatedData.observaciones ? `. ${validatedData.observaciones}` : ""}`,
          },
        })
      }

      return mantenimiento
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al actualizar mantenimiento:", error)
    return NextResponse.json(
      { error: "Error al actualizar mantenimiento" },
      { status: 500 }
    )
  }
}

// DELETE /api/mantenimientos/[id] - Eliminar mantenimiento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede eliminar mantenimientos
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Verificar que el mantenimiento existe
    const mantenimiento = await prisma.mantenimiento.findUnique({
      where: { id: params.id },
    })

    if (!mantenimiento) {
      return NextResponse.json(
        { error: "Mantenimiento no encontrado" },
        { status: 404 }
      )
    }

    // Eliminar (el historial se eliminará en cascada o se mantendrá según el schema)
    await prisma.mantenimiento.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Mantenimiento eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar mantenimiento:", error)
    return NextResponse.json(
      { error: "Error al eliminar mantenimiento" },
      { status: 500 }
    )
  }
}
