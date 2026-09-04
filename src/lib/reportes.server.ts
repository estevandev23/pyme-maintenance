/**
 * Custodia del reporte PDF de un mantenimiento.
 *
 * Toda lectura y escritura del archivo pasa por aquí, a propósito. Guardar en
 * disco descansa en que el despliegue conserve el directorio entre reinicios;
 * si eso deja de ser cierto —un alojamiento sin disco persistente, varias
 * instancias sin disco compartido—, lo que hay que sustituir es este módulo y
 * nada más: la comprobación de alcance, el nombrado y la entrega siguen
 * valiendo igual.
 *
 * El directorio es privado: no cuelga de `public/`, así que ninguna ruta
 * estática lo expone. Antes los reportes se escribían en `public/uploads/`, y
 * cualquiera con sesión —de cualquier rol y empresa— abría el de cualquier
 * mantenimiento con solo conocer la dirección.
 */

import { mkdir, readFile, rm, writeFile } from "fs/promises"
import path from "path"

/** Tamaño máximo admitido: el mismo que aplicaba la ruta anterior. */
export const MAX_TAMANO_REPORTE = 5 * 1024 * 1024

/** Tipo con el que se entrega; lo fija el sistema, nunca quien pide. */
export const TIPO_REPORTE = "application/pdf"

export const MENSAJE_FORMATO = "El archivo no es un PDF"
export const MENSAJE_TAMANO = "El archivo excede el tamaño máximo de 5MB"

/** Cabecera con la que empieza todo PDF. */
const CABECERA_PDF = Buffer.from("%PDF-")

/** Un identificador de mantenimiento es un cuid: nada que pueda ser una ruta. */
const ID_VALIDO = /^[A-Za-z0-9_-]+$/

/**
 * Directorio donde viven los reportes. Se puede mover con `REPORTES_DIR`; por
 * defecto, `almacen/reportes` bajo la raíz del proyecto, fuera de `public/`.
 */
export function directorioDeReportes(): string {
  return (
    process.env.REPORTES_DIR ?? path.join(process.cwd(), "almacen", "reportes")
  )
}

/**
 * Ruta en disco del reporte de un mantenimiento.
 *
 * Solo depende del identificador: el nombre original del archivo no interviene
 * nunca, así que no puede señalar a otra ubicación, y un mantenimiento tiene
 * como mucho un reporte, que sustituir sobrescribe.
 */
export function rutaDeReporte(mantenimientoId: string): string {
  if (!ID_VALIDO.test(mantenimientoId)) {
    throw new Error("Identificador de mantenimiento inválido")
  }
  return path.join(directorioDeReportes(), `${mantenimientoId}.pdf`)
}

/** Dirección de descarga que se guarda en `Mantenimiento.reporteUrl`. */
export function urlDeReporte(mantenimientoId: string): string {
  return `/api/mantenimientos/${mantenimientoId}/reporte`
}

/** Nombre con el que se ofrece guardar el archivo. */
export function nombreDeDescarga(mantenimientoId: string): string {
  return `reporte-${mantenimientoId}.pdf`
}

/** Mira el contenido, no el tipo declarado: ese lo pone quien envía. */
export function esPdf(contenido: Buffer): boolean {
  return (
    contenido.length >= CABECERA_PDF.length &&
    contenido.subarray(0, CABECERA_PDF.length).equals(CABECERA_PDF)
  )
}

export interface RechazoDeReporte {
  motivo: "tamano" | "formato"
  mensaje: string
}

/** Devuelve el motivo del rechazo, o `null` si el archivo se admite. */
export function validarReporte(contenido: Buffer): RechazoDeReporte | null {
  if (contenido.length > MAX_TAMANO_REPORTE) {
    return { motivo: "tamano", mensaje: MENSAJE_TAMANO }
  }
  if (!esPdf(contenido)) {
    return { motivo: "formato", mensaje: MENSAJE_FORMATO }
  }
  return null
}

export async function guardarReporte(
  mantenimientoId: string,
  contenido: Buffer
): Promise<void> {
  const ruta = rutaDeReporte(mantenimientoId)
  await mkdir(path.dirname(ruta), { recursive: true })
  await writeFile(ruta, contenido)
}

/** `null` cuando no hay archivo; cualquier otro fallo se propaga. */
export async function leerReporte(
  mantenimientoId: string
): Promise<Buffer | null> {
  try {
    return await readFile(rutaDeReporte(mantenimientoId))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

/** Idempotente: no falla si el archivo ya no estaba. */
export async function eliminarReporte(mantenimientoId: string): Promise<void> {
  await rm(rutaDeReporte(mantenimientoId), { force: true })
}
