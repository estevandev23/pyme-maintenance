import * as XLSX from "xlsx"
import { SIN_TECNICO } from "@/lib/tecnico-asignado"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  etiquetaDesviacion,
  etiquetaRango,
  type EstadisticasInforme,
} from "@/lib/estadisticas"

// Tipos para los datos que vamos a exportar
interface ExportEquipo {
  tipo: string
  marca: string
  modelo: string | null
  serial: string
  estado: string
  ubicacion: string | null
  empresa: string
}

interface ExportMantenimiento {
  tipo: string
  estado: string
  equipo: string
  empresa: string
  /** Nulo mientras el mantenimiento espera técnico. */
  tecnico: string | null
  fechaProgramada: string
  fechaRealizada: string | null
  descripcion: string
  observaciones: string | null
}

interface ExportHistorial {
  fecha: string
  equipo: string
  tipoMantenimiento: string
  tecnico: string
  observaciones: string
}

/**
 * Exporta un array de equipos a un archivo Excel
 */
export function exportEquiposToExcel(equipos: ExportEquipo[], fileName: string = "equipos") {
  // Transformar datos para la exportación
  const data = equipos.map((equipo) => ({
    Tipo: equipo.tipo,
    Marca: equipo.marca,
    Modelo: equipo.modelo || "-",
    Serial: equipo.serial,
    Estado: equipo.estado,
    Ubicación: equipo.ubicacion || "-",
    Empresa: equipo.empresa,
  }))

  // Crear worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Ajustar ancho de columnas
  const columnWidths = [
    { wch: 15 }, // Tipo
    { wch: 15 }, // Marca
    { wch: 15 }, // Modelo
    { wch: 20 }, // Serial
    { wch: 15 }, // Estado
    { wch: 25 }, // Ubicación
    { wch: 30 }, // Empresa
  ]
  worksheet["!cols"] = columnWidths

  // Crear workbook y agregar worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Equipos")

  // Agregar metadata
  workbook.Props = {
    Title: "Reporte de Equipos",
    Subject: "Equipos registrados en el sistema",
    Author: "MantenPro",
    CreatedDate: new Date(),
  }

  // Generar archivo
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}

/**
 * Exporta un array de mantenimientos a un archivo Excel
 */
export function exportMantenimientosToExcel(
  mantenimientos: ExportMantenimiento[],
  fileName: string = "mantenimientos"
) {
  // Transformar datos para la exportación
  const data = mantenimientos.map((mant) => ({
    Tipo: mant.tipo,
    Estado: mant.estado,
    Equipo: mant.equipo,
    Empresa: mant.empresa,
    Técnico: mant.tecnico ?? SIN_TECNICO,
    "Fecha Programada": mant.fechaProgramada,
    "Fecha Realizada": mant.fechaRealizada || "-",
    Descripción: mant.descripcion,
    Observaciones: mant.observaciones || "-",
  }))

  // Crear worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Ajustar ancho de columnas
  const columnWidths = [
    { wch: 12 }, // Tipo
    { wch: 12 }, // Estado
    { wch: 30 }, // Equipo
    { wch: 25 }, // Empresa
    { wch: 20 }, // Técnico
    { wch: 15 }, // Fecha Programada
    { wch: 15 }, // Fecha Realizada
    { wch: 40 }, // Descripción
    { wch: 40 }, // Observaciones
  ]
  worksheet["!cols"] = columnWidths

  // Crear workbook y agregar worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mantenimientos")

  // Agregar metadata
  workbook.Props = {
    Title: "Reporte de Mantenimientos",
    Subject: "Mantenimientos registrados en el sistema",
    Author: "MantenPro",
    CreatedDate: new Date(),
  }

  // Generar archivo
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}

/**
 * Exporta un array de historiales a un archivo Excel
 */
export function exportHistorialToExcel(
  historial: ExportHistorial[],
  fileName: string = "historial"
) {
  // Transformar datos para la exportación
  const data = historial.map((item) => ({
    Fecha: item.fecha,
    Equipo: item.equipo,
    "Tipo de Mantenimiento": item.tipoMantenimiento,
    Técnico: item.tecnico,
    Observaciones: item.observaciones,
  }))

  // Crear worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Ajustar ancho de columnas
  const columnWidths = [
    { wch: 18 }, // Fecha
    { wch: 30 }, // Equipo
    { wch: 18 }, // Tipo de Mantenimiento
    { wch: 20 }, // Técnico
    { wch: 50 }, // Observaciones
  ]
  worksheet["!cols"] = columnWidths

  // Crear workbook y agregar worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historial")

  // Agregar metadata
  workbook.Props = {
    Title: "Historial de Mantenimientos",
    Subject: "Historial de intervenciones",
    Author: "MantenPro",
    CreatedDate: new Date(),
  }

  // Generar archivo
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}

/**
 * Exporta estadísticas del dashboard a Excel
 */
