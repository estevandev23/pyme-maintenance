/**
 * Generación de los archivos exportados en el servidor.
 *
 * Antes cada pantalla armaba el archivo con lo que tenía cargado, que es la
 * página visible: diez filas. El archivo salía con diez de quinientas y no lo
 * decía en ninguna parte. Aquí se genera con todo lo que cumple los filtros,
 * porque es donde están todos los datos y donde el alcance por rol ya se aplica.
 *
 * El mapeo de cada fila vivía en las páginas; se trae aquí para que la forma del
 * archivo no dependa de qué pantalla lo pidió.
 */

import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { WorkBook } from "xlsx"
import * as XLSX from "xlsx"

/** Lo que se sabe del archivo, para que pueda declararlo. */
export interface AlcanceDelArchivo {
  /** Cuántos elementos contiene. */
  total: number
  /** Los filtros aplicados, ya en texto legible. */
  filtros: string[]
  /** Presente cuando el archivo recoge solo lo que el rol permite ver. */
  acotadoPorRol?: string
}

const ETIQUETA_ROL: Record<string, string> = {
  CLIENTE: "Contiene únicamente los datos de la empresa del usuario",
  TECNICO: "Contiene únicamente los mantenimientos asignados al usuario",
}

/** Frase de alcance por rol, o nada cuando quien exporta lo ve todo. */
export function acotadoPorRol(role: string): string | undefined {
  return ETIQUETA_ROL[role]
}

const fecha = (d: Date | string | null | undefined, patron = "dd/MM/yyyy") =>
  d ? format(new Date(d), patron, { locale: es }) : null

type MantenimientoDeBase = {
  tipo: string
  estado: string
  fechaProgramada: Date
  fechaRealizada: Date | null
  descripcion: string
  observaciones: string | null
  equipo: {
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    empresa: { nombre: string }
  }
  tecnico: { nombre: string } | null
}

export function filasDeMantenimientosExcel(mants: MantenimientoDeBase[]) {
  return mants.map((m) => ({
    tipo: m.tipo,
    estado: m.estado,
    equipo: `${m.equipo.tipo} - ${m.equipo.marca} ${m.equipo.modelo || ""} (${m.equipo.serial})`,
    empresa: m.equipo.empresa.nombre,
    tecnico: m.tecnico?.nombre ?? null,
    fechaProgramada: fecha(m.fechaProgramada)!,
    fechaRealizada: fecha(m.fechaRealizada),
    descripcion: m.descripcion,
    observaciones: m.observaciones,
  }))
}

export function filasDeMantenimientosPDF(mants: MantenimientoDeBase[]) {
  return mants.map((m) => ({
    tipo: m.tipo,
    estado: m.estado,
    equipo: `${m.equipo.tipo} - ${m.equipo.marca}`,
    empresa: m.equipo.empresa.nombre,
    tecnico: m.tecnico?.nombre ?? null,
    fechaProgramada: fecha(m.fechaProgramada)!,
    fechaRealizada: fecha(m.fechaRealizada),
  }))
}

type EquipoDeBase = {
  tipo: string
  marca: string
  modelo: string | null
  serial: string
  estado: string
  ubicacion: string | null
  empresa: { nombre: string }
}

export function filasDeEquipos(equipos: EquipoDeBase[]) {
  return equipos.map((e) => ({
    tipo: e.tipo,
    marca: e.marca,
    modelo: e.modelo,
    serial: e.serial,
    estado: e.estado,
    ubicacion: e.ubicacion,
    empresa: e.empresa.nombre,
  }))
}

type HistorialDeBase = {
  fecha: Date
  observaciones: string
  equipo: { tipo: string; marca: string; serial: string }
  tecnico: { nombre: string } | null
  mantenimiento: { tipo: string } | null
}

export function filasDeHistorialExcel(hist: HistorialDeBase[]) {
  return hist.map((h) => ({
    fecha: fecha(h.fecha, "dd/MM/yyyy HH:mm")!,
    equipo: `${h.equipo.tipo} - ${h.equipo.marca} (${h.equipo.serial})`,
    tipoMantenimiento: h.mantenimiento?.tipo || "-",
    tecnico: h.tecnico?.nombre || "-",
    observaciones: h.observaciones,
  }))
}

