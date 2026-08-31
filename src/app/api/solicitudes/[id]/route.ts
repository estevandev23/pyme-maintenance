import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  camposConProblema,
  esErrorDeValidacion,
  mensajeDeValidacion,
} from "@/lib/respuesta-validacion"
import { updateSolicitudSchema } from "@/lib/validations/solicitud"
import { Prisma } from "@prisma/client"
import { cancelarMantenimiento } from "@/lib/cancelar.server"
import {
  decidirCancelacionCliente,
  type EstadoMantenimientoConocido,
} from "@/lib/cancelacion-solicitud"
import { MOTIVO_CANCELACION_REQUERIDO } from "@/lib/validations/mantenimiento"

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
      // El mantenimiento enlazado hace falta para decidir si el cliente todavía
      // puede cancelar: la puerta es su estado, no el de la solicitud.
      include: { mantenimiento: { select: { id: true, estado: true } } },
    })

    if (!existingSolicitud) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    // ADMIN: puede dejar una respuesta, pero ya no mueve el estado a mano.
    //
    // Las transiciones que provocaba —aprobar, rechazar, marcar en revisión—
    // desaparecen con el flujo de aprobación. Dejarlas abiertas permitiría poner
    // en RECHAZADA una solicitud cuyo mantenimiento está en curso con un técnico
    // trabajando, sin que nada propague nada en ninguna dirección. El estado lo
    // decide ahora lo que le ocurra al mantenimiento: se aprueba al crearlo, se
    // cancela al cancelarlo y vuelve a pendiente al eliminarlo.
    if (session.user.role === "ADMIN") {
      const solicitud = await prisma.solicitudServicio.update({
        where: { id },
        data: { respuesta: validatedData.respuesta },
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

    // CLIENTE: solo puede cancelar su propia solicitud, y solo mientras el
    // técnico no haya empezado.
    //
    // La puerta es el estado del MANTENIMIENTO, no el de la solicitud. Antes se
    // exigía que la solicitud estuviera PENDIENTE, y con la creación automática
    // ninguna llega a estarlo: esa condición se habría vuelto inalcanzable y el
    // cliente se habría quedado sin poder cancelar nada.
    if (session.user.role === "CLIENTE") {
      if (existingSolicitud.clienteId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }

      const decision = decidirCancelacionCliente(
        existingSolicitud.mantenimiento?.estado as EstadoMantenimientoConocido | null
      )

      if (!decision.permitida) {
        return NextResponse.json({ error: decision.motivo }, { status: 409 })
      }

      const motivo = validatedData.motivoCancelacion?.trim()

      if (!motivo) {
        return NextResponse.json(
          { error: MOTIVO_CANCELACION_REQUERIDO, campos: ["motivoCancelacion"] },
          { status: 400 }
        )
      }

      await prisma.$transaction(async (tx) => {
        await cancelarMantenimiento(tx, {
          mantenimientoId: existingSolicitud.mantenimiento!.id,
          equipoId: existingSolicitud.equipoId,
          solicitudId: existingSolicitud.id,
          motivo,
          autorId: session.user.id,
          autorRol: "CLIENTE",
        })
      })

      const solicitud = await prisma.solicitudServicio.findUniqueOrThrow({
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

      return NextResponse.json(solicitud)
    }

    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  } catch (error) {
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
      select: { id: true, mantenimiento: { select: { id: true } } },
    })

    if (!solicitud) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    // La clave foránea del enlace ya impide este borrado, pero lo haría con un
    // error de base de datos que acabaría en un 500 genérico. Se comprueba antes
    // para poder explicar el motivo, como hacen los borrados de equipos y
    // usuarios.
    if (solicitud.mantenimiento) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la solicitud porque tiene un mantenimiento registrado. Elimine primero el mantenimiento.",
          details: { mantenimientoId: solicitud.mantenimiento.id },
        },
        { status: 409 }
      )
    }

    await prisma.solicitudServicio.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Solicitud eliminada exitosamente" })
  } catch (error) {
    // Red de seguridad por si dos peticiones simultáneas superan la
    // comprobación anterior: la restricción salta y se traduce al mismo mensaje.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la solicitud porque tiene un mantenimiento registrado. Elimine primero el mantenimiento.",
        },
        { status: 409 }
      )
    }

    console.error("Error al eliminar solicitud:", error)
    return NextResponse.json(
      { error: "Error al eliminar solicitud" },
      { status: 500 }
    )
  }
}