export function exportEstadisticasToExcel(
  stats: EstadisticasInforme,
  fileName: string = "estadisticas"
) {
  const workbook = XLSX.utils.book_new()
  const generado = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  // Sheet 1: Resumen. Lleva todos los indicadores destacados del panel y el
  // periodo con el que se generó, para que el archivo se entienda sin la app.
  const resumenData = [
    { Métrica: "Periodo del informe", Valor: etiquetaRango(stats.rango) },
    { Métrica: "Generado", Valor: generado },
    { Métrica: "Total de Equipos", Valor: stats.totalEquipos },
    { Métrica: "Equipos Críticos", Valor: stats.equiposCriticos },
    { Métrica: "Total de Mantenimientos (periodo)", Valor: stats.totalMantenimientos },
    { Métrica: "Completados (periodo)", Valor: stats.completadosPeriodo },
    { Métrica: "Variación de completados (%)", Valor: stats.cambioCompletados },
    { Métrica: "Pendientes (periodo)", Valor: stats.mantenimientosPendientes },
    { Métrica: "Variación de pendientes (%)", Valor: stats.cambioPendientes },
    {
      Métrica: "Desviación respecto a la fecha programada (días)",
      Valor: stats.desviacionPromedioProgramacion,
    },
    {
      Métrica: "Desviación respecto a la fecha programada",
      Valor: etiquetaDesviacion(stats.desviacionPromedioProgramacion),
    },
    { Métrica: "Equipos con fallas recurrentes", Valor: stats.fallasRecurrentes.length },
  ]
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen["!cols"] = [{ wch: 45 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen")

  // Sheet 2: Equipos por Estado
  const wsEquipos = XLSX.utils.json_to_sheet(
    Object.entries(stats.equiposPorEstado).map(([estado, cantidad]) => ({
      Estado: estado,
      Cantidad: cantidad,
    }))
  )
  wsEquipos["!cols"] = [{ wch: 20 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, wsEquipos, "Equipos por Estado")

  // Sheet 3: Mantenimientos por Estado
  const wsMantEstado = XLSX.utils.json_to_sheet(
    Object.entries(stats.mantenimientosPorEstado).map(([estado, cantidad]) => ({
      Estado: estado,
      Cantidad: cantidad,
    }))
  )
  wsMantEstado["!cols"] = [{ wch: 20 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, wsMantEstado, "Mantenimientos por Estado")

  // Sheet 4: Mantenimientos por Tipo
  const wsMantTipo = XLSX.utils.json_to_sheet(
    Object.entries(stats.mantenimientosPorTipo).map(([tipo, cantidad]) => ({
      Tipo: tipo,
      Cantidad: cantidad,
    }))
  )
  wsMantTipo["!cols"] = [{ wch: 20 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, wsMantTipo, "Mantenimientos por Tipo")

  // Sheet 5: Mantenimientos por Mes. Conserva la separación preventivo /
  // correctivo que muestra el gráfico, en lugar de sumarlos en una sola cifra.
  const wsMantMes = XLSX.utils.json_to_sheet(
    stats.mantenimientosPorMes.map((m) => ({
      Mes: m.mes,
      Preventivos: m.preventivo,
      Correctivos: m.correctivo,
      Total: m.total,
    }))
  )
  wsMantMes["!cols"] = [{ wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, wsMantMes, "Mantenimientos por Mes")

  // Sheet 6: Fallas Recurrentes
  const wsFallas = XLSX.utils.json_to_sheet(
    stats.fallasRecurrentes.map((falla) => ({
      Equipo: falla.equipo
        ? `${falla.equipo.tipo} ${falla.equipo.marca} ${falla.equipo.modelo || ""}`.trim()
        : "-",
      Serial: falla.equipo?.serial || "-",
      Empresa: falla.equipo?.empresa || "-",
      "Cantidad de Fallas": falla.cantidadFallas,
    }))
  )
  wsFallas["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, wsFallas, "Fallas Recurrentes")

  // Sheet 7: Próximos Mantenimientos
  const wsProximos = XLSX.utils.json_to_sheet(
    stats.proximosMantenimientos.map((m) => ({
      Equipo: m.equipo
        ? `${m.equipo.tipo} ${m.equipo.marca} ${m.equipo.modelo || ""}`.trim()
        : "-",
      Serial: m.equipo?.serial || "-",
      Empresa: m.equipo?.empresa?.nombre || "-",
      Técnico: m.tecnico?.nombre || SIN_TECNICO,
      Tipo: m.tipo,
      Estado: m.estado,
      "Fecha Programada": m.fechaProgramada
        ? format(new Date(m.fechaProgramada), "dd/MM/yyyy", { locale: es })
        : "-",
    }))
  )
  wsProximos["!cols"] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 30 },
    { wch: 25 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(workbook, wsProximos, "Próximos Mantenimientos")

  // Agregar metadata
  workbook.Props = {
    Title: "Estadísticas del Sistema",
    Subject: `Reporte de estadísticas y métricas (${etiquetaRango(stats.rango)})`,
    Author: "MantenPro",
    CreatedDate: new Date(),
  }

  // Generar archivo
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm")
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}
