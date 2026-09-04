import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  puedeAdjuntarReporte,
  puedeVerMantenimiento,
} from "@/lib/alcance-mantenimiento"
import {
  MAX_TAMANO_REPORTE,
  MENSAJE_TAMANO,
  TIPO_REPORTE,
  eliminarReporte,
  guardarReporte,
  leerReporte,
  nombreDeDescarga,
  urlDeReporte,
  validarReporte,
} from "@/lib/reportes.server"

/**
 * El reporte PDF de un mantenimiento.
 *
 * Las tres operaciones cuelgan del mantenimiento, y por eso pueden comprobar
 * pertenencia: con el mantenimiento a la vista se decide si quien pide tiene
 * alcance, con la misma regla que la lectura y la edición ya aplican. La ruta
 * genérica de subida que había antes no sabía a qué pertenecía el archivo y no
 * tenía contra qué comprobar nada.
 */

type Contexto = { params: Promise<{ id: string }> }

const sinSesion = () =>
  NextResponse.json({ error: "No autorizado" }, { status: 401 })
const sinPermisos = () =>
  NextResponse.json({ error: "Sin permisos" }, { status: 403 })
const noEncontrado = () =>
  NextResponse.json({ error: "Mantenimiento no encontrado" }, { status: 404 })
/** Ausencia de reporte, distinguible de un fallo: `sinReporte` la marca. */
const sinReporte = () =>
  NextResponse.json(
    { error: "El mantenimiento no tiene reporte", sinReporte: true },
    { status: 404 }
  )

async function buscarMantenimiento(id: string) {
  return prisma.mantenimiento.findUnique({
    where: { id },
    select: {
      id: true,
      tecnicoId: true,
      estado: true,
      reporteUrl: true,
      equipo: { select: { empresaId: true } },
    },
  })
}

// GET /api/mantenimientos/[id]/reporte - Descargar el reporte
export async function GET(_request: NextRequest, { params }: Contexto) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) return sinSesion()

    const { id } = await params
    const mantenimiento = await buscarMantenimiento(id)

    if (!mantenimiento) return noEncontrado()

    // Antes de mirar si hay reporte: quien no tiene alcance recibe lo mismo
    // haya reporte o no, así que la respuesta no revela si existe.
    if (
      !puedeVerMantenimiento(session.user, {
        tecnicoId: mantenimiento.tecnicoId,
        empresaId: mantenimiento.equipo.empresaId,
      })
    ) {
      return sinPermisos()
    }

    if (!mantenimiento.reporteUrl) return sinReporte()

    const contenido = await leerReporte(mantenimiento.id)

    if (!contenido) {
      // El registro dice que hay reporte y el disco dice que no. Eso sí es un
      // fallo de custodia, no una ausencia, y se presenta como tal.
      console.error(
        `El reporte del mantenimiento ${mantenimiento.id} figura en la base pero no está en disco`
      )
      return NextResponse.json(
        { error: "El archivo del reporte no está disponible" },
        { status: 500 }
      )
    }

    // Se entrega para guardar, con el tipo que el sistema fijó al aceptarlo y
    // sin dejar que el navegador lo reinterprete: un PDF puede llevar contenido
    // activo, y servirlo en línea dentro del origen de la aplicación lo pondría
    // a ejecutarse con sus mismos permisos.
    return new NextResponse(new Uint8Array(contenido), {
      status: 200,
      headers: {
        "Content-Type": TIPO_REPORTE,
        "Content-Disposition": `attachment; filename="${nombreDeDescarga(mantenimiento.id)}"`,
        "Content-Length": String(contenido.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Error al descargar el reporte:", error)
    return NextResponse.json(
      { error: "Error al descargar el reporte" },
      { status: 500 }
    )
  }
}

// POST /api/mantenimientos/[id]/reporte - Adjuntar el reporte, o sustituirlo
export async function POST(request: NextRequest, { params }: Contexto) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) return sinSesion()

    const { id } = await params
    const mantenimiento = await buscarMantenimiento(id)

    if (!mantenimiento) return noEncontrado()

    if (!puedeAdjuntarReporte(session.user, mantenimiento)) {
      return sinPermisos()
    }

    const formData = await request.formData()
    const archivo = formData.get("file")

    if (!archivo || typeof archivo === "string") {
      return NextResponse.json(
        { error: "No se proporcionó archivo" },
        { status: 400 }
      )
    }

    // El tamaño se mira antes de leer el contenido. El formato, sobre el
    // contenido y no sobre `type`, que lo pone quien envía.
    if (archivo.size > MAX_TAMANO_REPORTE) {
      return NextResponse.json(
        { error: MENSAJE_TAMANO, motivo: "tamano" },
        { status: 400 }
      )
    }

    const contenido = Buffer.from(await archivo.arrayBuffer())
    const rechazo = validarReporte(contenido)

    if (rechazo) {
      return NextResponse.json(
        { error: rechazo.mensaje, motivo: rechazo.motivo },
        { status: 400 }
      )
    }

    // El archivo se nombra por el mantenimiento: sustituir sobrescribe el
    // anterior, y el nombre recibido no interviene en dónde se escribe.
    await guardarReporte(mantenimiento.id, contenido)

    const url = urlDeReporte(mantenimiento.id)

    try {
      await prisma.mantenimiento.update({
        where: { id: mantenimiento.id },
        data: { reporteUrl: url },
      })
    } catch (error) {
      // Si el registro no se pudo actualizar y antes no había reporte, el
      // archivo recién escrito no pertenece a nada.
      if (!mantenimiento.reporteUrl) await eliminarReporte(mantenimiento.id)
      throw error
    }

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Error al adjuntar el reporte:", error)
    return NextResponse.json(
      { error: "Error al adjuntar el reporte" },
      { status: 500 }
    )
  }
}

// DELETE /api/mantenimientos/[id]/reporte - Quitar el reporte
export async function DELETE(_request: NextRequest, { params }: Contexto) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) return sinSesion()

    const { id } = await params
    const mantenimiento = await buscarMantenimiento(id)

    if (!mantenimiento) return noEncontrado()

    if (!puedeAdjuntarReporte(session.user, mantenimiento)) {
      return sinPermisos()
    }

    // Primero el registro y luego el disco: si el archivo no se pudiera borrar
    // quedaría un huérfano, pero nunca un enlace a un archivo que ya no existe.
    await prisma.mantenimiento.update({
      where: { id: mantenimiento.id },
      data: { reporteUrl: null },
    })
    await eliminarReporte(mantenimiento.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al quitar el reporte:", error)
    return NextResponse.json(
      { error: "Error al quitar el reporte" },
      { status: 500 }
    )
  }
}
