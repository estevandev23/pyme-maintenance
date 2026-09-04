import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  camposConProblema,
  esErrorDeValidacion,
  mensajeDeValidacion,
} from "@/lib/respuesta-validacion"
import { decidirCambioDeEquipo } from "@/lib/edicion-mantenimiento"
import { sincronizarEstadoEquipo } from "@/lib/estado-equipo.server"
import { puedeVerMantenimiento } from "@/lib/alcance-mantenimiento"
import { eliminarReporte } from "@/lib/reportes.server"
import { cancelarMantenimiento } from "@/lib/cancelar.server"
import type { AutorCancelacionConocido } from "@/lib/cancelacion-solicitud"
import { MOTIVO_CANCELACION_REQUERIDO } from "@/lib/validations/mantenimiento"
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

    // La misma regla que aplica la descarga del reporte. Si cada una tuviera
    // su copia, acabarían diciendo cosas distintas sin que se viera en pantalla.
    if (
      !puedeVerMantenimiento(session.user, {
        tecnicoId: mantenimiento.tecnicoId,
        empresaId: mantenimiento.equipo.empresa.id,
      })
    ) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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

/**
 * Ejecuta una cancelación y devuelve la respuesta.
 *
 * Comparte camino entre el técnico y el administrador para que las dos —y la
 * del cliente, que va por la ruta de solicitudes— dejen el sistema igual.
 */
async function responderCancelacion(datos: {
  existente: { id: string; equipoId: string; solicitudId: string | null }
  motivo: string
  autorId: string
  autorRol: AutorCancelacionConocido
}) {
  const motivo = datos.motivo.trim()

  if (!motivo) {
    return NextResponse.json(
      { error: MOTIVO_CANCELACION_REQUERIDO, campos: ["motivoCancelacion"] },
      { status: 400 }
    )
  }

  await prisma.$transaction(async (tx) => {
    await cancelarMantenimiento(tx, {
      mantenimientoId: datos.existente.id,
      equipoId: datos.existente.equipoId,
      solicitudId: datos.existente.solicitudId,
      motivo,
      autorId: datos.autorId,
      autorRol: datos.autorRol,
    })
  })

  const mantenimiento = await prisma.mantenimiento.findUniqueOrThrow({
    where: { id: datos.existente.id },
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
      tecnico: { select: { id: true, nombre: true, email: true } },
    },
  })

  return NextResponse.json(mantenimiento)
}

