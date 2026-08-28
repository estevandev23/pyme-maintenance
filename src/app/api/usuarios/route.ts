import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validations/user"
import { obtenerCargaPorTecnico } from "@/lib/asignacion-tecnicos.server"
import bcrypt from "bcryptjs"

// GET /api/usuarios - Listar todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const empresaId = searchParams.get("empresaId")

    // Si solo pide técnicos, permitir a todos los usuarios autenticados
    // (útil para mostrar asignaciones en formularios)
    if (role === "TECNICO") {
      // Los técnicos dados de baja no pueden recibir asignaciones, así que
      // tampoco se ofrecen como candidatos.
      const where: any = { role: "TECNICO", activo: true }

      if (empresaId) {
        where.empresaId = empresaId
      }

      const tecnicos = await prisma.user.findMany({
        where,
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          email: true,
          nombre: true,
          role: true,
          empresaId: true,
        },
      })

      // Carga abierta de cada técnico, para que la elección manual del
      // administrador sea informada.
      const carga = await obtenerCargaPorTecnico(
        prisma,
        tecnicos.map((tecnico) => tecnico.id)
      )

      return NextResponse.json(
        tecnicos.map((tecnico) => ({
          ...tecnico,
          cargaAbierta: carga.get(tecnico.id)?.cargaAbierta ?? 0,
        }))
      )
    }

    // Para otras consultas, solo admin puede ver usuarios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")

    const where: any = {}

    if (role) {
      where.role = role
    }

    if (empresaId) {
      where.empresaId = empresaId
    }

    const select = {
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
      _count: {
        select: {
          mantenimientos: true,
          historial: true,
        },
      },
    }

    // Si se solicita paginación
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10") || 10))
      const skip = (page - 1) * limit

      const [usuarios, total] = await Promise.all([
        prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, select, skip, take: limit }),
        prisma.user.count({ where }),
      ])

      return NextResponse.json({
        data: usuarios,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    const usuarios = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select,
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    )
  }
}

// POST /api/usuarios - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede crear usuarios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Verificar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 400 }
      )
    }

    // Si es CLIENTE, debe tener empresa
    if (validatedData.role === "CLIENTE" && !validatedData.empresaId) {
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

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Crear usuario
    const usuario = await prisma.user.create({
      data: {
        email: validatedData.email,
        nombre: validatedData.nombre,
        password: hashedPassword,
        role: validatedData.role,
        empresaId: validatedData.empresaId,
        activo: validatedData.activo,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        role: true,
        empresaId: true,
        activo: true,
        createdAt: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        ...usuario,
        temporaryPassword: validatedData.password, // Devolver la contraseña temporal solo al crearla
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      )
    }

    console.error("Error al crear usuario:", error)
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
