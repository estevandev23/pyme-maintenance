/**
 * El archivo y el panel tienen que contar lo mismo.
 *
 * El panel decide con `fechaReferencia` + `dentroDelRango`, en memoria. La
 * descarga lo decide en la consulta, con dos ramas de SQL. Son dos expresiones
 * del mismo criterio, y si divergen el mismo mes daría dos cifras según dónde se
 * mire — que es justo lo que `reportes-estadisticas` prohíbe.
 *
 * Esta prueba las compara sobre los mismos datos, incluidos los bordes.
 */

import { filtroPorFechaReferencia } from "@/lib/filtros-listado.server"
import { dentroDelRango, fechaReferencia, type RangoFechas } from "@/lib/estadisticas"

const RANGO: RangoFechas = {
  desde: new Date("2026-04-01T00:00:00.000Z"),
  hasta: new Date("2026-09-30T23:59:59.999Z"),
}

type Mant = { fechaProgramada: Date; fechaRealizada: Date | null }

/**
 * Evalúa a mano el `where` que se manda a la base, para poder compararlo con el
 * criterio del panel sin necesitar una base de datos.
 */
function cumpleElFiltro(m: Mant, rango: RangoFechas): boolean {
  const filtro = filtroPorFechaReferencia(rango)
  const ramas = filtro.OR as Array<Record<string, unknown>>

  const enRango = (f: Date | null, cond: { gte: Date; lte: Date }) =>
    f !== null && f >= cond.gte && f <= cond.lte

  // Rama 1: tiene fecha realizada y cae dentro.
  const r1 = ramas[0] as { fechaRealizada: { gte: Date; lte: Date } }
  if (enRango(m.fechaRealizada, r1.fechaRealizada)) return true

  // Rama 2: no tiene realizada, y la programada cae dentro.
  const r2 = ramas[1] as {
    fechaRealizada: null
    fechaProgramada: { gte: Date; lte: Date }
  }
  if (m.fechaRealizada === null && enRango(m.fechaProgramada, r2.fechaProgramada)) {
    return true
  }

  return false
}

const CASOS: Array<{ nombre: string; m: Mant }> = [
  {
    nombre: "realizado dentro del rango",
    m: { fechaProgramada: new Date("2026-03-01"), fechaRealizada: new Date("2026-05-10") },
  },
  {
    nombre: "programado en marzo y realizado en abril: cuenta en abril",
    m: { fechaProgramada: new Date("2026-03-20"), fechaRealizada: new Date("2026-04-02") },
  },
  {
    nombre: "realizado fuera, aunque estuviera programado dentro",
    m: { fechaProgramada: new Date("2026-05-01"), fechaRealizada: new Date("2026-12-01") },
  },
  {
    nombre: "pendiente programado dentro",
    m: { fechaProgramada: new Date("2026-06-15"), fechaRealizada: null },
  },
  {
    nombre: "pendiente programado fuera",
    m: { fechaProgramada: new Date("2026-01-15"), fechaRealizada: null },
  },
  {
    nombre: "pendiente justo en el primer instante del rango",
    m: { fechaProgramada: new Date("2026-04-01T00:00:00.000Z"), fechaRealizada: null },
  },
  {
    nombre: "pendiente justo en el último instante del rango",
    m: { fechaProgramada: new Date("2026-09-30T23:59:59.999Z"), fechaRealizada: null },
  },
  {
    nombre: "pendiente un milisegundo antes del rango",
    m: { fechaProgramada: new Date("2026-03-31T23:59:59.999Z"), fechaRealizada: null },
  },
  {
    nombre: "realizado un milisegundo después del rango",
    m: { fechaProgramada: new Date("2026-05-01"), fechaRealizada: new Date("2026-10-01T00:00:00.000Z") },
  },
]

describe("el criterio de la descarga coincide con el del panel", () => {
  it.each(CASOS)("$nombre", ({ m }) => {
    const segunElPanel = dentroDelRango(fechaReferencia(m), RANGO)
    const segunLaDescarga = cumpleElFiltro(m, RANGO)
    expect(segunLaDescarga).toBe(segunElPanel)
  })

  it("un pendiente entra por su fecha programada", () => {
    const m = { fechaProgramada: new Date("2026-06-15"), fechaRealizada: null }
    expect(cumpleElFiltro(m, RANGO)).toBe(true)
  })

  it("no se cuenta dos veces el que tiene ambas fechas dentro", () => {
    // Las dos ramas son excluyentes: la segunda exige `fechaRealizada: null`.
    const filtro = filtroPorFechaReferencia(RANGO)
    const ramas = filtro.OR as Array<Record<string, unknown>>
    expect(ramas[1].fechaRealizada).toBeNull()
  })
})
