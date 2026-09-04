/**
 * Qué estados de un mantenimiento cuentan como trabajo abierto.
 *
 * Una sola definición para las reglas que dependen de ella: el estado del
 * equipo, el reparto por carga y quién puede adjuntar el reporte. Había dos
 * copias en dos módulos de servidor; una tercera habría sido la primera en
 * divergir sin que nadie lo notara.
 */
export const ESTADOS_ABIERTOS = ["PROGRAMADO", "EN_PROCESO"] as const

export type EstadoAbierto = (typeof ESTADOS_ABIERTOS)[number]

export function esMantenimientoAbierto(estado: string): estado is EstadoAbierto {
  return (ESTADOS_ABIERTOS as readonly string[]).includes(estado)
}
