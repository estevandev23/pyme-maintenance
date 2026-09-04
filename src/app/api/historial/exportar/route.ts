import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { filtrosDeHistorial } from "@/lib/filtros-listado.server"
import { construirHistorialExcel } from "@/lib/excel-export"
import { construirHistorialPDF } from "@/lib/pdf-export"
import {
  acotadoPorRol,
  anotarAlcanceExcel,
  descripcionDeFiltros,
  filasDeHistorialExcel,
  filasDeHistorialPDF,
  leerFormato,
  lineasDeAlcance,
  respuestaExcel,
  respuestaPDF,
} from "@/lib/exportaciones.server"

/**
 * Descarga del historial de intervenciones.
 *
 * Esta pantalla ya tenía selector de fechas y lo mandaba a la API; lo que no
 * funcionaba era la exportación, que se quedaba en la página cargada. El filtro
 * de fechas viaja en los mismos parámetros que el listado.
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

    // Sin `skip` ni `take`: el archivo cubre todo lo que cumple los filtros.
    const hist = await prisma.historial.findMany({
      where: filtrosDeHistorial(searchParams, session.user),
      orderBy: { fecha: "desc" },
      include: {
        equipo: { select: { tipo: true, marca: true, serial: true } },
        tecnico: { select: { nombre: true } },
        mantenimiento: { select: { tipo: true } },
      },
    })

    const alcance = {
      total: hist.length,
      filtros: descripcionDeFiltros(searchParams),
      acotadoPorRol: acotadoPorRol(session.user.role),
    }

    if (formato === "excel") {
      const wb = construirHistorialExcel(filasDeHistorialExcel(hist))
      anotarAlcanceExcel(wb, alcance)
      return respuestaExcel(wb, "historial")
    }

    const doc = construirHistorialPDF(
      filasDeHistorialPDF(hist),
      "Historial de Intervenciones",
      lineasDeAlcance(alcance)
    )
    return respuestaPDF(doc, "historial")
  } catch (error) {
    console.error("Error al exportar historial:", error)
    return NextResponse.json(
      { error: "Error al generar el archivo" },
      { status: 500 }
    )
  }
}
