import jsPDF from "jspdf"
import { SIN_TECNICO } from "@/lib/tecnico-asignado"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  etiquetaDesviacion,
  etiquetaRango,
  type EstadisticasInforme,
} from "@/lib/estadisticas"

// Extender el tipo jsPDF para incluir autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

/**
 * Configuración común para todos los PDFs
 */
function configurePDF(doc: jsPDF, title: string, alcance: string[] = []): number {
  // Agregar título
  doc.setFontSize(18)
  doc.text(title, 14, 20)

  // Agregar fecha de generación
  doc.setFontSize(10)
  doc.text(
    `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    14,
    28
  )

  // Lo que el archivo declara sobre sí mismo: cuántos elementos trae, con qué
  // filtros y si está acotado por el rol de quien lo pidió. Sin esto, un archivo
  // recortado no se distingue de uno completo.
  let y = 32
  if (alcance.length > 0) {
    doc.setFontSize(8)
    doc.setTextColor(90, 90, 90)
    for (const linea of alcance) {
      y += 4
      doc.text(linea, 14, y)
    }
    doc.setTextColor(0, 0, 0)
    y += 2
  }

  // Línea separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, doc.internal.pageSize.width - 14, y)

  // Dónde puede empezar la tabla.
  return y + 6
}

/**
 * Agregar footer con número de página
 */
function addFooter(doc: jsPDF) {
  const pageCount = doc.internal.pages.length - 1
  doc.setFontSize(8)
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `MantenPro - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    )
  }
}

/**
 * Filas que espera cada exportador. Declaran solo los campos que la función
 * lee, no el modelo completo: quien exporta ya llega con los datos aplanados.
 */
interface FilaEquipo {
  tipo: string
  marca: string
  modelo: string | null
  serial: string
  estado: string
  ubicacion: string | null
  empresa: string
}

interface FilaMantenimiento {
  tipo: string
  estado: string
  equipo: string
  empresa: string
  /** Nulo mientras el mantenimiento espera técnico. */
  tecnico: string | null
  fechaProgramada: string
  fechaRealizada: string | null
}

interface FilaHistorial {
  fecha: string
  equipo: string
  tipoMantenimiento: string
  tecnico: string
  observaciones: string
}

/**
 * Exporta equipos a PDF
 */
export function construirEquiposPDF(equipos: FilaEquipo[], alcance: string[] = []) {
  const doc = new jsPDF()
  const inicioTabla = configurePDF(doc, "Reporte de Equipos", alcance)

  // Preparar datos para la tabla
  const tableData = equipos.map((equipo) => [
    equipo.tipo,
    equipo.marca,
    equipo.modelo || "-",
    equipo.serial,
    equipo.estado,
    equipo.ubicacion || "-",
    equipo.empresa,
  ])

  // Crear tabla
  autoTable(doc, {
    startY: inicioTabla,
    head: [["Tipo", "Marca", "Modelo", "Serial", "Estado", "Ubicación", "Empresa"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 },
      5: { cellWidth: 30 },
      6: { cellWidth: 35 },
    },
    margin: { top: inicioTabla },
  })

  addFooter(doc)

  return doc
}

/**
 * Exporta mantenimientos a PDF
 */
