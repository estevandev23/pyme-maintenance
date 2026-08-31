/**
 * Comparación de fechas por día natural.
 *
 * El servidor y la tabla de mantenimientos calificaban un mantenimiento con
 * criterios distintos: el servidor comparaba instantes —`fechaProgramada` contra
 * `new Date()` sin normalizar— y la tabla comparaba días. Con la creación
 * automática eso dejaba de ser invisible: el mismo mantenimiento salía en rojo
 * como «atrasado por 0 día(s)» en la pantalla de avisos y en amarillo como
 * «programado para hoy» en el listado, el mismo día.
 *
 * Aquí vive el único criterio, para que ambos lados no puedan volver a
 * separarse.
 */

/** Milisegundos de un día. */
const UN_DIA = 1000 * 60 * 60 * 24

/** Comienzo del día al que pertenece una fecha, en hora local. */
export function comienzoDelDia(fecha: Date | string): Date {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Días naturales entre dos fechas: negativo si la fecha ya pasó, cero si es
 * hoy, positivo si está por venir.
 */
export function diasNaturalesHasta(fecha: Date | string, referencia: Date = new Date()): number {
  const objetivo = comienzoDelDia(fecha)
  const hoy = comienzoDelDia(referencia)
  return Math.round((objetivo.getTime() - hoy.getTime()) / UN_DIA)
}

/**
 * Un mantenimiento va con retraso cuando su día ya pasó. El día en curso no
 * cuenta como retraso: quien tiene el trabajo programado para hoy tiene todo el
 * día para hacerlo.
 */
export function vaConRetraso(fechaProgramada: Date | string, referencia?: Date): boolean {
  return diasNaturalesHasta(fechaProgramada, referencia) < 0
}

/**
 * Comienzo del día de hoy y del último día de la ventana de proximidad, para
 * usarlos en consultas.
 */
export function ventanaDeProximidad(dias: number, referencia: Date = new Date()) {
  const desde = comienzoDelDia(referencia)
  const hasta = comienzoDelDia(referencia)
  hasta.setDate(hasta.getDate() + dias)
  hasta.setHours(23, 59, 59, 999)
  return { desde, hasta }
}

/** Días de la ventana de «próximos a vencer». */
export const DIAS_VENTANA_PROXIMIDAD = 3
