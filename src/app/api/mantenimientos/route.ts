import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { mantenimientoSchema } from "@/lib/validations/mantenimiento"

// GET /api/mantenimientos - Listar todos los mantenimientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado")
    const tipo = searchParams.get("tipo")
    const tecnicoId = searchParams.get("tecnicoId")
    const equipoId = searchParams.get("equipoId")
    const empresaId = searchParams.get("empresaId")
    const search = searchParams.get("search")

    const andFilters: any[] = []

    if (estado) andFilters.push({ estado })
    if (tipo) andFilters.push({ tipo })
    if (tecnicoId) andFilters.push({ tecnicoId })
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

    const mantenimientos = await prisma.mantenimiento.findMany({
      where,
      orderBy: { fechaProgramada: "desc" },
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
        tecnico: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
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

    // Solo admin y cliente pueden crear mantenimientos
    if (session.user.role === "TECNICO") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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

    // Si es cliente, verificar que el equipo sea de su empresa
    if (session.user.role === "CLIENTE" && session.user.empresaId) {
      if (equipo.empresaId !== session.user.empresaId) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }

    // Verificar que el técnico existe y es técnico
    const tecnico = await prisma.user.findUnique({
      where: { id: validatedData.tecnicoId },
    })

    if (!tecnico || tecnico.role !== "TECNICO") {
      return NextResponse.json(
        { error: "Técnico no válido" },
        { status: 400 }
      )
    }

    // Crear mantenimiento y entrada en historial en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear mantenimiento
      const mantenimiento = await tx.mantenimiento.create({
        data: {
          equipoId: validatedData.equipoId,
          tecnicoId: validatedData.tecnicoId,
          tipo: validatedData.tipo,
          estado: validatedData.estado,
          fechaProgramada,
          fechaRealizada,
          descripcion: validatedData.descripcion,
          observaciones: validatedData.observaciones,
          reporteUrl: validatedData.reporteUrl || null,
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

      // Crear entrada en historial
      await tx.historial.create({
        data: {
          equipoId: validatedData.equipoId,
          mantenimientoId: mantenimiento.id,
          tecnicoId: validatedData.tecnicoId,
          observaciones: `Mantenimiento ${validatedData.tipo.toLowerCase()} programado: ${validatedData.descripcion}`,
        },
      })

      return mantenimiento
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
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
