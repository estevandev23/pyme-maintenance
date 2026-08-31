/**
 * Un mantenimiento puede no tener técnico asignado: la empresa del equipo no
 * tenía ninguno activo cuando se creó, o el administrador se lo retiró. No es
 * un estado de error, así que la interfaz y los archivos exportados tienen que
 * decirlo con las mismas palabras en todas partes.
 *
 * Este módulo existe para que esa etiqueta se decida una sola vez. Si cada
 * pantalla escribe la suya, el mismo mantenimiento acaba llamándose «Sin
 * asignar» en una tabla, «-» en un Excel y «Sin técnico» en un detalle.
 */

/** Lo que se muestra donde iría el nombre del técnico cuando no lo hay. */
export const SIN_TECNICO = "Sin asignar"

/**
 * Valor con el que se pide el listado de mantenimientos que esperan técnico.
 *
 * Hace falta un valor propio porque el parámetro de consulta siempre llega como
 * cadena: `?tecnicoId=null` filtraría por el texto literal «null» y devolvería
 * cero filas sin dar ningún error.
 */
export const SIN_ASIGNAR = "sin-asignar"

/** Texto de apoyo, para donde quepa una frase y no solo una etiqueta. */
export const SIN_TECNICO_DETALLE = "Aún no se ha asignado un técnico"

interface ConTecnico {
  tecnico?: { nombre?: string | null } | null
}

/**
 * Nombre del técnico de un mantenimiento, o la etiqueta de ausencia.
 *
 * Acepta cualquier objeto con la forma esperada para poder usarse tanto con el
 * tipo del cliente como con lo que devuelven las consultas.
 */
export function nombreTecnico(mantenimiento: ConTecnico | null | undefined): string {
  const nombre = mantenimiento?.tecnico?.nombre
  return nombre && nombre.trim().length > 0 ? nombre : SIN_TECNICO
}

/** `true` cuando el mantenimiento está a la espera de técnico. */
export function esperaTecnico(mantenimiento: ConTecnico | null | undefined): boolean {
  return !mantenimiento?.tecnico
}
