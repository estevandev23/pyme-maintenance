import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { decidirCambioDeEquipo } from "@/lib/edicion-mantenimiento"
import { Prisma } from "@prisma/client"
import { updateMantenimientoSchema, cambiarEstadoSchema } from "@/lib/validations/mantenimiento"
import {
  AsignacionError,
  validarTecnicoAsignable,
} from "@/lib/asignacion-tecnicos.server"

// GET /api/mantenimientos/[id] - Obtener un mantenimiento por ID
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

    const mantenimiento = await prisma.mantenimiento.findUnique({
      where: { id },
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

// Función auxiliar para actualizar estado del equipo automáticamente
async function actualizarEstadoEquipo(
  tx: Prisma.TransactionClient,
  equipoId: string,
  nuevoEstadoMantenimiento: string
) {
  if (nuevoEstadoMantenimiento === "EN_PROCESO" || nuevoEstadoMantenimiento === "PROGRAMADO") {
    await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "EN_MANTENIMIENTO" },
    })
  } else if (nuevoEstadoMantenimiento === "COMPLETADO" || nuevoEstadoMantenimiento === "CANCELADO") {
    // Verificar si hay otros mantenimientos activos para este equipo
    const otrosActivos = await tx.mantenimiento.count({
      where: {
        equipoId,
        estado: { in: ["PROGRAMADO", "EN_PROCESO"] },
      },
    })
    if (otrosActivos === 0) {
      await tx.equipo.update({
        where: { id: equipoId },
        data: { estado: "ACTIVO" },
      })
    }
  }
}

// PUT /api/mantenimientos/[id] - Actualizar mantenimiento
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

    // Verificar que el mantenimiento existe
    const existingMantenimiento = await prisma.mantenimiento.findUnique({
      where: { id },
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

    // TECNICO: solo puede cambiar estado y observaciones de mantenimientos asignados a él
    if (session.user.role === "TECNICO") {
      if (existingMantenimiento.tecnicoId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }

      const validatedData = cambiarEstadoSchema.parse(body)
      const updateData: Prisma.MantenimientoUncheckedUpdateInput = { estado: validatedData.estado }

      if (validatedData.observaciones !== undefined) {
        updateData.observaciones = validatedData.observaciones
      }

      if (validatedData.estado === "COMPLETADO") {
        updateData.fechaRealizada = new Date()
      }

      const result = await prisma.$transaction(async (tx) => {
        const mantenimiento = await tx.mantenimiento.update({
          where: { id },
          data: updateData,
          include: {
            equipo: {
              select: {
                id: true,
                tipo: true,
                marca: true,
                serial: true,
                empresa: { select: { id: true, nombre: true } },
              },
            },
            tecnico: {
              select: { id: true, nombre: true, email: true },
            },
          },
        })

        // Crear historial si cambió el estado
        if (validatedData.estado !== existingMantenimiento.estado) {
          await tx.historial.create({
            data: {
              equipoId: existingMantenimiento.equipoId,
              mantenimientoId: id,
              tecnicoId: session.user.id,
              observaciones: `Estado cambiado a: ${validatedData.estado}${validatedData.observaciones ? `. ${validatedData.observaciones}` : ""}`,
            },
          })

          // Auto-cambio estado del equipo
          await actualizarEstadoEquipo(tx, existingMantenimiento.equipoId, validatedData.estado)
        }

        return mantenimiento
      })

      return NextResponse.json(result)
    }

    // ADMIN y CLIENTE: edición completa
    const validatedData = updateMantenimientoSchema.parse(body)

    // El equipo se fija al crear el mantenimiento. Se comprueba antes de abrir
    // la transacción para que un rechazo no deje nada a medias.
    const decision = decidirCambioDeEquipo(
      validatedData.equipoId,
      existingMantenimiento.equipoId
    )

    if (!decision.permitida) {
      return NextResponse.json({ error: decision.motivo }, { status: 400 })
    }

    // Preparar datos para actualizar
    const updateData: Prisma.MantenimientoUncheckedUpdateInput = {}

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

    // Reasignación de técnico: se persiste solo si realmente cambia
    const tecnicoSolicitado = validatedData.tecnicoId?.trim() || null
    const reasigna =
      tecnicoSolicitado !== null && tecnicoSolicitado !== existingMantenimiento.tecnicoId

    if (reasigna) {
      updateData.tecnicoId = tecnicoSolicitado
    }

    // Actualizar en transacción con historial
    const result = await prisma.$transaction(async (tx) => {
      let tecnicoAnterior: { nombre: string } | null = null
      let tecnicoNuevo: { nombre: string } | null = null

      if (reasigna) {
        await validarTecnicoAsignable(
          tx,
          tecnicoSolicitado,
          existingMantenimiento.equipo.empresaId
        )

        ;[tecnicoAnterior, tecnicoNuevo] = await Promise.all([
          tx.user.findUnique({
            where: { id: existingMantenimiento.tecnicoId },
            select: { nombre: true },
          }),
          tx.user.findUnique({
            where: { id: tecnicoSolicitado },
            select: { nombre: true },
          }),
        ])
      }

      const mantenimiento = await tx.mantenimiento.update({
        where: { id },
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
            mantenimientoId: id,
            tecnicoId: session.user.id,
            observaciones: `Estado cambiado a: ${validatedData.estado}${validatedData.observaciones ? `. ${validatedData.observaciones}` : ""}`,
          },
        })

        // Auto-cambio estado del equipo
        await actualizarEstadoEquipo(tx, existingMantenimiento.equipoId, validatedData.estado)
      }

      // Dejar constancia de quién sustituye a quién en la reasignación
      if (reasigna) {
        await tx.historial.create({
          data: {
            equipoId: existingMantenimiento.equipoId,
            mantenimientoId: id,
            tecnicoId: session.user.id,
            observaciones: `Técnico reasignado: de ${tecnicoAnterior?.nombre ?? "sin asignar"} a ${tecnicoNuevo?.nombre ?? "sin asignar"}`,
          },
        })
      }

      return mantenimiento
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AsignacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    // Verificar que el mantenimiento existe
    const mantenimiento = await prisma.mantenimiento.findUnique({
      where: { id },
    })

    if (!mantenimiento) {
      return NextResponse.json(
        { error: "Mantenimiento no encontrado" },
        { status: 404 }
      )
    }

    // Eliminar (el historial se eliminará en cascada o se mantendrá según el schema)
    await prisma.mantenimiento.delete({
      where: { id },
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
