import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  camposConProblema,
  esErrorDeValidacion,
  mensajeDeValidacion,
} from "@/lib/respuesta-validacion"
import { Prisma, type EstadoSolicitud, type PrioridadSolicitud } from "@prisma/client"
import { solicitudSchema } from "@/lib/validations/solicitud"
import { crearMantenimientoDeSolicitud } from "@/lib/crear-mantenimiento.server"
import { avisarSolicitudAtendida } from "@/lib/avisar-solicitud.server"

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

    const where: Prisma.SolicitudServicioWhereInput = {}

    // CLIENTE solo ve sus propias solicitudes
    if (session.user.role === "CLIENTE") {
      where.clienteId = session.user.id
    }

    if (estado && estado !== "all") {
      where.estado = estado as EstadoSolicitud
    }

    if (prioridad && prioridad !== "all") {
      where.prioridad = prioridad as PrioridadSolicitud
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
      // El mantenimiento enlazado: la interfaz lo necesita para saber si ofrece
      // cancelar, si ofrece crear, y para mostrar el motivo con su autor.
      mantenimiento: {
        select: {
          id: true,
          estado: true,
          fechaProgramada: true,
          tecnico: { select: { id: true, nombre: true } },
        },
      },
      canceladaPor: { select: { id: true, nombre: true } },
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

    // Verificar que el equipo pertenece a la empresa del cliente.
    //
    // La comprobación anterior era `if (session.user.empresaId && ...)`: un
    // cliente sin empresa asignada la esquivaba entera y podía solicitar sobre
    // cualquier equipo del sistema. Mientras la solicitud era solo una fila de
    // texto el daño se limitaba a que el administrador la descartara; ahora
    // crea un mantenimiento real y dispara el reparto entre los técnicos de una
    // empresa ajena.
    if (!session.user.empresaId) {
      return NextResponse.json(
        {
          error:
            "Su usuario no tiene empresa asignada. Contacte al administrador para poder registrar solicitudes.",
        },
        { status: 403 }
      )
    }

    if (equipo.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: "No tiene permisos sobre este equipo" },
        { status: 403 }
      )
    }

    // La solicitud y su mantenimiento se crean juntos, en una transacción: no
    // debe existir el estado intermedio en el que hay solicitud sin trabajo.
    // Nace ya aprobada porque nadie tiene que aprobarla.
    const { solicitud, mantenimiento } = await prisma.$transaction(async (tx) => {
      const solicitudCreada = await tx.solicitudServicio.create({
        data: {
          equipoId: validatedData.equipoId,
          clienteId: session.user.id,
          descripcion: validatedData.descripcion,
          prioridad: validatedData.prioridad,
          estado: "APROBADA",
        },
        select: { id: true },
      })

      const mantenimientoCreado = await crearMantenimientoDeSolicitud(tx, {
        solicitudId: solicitudCreada.id,
        equipoId: equipo.id,
        empresaId: equipo.empresaId,
        descripcion: validatedData.descripcion,
        actorId: session.user.id,
      })

      return { solicitud: solicitudCreada, mantenimiento: mantenimientoCreado }
    })

    const solicitudCompleta = await prisma.solicitudServicio.findUniqueOrThrow({
      where: { id: solicitud.id },
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

    // El aviso va DESPUÉS de confirmar la transacción y no puede tumbar nada:
    // lo importante ya está guardado.
    await avisarSolicitudAtendida({
      clienteNombre: solicitudCompleta.cliente.nombre,
      clienteEmail: solicitudCompleta.cliente.email,
      descripcion: solicitudCompleta.descripcion,
      equipo: {
        tipo: solicitudCompleta.equipo.tipo,
        marca: solicitudCompleta.equipo.marca,
        modelo: solicitudCompleta.equipo.modelo,
        serial: solicitudCompleta.equipo.serial,
      },
      fechaProgramada: mantenimiento.fechaProgramada,
      tecnicoNombre: mantenimiento.tecnicoNombre,
    })

    return NextResponse.json(
      {
        ...solicitudCompleta,
        mantenimiento: {
          id: mantenimiento.id,
          tecnicoId: mantenimiento.tecnicoId,
          tecnicoNombre: mantenimiento.tecnicoNombre,
          fechaProgramada: mantenimiento.fechaProgramada,
        },
        // El cliente tiene que enterarse en el momento de que su solicitud ya
        // tiene trabajo asociado, y de si hay alguien detrás.
        avisoSinTecnico: mantenimiento.tecnicoId
          ? null
          : "Su solicitud quedó registrada, pero todavía no hay un técnico disponible en su empresa. El administrador asignará uno.",
      },
      { status: 201 }
    )
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

    console.error("Error al crear solicitud:", error)
    return NextResponse.json(
      { error: "Error al crear solicitud" },
      { status: 500 }
    )
  }
}
