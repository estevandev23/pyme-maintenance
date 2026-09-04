import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  camposConProblema,
  esErrorDeValidacion,
  mensajeDeValidacion,
} from "@/lib/respuesta-validacion"
import { Prisma, type EstadoMantenimiento, type TipoMantenimiento } from "@prisma/client"
import { mantenimientoSchema } from "@/lib/validations/mantenimiento"
import {
  AsignacionError,
  intentarAsignarTecnico,
  validarTecnicoAsignable,
} from "@/lib/asignacion-tecnicos.server"
import { sincronizarEstadoEquipo } from "@/lib/estado-equipo.server"
import { SIN_ASIGNAR } from "@/lib/tecnico-asignado"

// GET /api/mantenimientos - Listar todos los mantenimientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const estado = searchParams.get("estado")
    const tipo = searchParams.get("tipo")
    const tecnicoId = searchParams.get("tecnicoId")
    const equipoId = searchParams.get("equipoId")
    const empresaId = searchParams.get("empresaId")
    const search = searchParams.get("search")
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")

    const andFilters: Prisma.MantenimientoWhereInput[] = []

    // Filtro por ID específico (desde alertas)
    if (id) andFilters.push({ id })
    if (estado) andFilters.push({ estado: estado as EstadoMantenimiento })
    if (tipo) andFilters.push({ tipo: tipo as TipoMantenimiento })
    // `sin-asignar` es un valor propio, no un identificador: es la única forma
    // de pedir los mantenimientos que esperan técnico, porque el parámetro
    // siempre llega como cadena y `?tecnicoId=null` filtraría por el texto
    // literal «null» y devolvería cero filas sin error.
    if (tecnicoId === SIN_ASIGNAR) {
      andFilters.push({ tecnicoId: null })
    } else if (tecnicoId) {
      andFilters.push({ tecnicoId })
    }
    if (equipoId) andFilters.push({ equipoId })

    // Búsqueda multi-término
    if (search) {
      const searchTerms = search.split(/\s+/).filter(term => term.length > 0)
      searchTerms.forEach(term => {
        andFilters.push({
          OR: [
            {
              equipo: {
                OR: [
                  { tipo: { contains: term, mode: 'insensitive' } },
                  { marca: { contains: term, mode: 'insensitive' } },
                  { serial: { contains: term, mode: 'insensitive' } },
                  { modelo: { contains: term, mode: 'insensitive' } },
                ]
              }
            },
            { descripcion: { contains: term, mode: 'insensitive' } }
          ]
        })
      })
    }

    // Role filters y filtros por empresa
    if (session.user.role === "TECNICO") {
      andFilters.push({ tecnicoId: session.user.id })
    }

    if (session.user.role === "CLIENTE" && session.user.empresaId) {
      andFilters.push({ equipo: { empresaId: session.user.empresaId } })
    } else if (empresaId && empresaId !== "all" && session.user.role === "ADMIN") {
      andFilters.push({ equipo: { empresaId: empresaId } })
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {}

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
      tecnico: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      // La solicitud de origen viaja en el listado y no solo en la consulta por
      // identificador: el diálogo de detalle se pinta con el objeto que ya está
      // en la tabla, así que sin esto no la vería.
      solicitud: {
        select: { id: true, prioridad: true, createdAt: true },
      },
    }

    // Si se solicita paginación
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10") || 10))
      const skip = (page - 1) * limit

      const [mantenimientos, total] = await Promise.all([
        prisma.mantenimiento.findMany({
          where,
          orderBy: { fechaProgramada: "desc" },
          include,
          skip,
          take: limit,
        }),
        prisma.mantenimiento.count({ where }),
      ])

      return NextResponse.json({
        data: mantenimientos,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    // Sin paginación (compatibilidad con dropdowns y otros usos)
    const mantenimientos = await prisma.mantenimiento.findMany({
      where,
      orderBy: { fechaProgramada: "desc" },
      include,
    })

    return NextResponse.json(mantenimientos)
  } catch (error) {
    console.error("Error al obtener mantenimientos:", error)
    return NextResponse.json(
      { error: "Error al obtener mantenimientos" },
      { status: 500 }
    )
  }
}

// POST /api/mantenimientos - Crear nuevo mantenimiento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede crear mantenimientos
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos. Los clientes deben usar solicitudes de servicio." }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = mantenimientoSchema.parse(body)

    // Convertir fechas a Date
    const fechaProgramada = new Date(validatedData.fechaProgramada)
    const fechaRealizada = validatedData.fechaRealizada
      ? new Date(validatedData.fechaRealizada)
      : null

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

    // El técnico es opcional: si no llega, lo decide el reparto automático
    const tecnicoSolicitado = validatedData.tecnicoId?.trim() || null

    // Crear mantenimiento y entrada en historial en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Resolver el técnico responsable justo antes de crear el registro:
      // la elección manual manda, y si no la hay se reparte por carga.
      //
      // Si la empresa del equipo no tiene ningún candidato, el mantenimiento se
      // crea igualmente sin técnico y queda a la espera. Antes esto abortaba
      // con un error: el trabajo existe aunque todavía no haya a quién
      // asignárselo, y negarse a registrarlo solo lo dejaba fuera del sistema.
      let tecnicoId: string | null

      if (tecnicoSolicitado) {
        await validarTecnicoAsignable(tx, tecnicoSolicitado, equipo.empresaId)
        tecnicoId = tecnicoSolicitado
      } else {
        const elegido = await intentarAsignarTecnico(tx, equipo.empresaId)
        tecnicoId = elegido?.id ?? null
      }

      // Crear mantenimiento
      const mantenimiento = await tx.mantenimiento.create({
        data: {
          equipoId: validatedData.equipoId,
          tecnicoId,
          tipo: validatedData.tipo,
          estado: validatedData.estado,
          fechaProgramada,
          fechaRealizada,
          descripcion: validatedData.descripcion,
          observaciones: validatedData.observaciones,
        },
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

      // Crear entrada en historial.
      //
      // Se firma con quien provoca el asiento, no con el técnico asignado: el
      // técnico puede no existir, y aunque exista, quien creó el mantenimiento
      // fue el usuario de la sesión. `Historial.tecnicoId` es obligatorio, así
      // que sin este cambio la creación sin técnico no sería posible.
      await tx.historial.create({
        data: {
          equipoId: validatedData.equipoId,
          mantenimientoId: mantenimiento.id,
          tecnicoId: session.user.id,
          observaciones: `Mantenimiento ${validatedData.tipo.toLowerCase()} programado: ${validatedData.descripcion}`,
        },
      })

      // El equipo entra en mantenimiento solo si el trabajo tiene técnico. Lo
      // decide el invariante, no esta ruta.
      await sincronizarEstadoEquipo(tx, validatedData.equipoId)

      return mantenimiento
    })

    return NextResponse.json(
      {
        ...result,
        // Señal inmediata para el administrador: el mantenimiento se creó, pero
        // nadie lo va a atender hasta que se le asigne alguien. La pantalla de
        // avisos lo recuerda después; esto lo dice en el momento.
        avisoSinTecnico: result.tecnicoId
          ? null
          : "El mantenimiento se creó sin técnico asignado: la empresa del equipo no tiene ninguno activo. Asígnele uno para que alguien lo atienda.",
      },
      { status: 201 }
    )
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

    console.error("Error al crear mantenimiento:", error)
    return NextResponse.json(
      { error: "Error al crear mantenimiento" },
      { status: 500 }
    )
  }
}
