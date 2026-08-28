/**
 * Utilidades puras para el informe de estadísticas.
 *
 * No dependen de Prisma ni del navegador, así que las comparten el endpoint de
 * estadísticas, el panel y las funciones de exportación. Que el rango y la serie
 * mensual se calculen en un solo sitio es lo que mantiene cuadrados los totales
 * de pantalla y archivo.
 */

export interface RangoFechas {
  desde: Date
  hasta: Date
}

/** El rango tal como viaja en JSON (fechas ISO `YYYY-MM-DD`). */
export interface RangoFechasISO {
  desde: string
  hasta: string
}

export interface PuntoMensual {
  mes: string
  preventivo: number
  correctivo: number
  total: number
}

/** Cantidad de meses completos que abarca el rango por defecto. */
export const MESES_POR_DEFECTO = 6

export function claveMes(fecha: Date): string {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}`
}

export function inicioDelDia(fecha: Date): Date {
  const copia = new Date(fecha)
  copia.setHours(0, 0, 0, 0)
  return copia
}

export function finDelDia(fecha: Date): Date {
  const copia = new Date(fecha)
  copia.setHours(23, 59, 59, 999)
  return copia
}

export function inicioDelMes(fecha: Date): Date {
  return inicioDelDia(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
}

export function finDelMes(fecha: Date): Date {
  return finDelDia(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0))
}

/**
 * Los últimos `MESES_POR_DEFECTO` meses completos, incluido el mes en curso.
 * Es la ventana que el panel ya usaba para su gráfico.
 */
export function rangoPorDefecto(hoy: Date = new Date()): RangoFechas {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_POR_DEFECTO - 1), 1)
  return { desde: inicioDelMes(inicio), hasta: finDelMes(hoy) }
}

export type ResultadoRango =
  | { ok: true; rango: RangoFechas }
  | { ok: false; error: string }

/**
 * Interpreta `YYYY-MM-DD` como fecha local, no UTC.
 *
 * `new Date("2026-03-01")` da la medianoche UTC, que en un huso negativo cae el
 * 28 de febrero: el rango arrancaría un día antes y la serie mensual ganaría un
 * mes fantasma. El usuario elige días en su calendario, no instantes UTC.
 */
function parsearFechaLocal(raw: string): Date {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)

  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha
    return new Date(Number(anio), Number(mes) - 1, Number(dia))
  }

  return new Date(raw)
}

/**
 * Interpreta los parámetros `desde`/`hasta`. Si no llega ninguno aplica el rango
 * por defecto; si llega uno solo, completa el otro con el del rango por defecto.
 */
export function parsearRango(
  desdeRaw: string | null,
  hastaRaw: string | null,
  hoy: Date = new Date()
): ResultadoRango {
  const porDefecto = rangoPorDefecto(hoy)

  if (!desdeRaw && !hastaRaw) {
    return { ok: true, rango: porDefecto }
  }

  const desde = desdeRaw ? parsearFechaLocal(desdeRaw) : porDefecto.desde
  const hasta = hastaRaw ? parsearFechaLocal(hastaRaw) : porDefecto.hasta

  if (Number.isNaN(desde.getTime())) {
    return { ok: false, error: "La fecha de inicio no es una fecha válida." }
  }

  if (Number.isNaN(hasta.getTime())) {
    return { ok: false, error: "La fecha de fin no es una fecha válida." }
  }

  const inicio = inicioDelDia(desde)
  const fin = finDelDia(hasta)

  if (inicio.getTime() > fin.getTime()) {
    return {
      ok: false,
      error: "La fecha de inicio no puede ser posterior a la fecha de fin.",
    }
  }

  return { ok: true, rango: { desde: inicio, hasta: fin } }
}

export function rangoAISO(rango: RangoFechas): RangoFechasISO {
  return {
    desde: formatoISO(rango.desde),
    hasta: formatoISO(rango.hasta),
  }
}

function formatoISO(fecha: Date): string {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0")
  const dia = `${fecha.getDate()}`.padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/**
 * Todos los meses que toca el rango, incluidos los que no tienen actividad.
 * Sin esto la serie se saltaría los meses vacíos y el desglose mentiría.
 */
export function mesesDelRango(rango: RangoFechas): string[] {
  const meses: string[] = []
  const cursor = new Date(rango.desde.getFullYear(), rango.desde.getMonth(), 1)
  const ultimo = new Date(rango.hasta.getFullYear(), rango.hasta.getMonth(), 1)

  while (cursor.getTime() <= ultimo.getTime()) {
    meses.push(claveMes(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return meses
}

/**
 * Fecha de referencia de un mantenimiento: la realizada si existe, y si no la
 * programada. Es el único criterio con el que se acota el informe, para que un
 * trabajo no cuente en dos meses distintos según el indicador que se mire.
 */
export function fechaReferencia(mantenimiento: {
  fechaProgramada: Date
  fechaRealizada: Date | null
}): Date {
  return mantenimiento.fechaRealizada ?? mantenimiento.fechaProgramada
}

export function dentroDelRango(fecha: Date, rango: RangoFechas): boolean {
  const momento = fecha.getTime()
  return momento >= rango.desde.getTime() && momento <= rango.hasta.getTime()
}

/**
 * El periodo inmediatamente anterior, de la misma duración. Sirve para los
 * comparativos porcentuales, que antes iban contra "el mes pasado" fijo.
 */
export function periodoAnterior(rango: RangoFechas): RangoFechas {
  const duracion = rango.hasta.getTime() - rango.desde.getTime()
  const hasta = new Date(rango.desde.getTime() - 1)
  const desde = new Date(hasta.getTime() - duracion)
  return { desde, hasta }
}

/** Construye la serie mensual completa a partir de los mantenimientos del rango. */
export function serieMensual(
  rango: RangoFechas,
  mantenimientos: Array<{
    tipo: string
    fechaProgramada: Date
    fechaRealizada: Date | null
  }>
): PuntoMensual[] {
  const serie = new Map<string, PuntoMensual>()

  for (const mes of mesesDelRango(rango)) {
    serie.set(mes, { mes, preventivo: 0, correctivo: 0, total: 0 })
  }

  for (const mantenimiento of mantenimientos) {
    const punto = serie.get(claveMes(fechaReferencia(mantenimiento)))
    if (!punto) continue

    if (mantenimiento.tipo === "PREVENTIVO") punto.preventivo += 1
    else if (mantenimiento.tipo === "CORRECTIVO") punto.correctivo += 1
    punto.total += 1
  }

  return Array.from(serie.values()).sort((a, b) => a.mes.localeCompare(b.mes))
}

export function cambioPorcentual(actual: number, anterior: number): number {
  if (anterior > 0) {
    return Math.round(((actual - anterior) / anterior) * 100)
  }
  return actual > 0 ? 100 : 0
}

export interface FallaRecurrente {
  equipoId: string
  cantidadFallas: number
  equipo: {
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    empresa: string
  } | null
}

/**
 * `fechaProgramada` llega como texto porque el informe viaja en JSON; se
 * convierte a `Date` en el borde donde haga falta.
 */
export interface ProximoMantenimiento {
  id: string
  tipo: string
  estado: string
  fechaProgramada: string
  equipo: {
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    empresa: { nombre: string }
  }
  tecnico: { nombre: string }
}

/**
 * Todo lo que el informe muestra. Es el contrato único entre el endpoint, el
 * panel y las dos funciones de exportación: agregar un indicador aquí obliga a
 * decidir cómo se exporta, en vez de dejarlo fuera del archivo por descuido.
 */
export interface EstadisticasInforme {
  rango: RangoFechasISO
  totalEquipos: number
  equiposPorEstado: Record<string, number>
  equiposCriticos: number
  totalMantenimientos: number
  mantenimientosPorEstado: Record<string, number>
  mantenimientosPorTipo: Record<string, number>
  completadosPeriodo: number
  cambioCompletados: number
  mantenimientosPendientes: number
  cambioPendientes: number
  desviacionPromedioProgramacion: number
  fallasRecurrentes: FallaRecurrente[]
  mantenimientosPorMes: PuntoMensual[]
  proximosMantenimientos: ProximoMantenimiento[]
}

export interface PartesDesviacion {
  /** Siempre positiva: el signo lo comunica `sentido`. */
  magnitud: number
  /** "día" o "días", concordando con la magnitud. */
  unidad: string
  /** "de adelanto", "de retraso" o el caso sin desviación. */
  sentido: string
}

/**
 * Descompone la desviación respecto a la fecha programada en sus partes.
 *
 * Un valor negativo es un adelanto, no un tiempo negativo. Se devuelven por
 * separado para que quien las presente decida el tratamiento de cada una: la
 * tarjeta del panel las compone con tipografías distintas, y los archivos
 * exportados las unen en una frase.
 */
export function partesDesviacion(dias: number): PartesDesviacion {
  const magnitud = Math.abs(dias)
  const unidad = magnitud === 1 ? "día" : "días"

  if (dias === 0) {
    return { magnitud: 0, unidad, sentido: "En la fecha programada" }
  }

  return {
    magnitud,
    unidad,
    sentido: dias > 0 ? "de retraso" : "de adelanto",
  }
}

/**
 * La desviación como una sola frase. La usan los archivos exportados, donde no
 * hay tipografías que distingan las partes.
 */
export function etiquetaDesviacion(dias: number): string {
  const { magnitud, unidad, sentido } = partesDesviacion(dias)
  if (dias === 0) return sentido
  return `${magnitud} ${unidad} ${sentido}`
}

/** Rango legible fuera de la aplicación, para encabezados de archivos. */
export function etiquetaRango(rango: RangoFechasISO): string {
  return `${rango.desde} a ${rango.hasta}`
}
