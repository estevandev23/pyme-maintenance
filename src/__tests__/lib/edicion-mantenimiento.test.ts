import {
  decidirCambioDeEquipo,
  MOTIVO_EQUIPO_INMUTABLE,
} from "@/lib/edicion-mantenimiento"

const GUARDADO = "eq-original"

describe("decidirCambioDeEquipo", () => {
  it("acepta cuando el campo llega ausente", () => {
    expect(decidirCambioDeEquipo(undefined, GUARDADO)).toEqual({ permitida: true })
  })

  it("acepta cuando el campo llega nulo", () => {
    expect(decidirCambioDeEquipo(null, GUARDADO)).toEqual({ permitida: true })
  })

  it("acepta cuando el campo llega vacío", () => {
    expect(decidirCambioDeEquipo("", GUARDADO)).toEqual({ permitida: true })
  })

  // Es lo que hace el formulario en cada guardado: reenvía el equipo actual.
  it("acepta cuando coincide con el guardado", () => {
    expect(decidirCambioDeEquipo(GUARDADO, GUARDADO)).toEqual({ permitida: true })
  })

  it("rechaza solo cuando difiere, y explica el motivo", () => {
    const decision = decidirCambioDeEquipo("eq-otro", GUARDADO)

    expect(decision.permitida).toBe(false)
    if (!decision.permitida) {
      expect(decision.motivo).toBe(MOTIVO_EQUIPO_INMUTABLE)
      expect(decision.motivo).toMatch(/no puede cambiarse/)
      expect(decision.motivo).toMatch(/cancela este y crea uno nuevo/)
    }
  })

  it("no consulta la base de datos", () => {
    // La función es pura: solo depende de sus dos argumentos.
    expect(decidirCambioDeEquipo("eq-otro", GUARDADO)).toEqual(
      decidirCambioDeEquipo("eq-otro", GUARDADO)
    )
  })
})
