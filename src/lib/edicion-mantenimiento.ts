/**
 * Reglas de qué se puede cambiar de un mantenimiento ya creado.
 *
 * El equipo queda fijado al crearlo. Mover un mantenimiento entre equipos
 * arrastraría sincronizar el estado de los dos equipos, decidir a qué equipo van
 * las entradas del historial y revalidar el técnico —que pertenece a una sola
 * empresa—, así que se rechaza en lugar de construirse.
 */

export type DecisionEdicion =
  | { permitida: true }
  | { permitida: false; motivo: string }

export const MOTIVO_EQUIPO_INMUTABLE =
  "El equipo de un mantenimiento se fija al crearlo y no puede cambiarse. " +
  "Si el mantenimiento corresponde a otro equipo, cancela este y crea uno " +
  "nuevo sobre el equipo correcto."

/**
 * Decide si una actualización puede seguir adelante en lo que respecta al
 * equipo. Enviar el mismo equipo no es un cambio: es lo que hace el formulario
 * en cada guardado.
 */
export function decidirCambioDeEquipo(
  equipoIdEnviado: string | null | undefined,
  equipoIdGuardado: string
): DecisionEdicion {
  // Campo ausente o vacío: la actualización no habla del equipo.
  if (!equipoIdEnviado) {
    return { permitida: true }
  }

  if (equipoIdEnviado === equipoIdGuardado) {
    return { permitida: true }
  }

  return { permitida: false, motivo: MOTIVO_EQUIPO_INMUTABLE }
}
