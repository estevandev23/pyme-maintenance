/**
 * Regla de reparto de mantenimientos entre técnicos.
 *
 * Este módulo es deliberadamente puro: no consulta la base de datos ni importa
 * Prisma. Recibe los candidatos con sus contadores ya calculados y decide.
 */

export interface CandidatoTecnico {
  id: string
  nombre?: string
  /** Mantenimientos en estado PROGRAMADO o EN_PROCESO asignados al técnico. */
  cargaAbierta: number
  /**
   * Mantenimientos asignados al técnico en cualquier estado, salvo los que
   * canceló otra persona: esos no llegó a hacerlos y no deben penalizarle en el
   * desempate. Su propia cancelación sí cuenta.
   */
  cargaHistorica: number
}

/**
 * Devuelve los candidatos con la menor carga según el orden en cascada
 * (carga abierta ASC, carga histórica ASC). Puede devolver más de uno cuando
 * hay empate en ambos contadores.
 */
export function candidatosEmpatados<T extends CandidatoTecnico>(candidatos: T[]): T[] {
  if (candidatos.length === 0) return []

  const mejor = candidatos.reduce((actual, candidato) => {
    if (candidato.cargaAbierta !== actual.cargaAbierta) {
      return candidato.cargaAbierta < actual.cargaAbierta ? candidato : actual
    }
    return candidato.cargaHistorica < actual.cargaHistorica ? candidato : actual
  })

  return candidatos.filter(
    (candidato) =>
      candidato.cargaAbierta === mejor.cargaAbierta &&
      candidato.cargaHistorica === mejor.cargaHistorica
  )
}

/**
 * Elige el técnico que debe recibir el mantenimiento: el de menor carga
 * abierta; ante empate, el de menor carga histórica; si el empate persiste,
 * uno cualquiera de los empatados al azar.
 *
 * Devuelve `null` cuando no hay candidatos.
 */
export function seleccionarTecnico<T extends CandidatoTecnico>(candidatos: T[]): T | null {
  const empatados = candidatosEmpatados(candidatos)

  if (empatados.length === 0) return null

  return empatados[Math.floor(Math.random() * empatados.length)]
}
