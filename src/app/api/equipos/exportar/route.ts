import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { filtrosDeEquipos } from "@/lib/filtros-listado.server"
import { construirEquiposExcel } from "@/lib/excel-export"
import { construirEquiposPDF } from "@/lib/pdf-export"
import {
  acotadoPorRol,
  anotarAlcanceExcel,
  descripcionDeFiltros,
  filasDeEquipos,
  leerFormato,
  lineasDeAlcance,
  respuestaExcel,
  respuestaPDF,
} from "@/lib/exportaciones.server"

/**
 * Descarga del inventario de equipos.
 *
 * Sin rango de fechas, a propósito: un equipo no tiene una fecha propia sobre la
 * que acotar, y quien exporta el inventario quiere el inventario, no los equipos
 * dados de alta en un mes concreto.
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
    const equipos = await prisma.equipo.findMany({
      where: filtrosDeEquipos(searchParams, session.user),
      orderBy: { createdAt: "desc" },
      include: { empresa: { select: { nombre: true } } },
    })

    const alcance = {
      total: equipos.length,
      filtros: descripcionDeFiltros(searchParams),
      acotadoPorRol: acotadoPorRol(session.user.role),
    }

    const filas = filasDeEquipos(equipos)

    if (formato === "excel") {
      const wb = construirEquiposExcel(filas)
      anotarAlcanceExcel(wb, alcance)
      return respuestaExcel(wb, "equipos")
    }

    return respuestaPDF(construirEquiposPDF(filas, lineasDeAlcance(alcance)), "equipos")
  } catch (error) {
    console.error("Error al exportar equipos:", error)
    return NextResponse.json(
      { error: "Error al generar el archivo" },
      { status: 500 }
    )
  }
}
