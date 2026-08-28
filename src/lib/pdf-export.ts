import jsPDF from "jspdf"
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
function configurePDF(doc: jsPDF, title: string) {
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

  // Línea separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 32, doc.internal.pageSize.width - 14, 32)
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
 * Exporta equipos a PDF
 */
export function exportEquiposToPDF(equipos: any[]) {
  const doc = new jsPDF()
  configurePDF(doc, "Reporte de Equipos")

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
    startY: 38,
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
    margin: { top: 38 },
  })

  addFooter(doc)

  // Descargar PDF
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  doc.save(`equipos_${timestamp}.pdf`)
}

/**
 * Exporta mantenimientos a PDF
 */
export function exportMantenimientosToPDF(mantenimientos: any[]) {
  const doc = new jsPDF()
  configurePDF(doc, "Reporte de Mantenimientos")

  // Preparar datos para la tabla
  const tableData = mantenimientos.map((mant) => [
    mant.tipo,
    mant.estado,
    mant.equipo,
    mant.empresa,
    mant.tecnico,
    mant.fechaProgramada,
    mant.fechaRealizada || "-",
  ])

  // Crear tabla
  autoTable(doc, {
    startY: 38,
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
    margin: { top: 38 },
  })

  addFooter(doc)

  // Descargar PDF
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  doc.save(`mantenimientos_${timestamp}.pdf`)
}

/**
 * Exporta historial a PDF
 */
export function exportHistorialToPDF(historial: any[], titulo?: string) {
  const doc = new jsPDF()
  configurePDF(doc, titulo || "Historial de Intervenciones")

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
    startY: 38,
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
    margin: { top: 38 },
  })

  addFooter(doc)

  // Descargar PDF
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  doc.save(`historial_${timestamp}.pdf`)
}

/**
 * Exporta estadísticas a PDF
 */
export function exportEstadisticasToPDF(stats: EstadisticasInforme) {
  const doc = new jsPDF()
  configurePDF(doc, "Estadísticas del Sistema")

  let currentY = 38

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
      m.tecnico?.nombre || "-",
      m.tipo,
      m.estado,
      m.fechaProgramada
        ? format(new Date(m.fechaProgramada), "dd/MM/yyyy", { locale: es })
        : "-",
    ])
  )

  addFooter(doc)

  // Descargar PDF
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  doc.save(`estadisticas_${timestamp}.pdf`)
}
