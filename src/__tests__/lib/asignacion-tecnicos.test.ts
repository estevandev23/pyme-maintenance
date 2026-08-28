import {
  candidatosEmpatados,
  seleccionarTecnico,
  type CandidatoTecnico,
} from "@/lib/asignacion-tecnicos"

const candidato = (
  id: string,
  cargaAbierta: number,
  cargaHistorica: number
): CandidatoTecnico => ({ id, cargaAbierta, cargaHistorica })

describe("seleccionarTecnico", () => {
  it("devuelve null cuando no hay candidatos", () => {
    expect(seleccionarTecnico([])).toBeNull()
  })

  it("elige al candidato con menor carga abierta", () => {
    const candidatos = [
      candidato("a", 2, 5),
      candidato("b", 0, 9),
      candidato("c", 1, 0),
    ]

    expect(seleccionarTecnico(candidatos)?.id).toBe("b")
  })

  it("rompe el empate en carga abierta con la carga histórica", () => {
    const candidatos = [candidato("a", 1, 3), candidato("b", 1, 1)]

    expect(seleccionarTecnico(candidatos)?.id).toBe("b")
  })

  it("elige al único candidato cuando la empresa solo tiene uno", () => {
    expect(seleccionarTecnico([candidato("solo", 7, 12)])?.id).toBe("solo")
  })

  it("no considera la carga histórica cuando la abierta ya decide", () => {
    const candidatos = [candidato("a", 0, 40), candidato("b", 3, 0)]

    expect(seleccionarTecnico(candidatos)?.id).toBe("a")
  })

  describe("empate total", () => {
    const empatados = [candidato("a", 0, 0), candidato("b", 0, 0), candidato("c", 0, 0)]

    it("solo considera a los candidatos empatados", () => {
      const candidatos = [...empatados, candidato("cargado", 4, 4)]
      const elegidos = new Set<string>()

      for (let i = 0; i < 200; i++) {
        const elegido = seleccionarTecnico(candidatos)
        expect(elegido).not.toBeNull()
        elegidos.add(elegido!.id)
      }

      expect([...elegidos].sort()).toEqual(["a", "b", "c"])
    })

    it("no devuelve siempre el mismo técnico", () => {
      const elegidos = new Set(
        Array.from({ length: 200 }, () => seleccionarTecnico(empatados)!.id)
      )

      expect(elegidos.size).toBeGreaterThan(1)
    })
  })
})

describe("candidatosEmpatados", () => {
  it("devuelve una lista vacía sin candidatos", () => {
    expect(candidatosEmpatados([])).toEqual([])
  })

  it("agrupa a todos los que comparten ambos contadores mínimos", () => {
    const candidatos = [
      candidato("a", 1, 2),
      candidato("b", 1, 2),
      candidato("c", 1, 3),
      candidato("d", 2, 0),
    ]

    expect(candidatosEmpatados(candidatos).map((c) => c.id)).toEqual(["a", "b"])
  })
})
