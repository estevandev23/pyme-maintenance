import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ID_CONFIGURACION,
  DIAS_PROGRAMACION_MAXIMO,
  DIAS_PROGRAMACION_MINIMO,
  obtenerConfiguracion,
} from "@/lib/configuracion.server"
import { configuracionSchema } from "@/lib/validations/configuracion"
import {
  camposConProblema,
  esErrorDeValidacion,
  mensajeDeValidacion,
} from "@/lib/respuesta-validacion"

/**
 * La configuración es exclusiva del administrador, tanto para consultarla como
 * para cambiarla.
 *
 * Se comprueba en cada verbo y no en el middleware, que en este proyecto no
 * filtra por rol: solo distingue autenticado de no autenticado. Olvidarlo aquí
 * dejaría a un cliente fijando los días con que se programan sus propios
 * mantenimientos.
 */
function negarSiNoEsAdmin(session: { user?: { role?: string } } | null) {
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  return null
}

// GET /api/configuracion - Consultar los parámetros de operación
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const negativa = negarSiNoEsAdmin(session)
    if (negativa) return negativa

    const configuracion = await obtenerConfiguracion()

    return NextResponse.json({
      ...configuracion,
      // El rango viaja con el valor para que la pantalla no tenga que repetirlo
      // y no puedan divergir.
      limites: {
        diasProgramacionMinimo: DIAS_PROGRAMACION_MINIMO,
        diasProgramacionMaximo: DIAS_PROGRAMACION_MAXIMO,
      },
    })
  } catch (error) {
    console.error("Error al obtener la configuración:", error)
    return NextResponse.json(
      { error: "Error al obtener la configuración" },
      { status: 500 }
    )
  }
}

// PUT /api/configuracion - Guardar los parámetros de operación
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const negativa = negarSiNoEsAdmin(session)
    if (negativa) return negativa

    const body = await request.json()
    const validatedData = configuracionSchema.parse(body)

    // `upsert` y no `update`: la fila no la crea nadie, porque el repositorio no
    // tiene semilla de Prisma. La primera vez que un administrador guarde, hay
    // que crearla.
    const guardada = await prisma.configuracion.upsert({
      where: { id: ID_CONFIGURACION },
      update: { diasProgramacion: validatedData.diasProgramacion },
      create: {
        id: ID_CONFIGURACION,
        diasProgramacion: validatedData.diasProgramacion,
      },
      select: { diasProgramacion: true },
    })

    return NextResponse.json(guardada)
  } catch (error) {
    if (esErrorDeValidacion(error)) {
      return NextResponse.json(
        {
          error: mensajeDeValidacion(error),
          campos: camposConProblema(error),
        },
        { status: 400 }
      )
    }

    console.error("Error al guardar la configuración:", error)
    return NextResponse.json(
      { error: "Error al guardar la configuración" },
      { status: 500 }
    )
  }
}
