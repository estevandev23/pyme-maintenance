import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  filtroPorFechaReferencia,
  filtrosDeMantenimientos,
} from "@/lib/filtros-listado.server"
import { parsearRango, rangoAISO } from "@/lib/estadisticas"
import { construirMantenimientosExcel } from "@/lib/excel-export"
import { construirMantenimientosPDF } from "@/lib/pdf-export"
import {
  acotadoPorRol,
  anotarAlcanceExcel,
  descripcionDeFiltros,
  filasDeMantenimientosExcel,
  filasDeMantenimientosPDF,
  leerFormato,
  lineasDeAlcance,
  respuestaExcel,
  respuestaPDF,
} from "@/lib/exportaciones.server"

/**
 * Descarga del listado de mantenimientos.
 *
 * Se genera aquí y no en el navegador porque aquí están todos los datos: la
 * pantalla solo tiene la página cargada, y armar el archivo con ella producía
 * diez filas de las que hubiera, sin decirlo.
 *
 * El alcance por rol sale del mismo armado de filtros que usa el listado. No se
 * copia: una copia acabaría divergiendo y la diferencia no se vería en pantalla.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const formato = leerFormato(searchParams.get("formato"))
    if (!formato) {
      return NextResponse.json(
        { error: "Formato no admitido. Use 'excel' o 'pdf'." },
        { status: 400 }
      )
    }

    // Mismo lector de rango que el panel, para que un mes no dé dos cifras
    // según dónde se mire.
    const resultado = parsearRango(searchParams.get("desde"), searchParams.get("hasta"))
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: 400 })
    }
    const { rango } = resultado

    const where: Prisma.MantenimientoWhereInput = {
      AND: [
        filtrosDeMantenimientos(searchParams, session.user),
        filtroPorFechaReferencia(rango),
      ],
    }

    // Sin `skip` ni `take`: el archivo cubre todo lo que cumple los filtros.
    const mants = await prisma.mantenimiento.findMany({
      where,
      orderBy: { fechaProgramada: "desc" },
      include: {
        equipo: { include: { empresa: { select: { nombre: true } } } },
        tecnico: { select: { nombre: true } },
      },
    })

    const iso = rangoAISO(rango)
    const alcance = {
      total: mants.length,
      filtros: [
        `Periodo ${iso.desde} a ${iso.hasta} (por fecha realizada, o programada si aún no se ha hecho)`,
        ...descripcionDeFiltros(searchParams),
      ],
      acotadoPorRol: acotadoPorRol(session.user.role),
    }

    if (formato === "excel") {
      const wb = construirMantenimientosExcel(filasDeMantenimientosExcel(mants))
      anotarAlcanceExcel(wb, alcance)
      return respuestaExcel(wb, "mantenimientos")
    }

    const doc = construirMantenimientosPDF(
      filasDeMantenimientosPDF(mants),
      lineasDeAlcance(alcance)
    )
    return respuestaPDF(doc, "mantenimientos")
  } catch (error) {
    console.error("Error al exportar mantenimientos:", error)
    return NextResponse.json(
      { error: "Error al generar el archivo" },
      { status: 500 }
    )
  }
}
