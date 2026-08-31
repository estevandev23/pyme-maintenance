/**
 * Traduce un error de validación a un mensaje que el usuario pueda leer.
 *
 * Los manejadores devolvían `{ error: "Datos inválidos", details: error }`, y
 * `details` viajaba siempre como un objeto vacío porque serializar un `Error`
 * no conserva sus propiedades. El usuario veía solo el texto genérico, sin
 * saber qué campo faltaba.
 *
 * Importa ahora porque este cambio introduce un campo obligatorio condicional
 * —el motivo al cancelar— y el mensaje del refinamiento tiene que llegar.
 */

interface ProblemaDeValidacion {
  path?: Array<string | number>
  message?: string
}

interface ErrorConProblemas {
  issues?: ProblemaDeValidacion[]
}

/** `true` si el error viene de zod. */
export function esErrorDeValidacion(error: unknown): boolean {
  return error instanceof Error && error.name === "ZodError"
}

/**
 * Mensaje legible a partir de un error de zod: el del primer problema, que es
 * el que el usuario tiene que resolver primero. Si no se puede extraer, cae en
 * el texto genérico de siempre.
 */
export function mensajeDeValidacion(error: unknown): string {
  const problemas = (error as ErrorConProblemas)?.issues

  if (!Array.isArray(problemas) || problemas.length === 0) {
    return "Datos inválidos"
  }

  const primero = problemas[0]
  return primero.message?.trim() || "Datos inválidos"
}

/** Lista de campos con problema, para que la interfaz pueda señalarlos. */
export function camposConProblema(error: unknown): string[] {
  const problemas = (error as ErrorConProblemas)?.issues

  if (!Array.isArray(problemas)) return []

  return problemas
    .map((problema) => (problema.path ?? []).join("."))
    .filter((campo) => campo.length > 0)
}