export function construirMantenimientosPDF(
  mantenimientos: FilaMantenimiento[],
  alcance: string[] = []
) {
  const doc = new jsPDF()
  const inicioTabla = configurePDF(doc, "Reporte de Mantenimientos", alcance)

  // Preparar datos para la tabla
  const tableData = mantenimientos.map((mant) => [
    mant.tipo,
    mant.estado,
    mant.equipo,
    mant.empresa,
    mant.tecnico ?? SIN_TECNICO,
    mant.fechaProgramada,
    mant.fechaRealizada || "-",
  ])

  // Crear tabla
  autoTable(doc, {
    startY: inicioTabla,
    head: [
      [
        "Tipo",
        "Estado",
        "Equipo",
        "Empresa",
        "Técnico",
        "F. Programada",
        "F. Realizada",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
    },
    margin: { top: inicioTabla },
  })

  addFooter(doc)

  return doc
}

/**
 * Exporta historial a PDF
 */
export function construirHistorialPDF(
  historial: FilaHistorial[],
  titulo?: string,
  alcance: string[] = []
) {
  const doc = new jsPDF()
  const inicioTabla = configurePDF(doc, titulo || "Historial de Intervenciones", alcance)

  // Preparar datos para la tabla
  const tableData = historial.map((item) => [
    item.fecha,
    item.equipo,
    item.tipoMantenimiento,
    item.tecnico,
    item.observaciones,
  ])

  // Crear tabla
  autoTable(doc, {
    startY: inicioTabla,
    head: [["Fecha", "Equipo", "Tipo", "Técnico", "Observaciones"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 60 },
    },
    margin: { top: inicioTabla },
  })

  addFooter(doc)

  return doc
}

/**
 * Exporta estadísticas a PDF
 */
export function construirEstadisticasPDF(
  stats: EstadisticasInforme,
  alcance: string[] = []
) {
  const doc = new jsPDF()
  const inicioTabla = configurePDF(doc, "Estadísticas del Sistema", alcance)

  let currentY = inicioTabla

  // El periodo va antes que cualquier cifra: sin él las tablas no se pueden
  // interpretar fuera de la aplicación.
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Periodo: ${etiquetaRango(stats.rango)}`, 14, currentY)
  currentY += 10

  const seccion = (titulo: string) => {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage()
      currentY = 20
    }
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(titulo, 14, currentY)
    currentY += 8
  }

  const tabla = (head: string[], body: string[][]) => {
    autoTable(doc, {
      startY: currentY,
      head: [head],
      body,
      theme: "grid",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
      },
    })
    const conTabla = doc as unknown as { lastAutoTable: { finalY: number } }
    currentY = conTabla.lastAutoTable.finalY + 10
  }

  seccion("Resumen General")
  tabla(
    ["Métrica", "Valor"],
    [
      ["Total de Equipos", stats.totalEquipos.toString()],
      ["Equipos Críticos", stats.equiposCriticos.toString()],
      ["Total de Mantenimientos (periodo)", stats.totalMantenimientos.toString()],
      ["Completados (periodo)", stats.completadosPeriodo.toString()],
      ["Variación de completados", `${stats.cambioCompletados}%`],
      ["Pendientes (periodo)", stats.mantenimientosPendientes.toString()],
      ["Variación de pendientes", `${stats.cambioPendientes}%`],
      [
        "Desviación respecto a la fecha programada",
        etiquetaDesviacion(stats.desviacionPromedioProgramacion),
      ],
      ["Equipos con fallas recurrentes", stats.fallasRecurrentes.length.toString()],
    ]
  )

  seccion("Equipos por Estado")
  tabla(
    ["Estado", "Cantidad"],
    Object.entries(stats.equiposPorEstado).map(([estado, cantidad]) => [
      estado,
      cantidad.toString(),
    ])
  )

  seccion("Mantenimientos por Estado")
  tabla(
    ["Estado", "Cantidad"],
    Object.entries(stats.mantenimientosPorEstado).map(([estado, cantidad]) => [
      estado,
      cantidad.toString(),
    ])
  )

  seccion("Mantenimientos por Tipo")
  tabla(
    ["Tipo", "Cantidad"],
    Object.entries(stats.mantenimientosPorTipo).map(([tipo, cantidad]) => [
      tipo,
      cantidad.toString(),
    ])
  )

  seccion("Mantenimientos por Mes")
  tabla(
    ["Mes", "Preventivos", "Correctivos", "Total"],
    stats.mantenimientosPorMes.map((m) => [
      m.mes,
      m.preventivo.toString(),
      m.correctivo.toString(),
      m.total.toString(),
    ])
  )

  seccion("Fallas Recurrentes por Equipo")
  tabla(
    ["Equipo", "Serial", "Empresa", "Fallas"],
    stats.fallasRecurrentes.map((falla) => [
      falla.equipo
        ? `${falla.equipo.tipo} ${falla.equipo.marca} ${falla.equipo.modelo || ""}`.trim()
        : "-",
      falla.equipo?.serial || "-",
      falla.equipo?.empresa || "-",
      falla.cantidadFallas.toString(),
    ])
  )

  seccion("Próximos Mantenimientos")
  tabla(
    ["Equipo", "Empresa", "Técnico", "Tipo", "Estado", "Fecha Programada"],
    stats.proximosMantenimientos.map((m) => [
      m.equipo
        ? `${m.equipo.tipo} ${m.equipo.marca} ${m.equipo.modelo || ""}`.trim()
        : "-",
      m.equipo?.empresa?.nombre || "-",
      m.tecnico?.nombre || SIN_TECNICO,
      m.tipo,
      m.estado,
      m.fechaProgramada
        ? format(new Date(m.fechaProgramada), "dd/MM/yyyy", { locale: es })
        : "-",
    ])
  )

  addFooter(doc)

  return doc
}

/**
 * Entrega en el navegador. Ver la nota equivalente en `excel-export`: el armado
 * del documento es aritmética pura y corre igual en el servidor; solo esta capa
 * necesita el navegador.
 */
function descargarPDF(doc: jsPDF, nombre: string) {
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  doc.save(`${nombre}_${timestamp}.pdf`)
}

export function exportEquiposToPDF(equipos: Parameters<typeof construirEquiposPDF>[0]) {
  descargarPDF(construirEquiposPDF(equipos), "equipos")
}

export function exportMantenimientosToPDF(
  mantenimientos: Parameters<typeof construirMantenimientosPDF>[0]
) {
  descargarPDF(construirMantenimientosPDF(mantenimientos), "mantenimientos")
}

export function exportHistorialToPDF(
  historial: Parameters<typeof construirHistorialPDF>[0],
  titulo?: string
) {
  descargarPDF(construirHistorialPDF(historial, titulo), "historial")
}

export function exportEstadisticasToPDF(
  stats: Parameters<typeof construirEstadisticasPDF>[0]
) {
  descargarPDF(construirEstadisticasPDF(stats), "estadisticas")
}