export function filasDeHistorialPDF(hist: HistorialDeBase[]) {
  return hist.map((h) => ({
    fecha: fecha(h.fecha, "dd/MM/yyyy HH:mm")!,
    equipo: `${h.equipo.tipo} - ${h.equipo.marca}`,
    tipoMantenimiento: h.mantenimiento?.tipo || "-",
    tecnico: h.tecnico?.nombre || "-",
    observaciones: h.observaciones,
  }))
}

/**
 * Añade al libro la hoja que declara qué recoge el archivo.
 *
 * Sin ella, un archivo recortado por cualquier motivo no se distingue de uno
 * completo: es justo el defecto que motivó el cambio.
 */
export function anotarAlcanceExcel(workbook: WorkBook, alcance: AlcanceDelArchivo) {
  const filas: [string, string][] = [
    ["Generado", format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })],
    ["Elementos incluidos", String(alcance.total)],
    ["Filtros aplicados", alcance.filtros.length ? alcance.filtros.join("; ") : "Ninguno"],
  ]
  if (alcance.acotadoPorRol) filas.push(["Alcance", alcance.acotadoPorRol])
  if (alcance.total === 0) {
    filas.push(["Aviso", "Ningún elemento cumple los filtros aplicados"])
  }

  const hoja = XLSX.utils.aoa_to_sheet([["Dato", "Valor"], ...filas])
  hoja["!cols"] = [{ wch: 24 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(workbook, hoja, "Alcance")
  return workbook
}

/** Las mismas líneas, para el pie del PDF. */
export function lineasDeAlcance(alcance: AlcanceDelArchivo): string[] {
  const l = [
    `Elementos incluidos: ${alcance.total}`,
    `Filtros aplicados: ${alcance.filtros.length ? alcance.filtros.join("; ") : "Ninguno"}`,
  ]
  if (alcance.acotadoPorRol) l.push(alcance.acotadoPorRol)
  if (alcance.total === 0) l.push("Ningún elemento cumple los filtros aplicados")
  return l
}

const NOMBRE_SEGURO = /[^a-zA-Z0-9_-]/g

function nombreDeArchivo(base: string, extension: string) {
  const marca = format(new Date(), "yyyy-MM-dd_HHmm")
  return `${base.replace(NOMBRE_SEGURO, "")}_${marca}.${extension}`
}

export function respuestaExcel(workbook: WorkBook, base: string): Response {
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreDeArchivo(base, "xlsx")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}

export function respuestaPDF(
  doc: { output: (t: "arraybuffer") => ArrayBuffer },
  base: string
): Response {
  return new Response(new Uint8Array(doc.output("arraybuffer")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreDeArchivo(base, "pdf")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}

/** Formatos que las rutas de descarga admiten. */
export type FormatoExportacion = "excel" | "pdf"

export function leerFormato(valor: string | null): FormatoExportacion | null {
  if (valor === "excel" || valor === "pdf") return valor
  return null
}

/** Etiquetas legibles de los filtros que traía la petición. */
const ETIQUETA_FILTRO: Record<string, string> = {
  estado: "Estado",
  tipo: "Tipo",
  tecnicoId: "Técnico",
  empresaId: "Empresa",
  equipoId: "Equipo",
  search: "Búsqueda",
  fechaDesde: "Desde",
  fechaHasta: "Hasta",
}

/**
 * Describe en texto los filtros aplicados, para que el archivo pueda decir qué
 * recoge. Un archivo que no lo declara no se distingue de uno que perdió parte
 * del contenido por el camino.
 */
export function descripcionDeFiltros(searchParams: URLSearchParams): string[] {
  const fuera = new Set(["formato", "desde", "hasta", "page", "limit"])
  const salida: string[] = []
  for (const [clave, valor] of searchParams.entries()) {
    if (fuera.has(clave) || !valor || valor === "all") continue
    salida.push(`${ETIQUETA_FILTRO[clave] ?? clave}: ${valor}`)
  }
  return salida
}