// El estado del equipo se recalcula con `sincronizarEstadoEquipo`, en
// `@/lib/estado-equipo.server`. Antes había aquí una función que decidía según
// la transición que se estuviera haciendo; ahora la regla se expresa como
// invariante —el equipo está en mantenimiento si y solo si tiene trabajo
// abierto con técnico—, que es idempotente y no depende de por dónde se llegue.

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

      // La cancelación va por su propio camino: además de mover el estado
      // guarda motivo y autor, propaga a la solicitud de origen y deja su
      // asiento. Hacerlo aquí y no en el `update` de abajo evita que las tres
      // entradas de cancelación —cliente, técnico y administrador— acaben
      // dejando el sistema en estados distintos.
      if (
        validatedData.estado === "CANCELADO" &&
        existingMantenimiento.estado !== "CANCELADO"
      ) {
        return responderCancelacion({
          existente: existingMantenimiento,
          motivo: validatedData.motivoCancelacion ?? "",
          autorId: session.user.id,
          autorRol: "TECNICO",
        })
      }

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

        }

        // Fuera del `if`: el estado del equipo se recalcula siempre, porque
        // depende de todo el trabajo abierto del equipo y no solo de si este
        // mantenimiento cambió de estado.
        await sincronizarEstadoEquipo(tx, existingMantenimiento.equipoId)

        return mantenimiento
      })

      return NextResponse.json(result)
    }

    // A partir de aquí, edición completa: solo el ADMIN.
    //
    // Esta rama atendía antes a ADMIN y CLIENTE por igual, sin comprobar ni la
    // propiedad ni la empresa, así que un cliente podía cambiar el estado, las
    // fechas, la descripción y el técnico de cualquier mantenimiento del
    // sistema con solo conocer su identificador. La interfaz no se lo ofrecía,
    // pero la API sí.
    //
    // El cliente conserva su vía acotada: cancelar su propia solicitud, que va
    // por la ruta de solicitudes y sí comprueba la propiedad.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const validatedData = updateMantenimientoSchema.parse(body)

    // Igual que en la rama del técnico: cancelar es una operación propia.
    if (
      validatedData.estado === "CANCELADO" &&
      existingMantenimiento.estado !== "CANCELADO"
    ) {
      return responderCancelacion({
        existente: existingMantenimiento,
        motivo: validatedData.motivoCancelacion ?? "",
        autorId: session.user.id,
        autorRol: "ADMIN",
      })
    }

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
    // `reporteUrl` ya no se edita por aquí: lo escribe la ruta del reporte al
    // adjuntar o quitar el archivo, que es la única que sabe si existe en disco.

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

    // Cambio de técnico. Hay tres intenciones distintas y el campo ausente no
    // significa lo mismo que el campo vacío:
    //
    //   - ausente        -> la actualización no habla del técnico, no se toca.
    //   - vacío (null,"")-> retirarlo: el mantenimiento queda sin técnico.
    //   - con valor      -> asignar a ese técnico.
    //
    // La distinción importa porque al crear, el campo ausente sí significa algo
    // —«decide tú», el reparto automático—, y con el técnico ya opcional las dos
    // lecturas serían indistinguibles si se colapsaran aquí.
    const hablaDelTecnico = validatedData.tecnicoId !== undefined
    const tecnicoSolicitado = hablaDelTecnico
      ? validatedData.tecnicoId?.trim() || null
      : undefined

    const asignaTecnico =
      hablaDelTecnico &&
      tecnicoSolicitado != null &&
      tecnicoSolicitado !== existingMantenimiento.tecnicoId

    const retiraTecnico =
      hablaDelTecnico &&
      tecnicoSolicitado === null &&
      existingMantenimiento.tecnicoId !== null

    const cambiaTecnico = asignaTecnico || retiraTecnico

    if (cambiaTecnico) {
      updateData.tecnicoId = asignaTecnico ? tecnicoSolicitado : null
    }

    // Actualizar en transacción con historial
    const result = await prisma.$transaction(async (tx) => {
      let tecnicoAnterior: { nombre: string } | null = null
      let tecnicoNuevo: { nombre: string } | null = null

      if (cambiaTecnico) {
        if (asignaTecnico) {
          await validarTecnicoAsignable(
            tx,
            tecnicoSolicitado,
            existingMantenimiento.equipo.empresaId
          )
        }

        // Cada extremo se consulta solo si existe. Antes se preguntaba siempre
        // por el técnico anterior, y con la columna ya opcional esa consulta
        // recibía un identificador nulo: no compilaba, y forzada reventaba la
        // transacción entera justo en el caso nuevo, el de asignar técnico a un
        // mantenimiento que no lo tenía.
        ;[tecnicoAnterior, tecnicoNuevo] = await Promise.all([
          existingMantenimiento.tecnicoId
            ? tx.user.findUnique({
                where: { id: existingMantenimiento.tecnicoId },
                select: { nombre: true },
              })
            : Promise.resolve(null),
          asignaTecnico
            ? tx.user.findUnique({
                where: { id: tecnicoSolicitado },
                select: { nombre: true },
              })
            : Promise.resolve(null),
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
      }

      // Dejar constancia de quién sustituye a quién. Cubre los tres casos:
      // sustitución, primera asignación —sin técnico anterior— y retirada —sin
      // técnico nuevo—; los `?? "sin asignar"` los distinguen.
      if (cambiaTecnico) {
        await tx.historial.create({
          data: {
            equipoId: existingMantenimiento.equipoId,
            mantenimientoId: id,
            tecnicoId: session.user.id,
            observaciones: `Técnico reasignado: de ${tecnicoAnterior?.nombre ?? "sin asignar"} a ${tecnicoNuevo?.nombre ?? "sin asignar"}`,
          },
        })
      }

      // El estado del equipo depende de si le queda trabajo abierto con
      // técnico, así que hay que recalcularlo tanto cuando cambia el estado del
      // mantenimiento como cuando cambia su técnico. Antes solo se hacía en el
      // primer caso, y asignarle técnico a un mantenimiento huérfano dejaba el
      // equipo activo indefinidamente.
      await sincronizarEstadoEquipo(tx, existingMantenimiento.equipoId)

      return mantenimiento
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AsignacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (esErrorDeValidacion(error)) {
      // El mensaje concreto en lugar del genérico: con el motivo de cancelación
      // obligatorio, "Datos inválidos" no le dice al usuario qué le falta.
      return NextResponse.json(
        {
          error: mensajeDeValidacion(error),
          campos: camposConProblema(error),
        },
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
      select: { id: true, equipoId: true, solicitudId: true },
    })

    if (!mantenimiento) {
      return NextResponse.json(
        { error: "Mantenimiento no encontrado" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // El historial conserva las entradas con `mantenimientoId` a nulo: el
      // rastro de lo ocurrido sobre el equipo no se pierde al borrar el
      // mantenimiento.
      await tx.mantenimiento.delete({ where: { id } })

      // La solicitud vuelve a pendiente para que quede claro que espera trabajo
      // y para que el administrador pueda crearle uno nuevo. Sin esto quedaría
      // aprobada y sin enlace: indistinguible de las anteriores al cambio, y
      // sin salida.
      if (mantenimiento.solicitudId) {
        await tx.solicitudServicio.update({
          where: { id: mantenimiento.solicitudId },
          data: { estado: "PENDIENTE" },
        })
      }

      // El equipo puede quedarse sin trabajo abierto: hay que recalcularlo o se
      // queda atascado en mantenimiento indefinidamente.
      await sincronizarEstadoEquipo(tx, mantenimiento.equipoId)
    })

    // El reporte no sobrevive a su mantenimiento. Va después de la transacción
    // y no dentro: el disco no participa en ella, y un archivo huérfano es
    // preferible a un registro que apunte a un archivo ya borrado.
    try {
      await eliminarReporte(id)
    } catch (error) {
      console.error(`No se pudo eliminar el reporte del mantenimiento ${id}:`, error)
    }

    return NextResponse.json({ message: "Mantenimiento eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar mantenimiento:", error)
    return NextResponse.json(
      { error: "Error al eliminar mantenimiento" },
      { status: 500 }
    )
  }
}
