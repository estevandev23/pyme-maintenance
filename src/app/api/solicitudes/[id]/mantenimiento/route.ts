import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { crearMantenimientoDeSolicitud } from "@/lib/crear-mantenimiento.server"
import {
  ESTADOS_QUE_ADMITEN_CREACION,
  MOTIVO_ESTADO_NO_ADMITE,
  MOTIVO_YA_TIENE_MANTENIMIENTO,
} from "@/lib/creacion-manual"
import { avisarSolicitudAtendida } from "@/lib/avisar-solicitud.server"

/**
 * POST /api/solicitudes/[id]/mantenimiento
 *
 * Crea el mantenimiento de una solicitud que se quedó sin él. Cubre las
 * solicitudes anteriores al cambio y las que vuelven a quedar pendientes porque
 * se eliminó su mantenimiento.
 */
export async function POST(
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
      select: {
        id: true,
        estado: true,
        descripcion: true,
        equipoId: true,
        equipo: {
          select: {
            id: true,
            empresaId: true,
            tipo: true,
            marca: true,
            modelo: true,
            serial: true,
          },
        },
        cliente: { select: { nombre: true, email: true } },
        mantenimiento: { select: { id: true } },
      },
    })

    if (!solicitud) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    if (solicitud.mantenimiento) {
      return NextResponse.json(
        { error: MOTIVO_YA_TIENE_MANTENIMIENTO },
        { status: 409 }
      )
    }

    if (
      !(ESTADOS_QUE_ADMITEN_CREACION as readonly string[]).includes(solicitud.estado)
    ) {
      return NextResponse.json({ error: MOTIVO_ESTADO_NO_ADMITE }, { status: 409 })
    }

    const mantenimiento = await prisma.$transaction(async (tx) => {
      const creado = await crearMantenimientoDeSolicitud(tx, {
        solicitudId: solicitud.id,
        equipoId: solicitud.equipo.id,
        empresaId: solicitud.equipo.empresaId,
        descripcion: solicitud.descripcion,
        actorId: session.user.id,
      })

      // La transición de la solicitud es del llamador y no de la función
      // compartida: en la vía automática la solicitud nace ya aprobada en la
      // misma inserción, y aquí hay que actualizar una fila que ya existe.
      await tx.solicitudServicio.update({
        where: { id: solicitud.id },
        data: { estado: "APROBADA" },
      })

      return creado
    })

    // Desde el cliente el hecho es el mismo que en la vía automática —su
    // solicitud ya tiene mantenimiento— así que recibe el mismo aviso y no
    // tiene por qué enterarse de qué camino lo creó. Fuera de la transacción y
    // sin poder tumbarla.
    await avisarSolicitudAtendida({
      clienteNombre: solicitud.cliente.nombre,
      clienteEmail: solicitud.cliente.email,
      descripcion: solicitud.descripcion,
      equipo: {
        tipo: solicitud.equipo.tipo,
        marca: solicitud.equipo.marca,
        modelo: solicitud.equipo.modelo,
        serial: solicitud.equipo.serial,
      },
      fechaProgramada: mantenimiento.fechaProgramada,
      tecnicoNombre: mantenimiento.tecnicoNombre,
    })

    return NextResponse.json(
      {
        mantenimiento: {
          id: mantenimiento.id,
          tecnicoId: mantenimiento.tecnicoId,
          tecnicoNombre: mantenimiento.tecnicoNombre,
          fechaProgramada: mantenimiento.fechaProgramada,
        },
        avisoSinTecnico: mantenimiento.tecnicoId
          ? null
          : "El mantenimiento se creó sin técnico asignado: la empresa del equipo no tiene ninguno activo.",
      },
      { status: 201 }
    )
  } catch (error) {
    // Dos peticiones simultáneas pueden superar ambas la comprobación previa y
    // chocar contra la restricción de unicidad del enlace. La integridad queda
    // a salvo, pero la respuesta no debe ser un error interno sobre una
    // operación que sí se completó: se traduce al mismo mensaje explicable.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: MOTIVO_YA_TIENE_MANTENIMIENTO },
        { status: 409 }
      )
    }

    console.error("Error al crear el mantenimiento de la solicitud:", error)
    return NextResponse.json(
      { error: "Error al crear el mantenimiento de la solicitud" },
      { status: 500 }
    )
  }
}
