/**
 * Reglas de cuándo se puede cancelar una solicitud y quién carga con el
 * descuento de la cancelación.
 *
 * Vive en una función pura, y no repetida en la interfaz y en el servidor,
 * porque la condición hace falta en tres sitios: la tabla de solicitudes para
 * decidir si ofrece la opción, la ruta de solicitudes para hacerla cumplir, y
 * el cálculo de carga para decidir si la cancelación descuenta.
 *
 * Sigue el molde de `decidirCambioDeEquipo` en `edicion-mantenimiento.ts`.
 */

import type { DecisionEdicion } from "@/lib/edicion-mantenimiento"

/** Estados en los que puede estar un mantenimiento. */
export type EstadoMantenimientoConocido =
  | "PROGRAMADO"
  | "EN_PROCESO"
  | "COMPLETADO"
  | "CANCELADO"

/** Quién ejecuta una cancelación. Decide si descuenta carga al técnico. */
export type AutorCancelacionConocido = "CLIENTE" | "TECNICO" | "ADMIN"

export const MOTIVO_SIN_MANTENIMIENTO =
  "Esta solicitud todavía no tiene un mantenimiento que cancelar."

export const MOTIVO_TRABAJO_EMPEZADO =
  "El técnico ya empezó a trabajar en este mantenimiento, así que la solicitud " +
  "ya no se puede cancelar. Contacte al administrador si necesita detenerlo."

export const MOTIVO_TRABAJO_TERMINADO =
  "Este mantenimiento ya está completado, así que la solicitud no se puede cancelar."

export const MOTIVO_YA_CANCELADO = "Esta solicitud ya está cancelada."

/**
 * Decide si el cliente puede cancelar su solicitud, a partir del estado del
 * mantenimiento asociado.
 *
 * La puerta es el estado del mantenimiento, no el de la solicitud: con la
 * creación automática ninguna solicitud llega a estar pendiente, así que la
 * condición anterior —«solo si está PENDIENTE»— quedaba inalcanzable.
 */
export function decidirCancelacionCliente(
  estadoMantenimiento: EstadoMantenimientoConocido | null | undefined
): DecisionEdicion {
  if (!estadoMantenimiento) {
    return { permitida: false, motivo: MOTIVO_SIN_MANTENIMIENTO }
  }

  switch (estadoMantenimiento) {
    case "PROGRAMADO":
      return { permitida: true }
    case "EN_PROCESO":
      return { permitida: false, motivo: MOTIVO_TRABAJO_EMPEZADO }
    case "COMPLETADO":
      return { permitida: false, motivo: MOTIVO_TRABAJO_TERMINADO }
    case "CANCELADO":
      return { permitida: false, motivo: MOTIVO_YA_CANCELADO }
  }
}

/**
 * Decide si una cancelación descuenta carga histórica al técnico que tenía
 * asignado el mantenimiento.
 *
 * Descuenta cuando canceló otro: el técnico no llegó a hacer el trabajo y debe
 * volver a competir por el siguiente reparto en las mismas condiciones.
 *
 * No descuenta cuando canceló él mismo, y el motivo es concreto: el desempate
 * del reparto elige el conjunto de candidatos que igualan al mejor en ambos
 * contadores y sortea entre ellos. Quien vuelve a cero es el mínimo estricto y
 * el conjunto es de uno, así que no hay sorteo. Descontar siempre convertiría
 * cancelar el trabajo propio en la forma de garantizarse el siguiente.
 */
export function laCancelacionDescuentaCarga(
  autor: AutorCancelacionConocido | null | undefined
): boolean {
  return autor === "CLIENTE" || autor === "ADMIN"
}
