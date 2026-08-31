import {
  decidirCancelacionCliente,
  laCancelacionDescuentaCarga,
  MOTIVO_SIN_MANTENIMIENTO,
  MOTIVO_TRABAJO_EMPEZADO,
  MOTIVO_TRABAJO_TERMINADO,
  MOTIVO_YA_CANCELADO,
} from "@/lib/cancelacion-solicitud"

describe("decidirCancelacionCliente", () => {
  it("permite cancelar mientras el mantenimiento sigue programado", () => {
    expect(decidirCancelacionCliente("PROGRAMADO")).toEqual({ permitida: true })
  })

  it("no permite cancelar cuando el técnico ya empezó", () => {
    expect(decidirCancelacionCliente("EN_PROCESO")).toEqual({
      permitida: false,
      motivo: MOTIVO_TRABAJO_EMPEZADO,
    })
  })

  it("no permite cancelar un trabajo ya completado", () => {
    expect(decidirCancelacionCliente("COMPLETADO")).toEqual({
      permitida: false,
      motivo: MOTIVO_TRABAJO_TERMINADO,
    })
  })

  it("no permite cancelar dos veces", () => {
    expect(decidirCancelacionCliente("CANCELADO")).toEqual({
      permitida: false,
      motivo: MOTIVO_YA_CANCELADO,
    })
  })

  it("no permite cancelar una solicitud que aún no tiene mantenimiento", () => {
    // Es el caso de las solicitudes anteriores al cambio: no hay nada que
    // cancelar, y el administrador tiene que crearles el mantenimiento primero.
    expect(decidirCancelacionCliente(null)).toEqual({
      permitida: false,
      motivo: MOTIVO_SIN_MANTENIMIENTO,
    })
    expect(decidirCancelacionCliente(undefined)).toEqual({
      permitida: false,
      motivo: MOTIVO_SIN_MANTENIMIENTO,
    })
  })

  it("cada rechazo explica el motivo con un texto propio", () => {
    const motivos = (["EN_PROCESO", "COMPLETADO", "CANCELADO"] as const).map((estado) => {
      const decision = decidirCancelacionCliente(estado)
      return decision.permitida ? "" : decision.motivo
    })

    // Ningún motivo vacío y ninguno repetido: el usuario tiene que poder saber
    // por cuál de los tres motivos se le negó.
    expect(motivos.every((m) => m.length > 0)).toBe(true)
    expect(new Set(motivos).size).toBe(3)
  })
})

describe("laCancelacionDescuentaCarga", () => {
  it("descuenta cuando cancela el cliente", () => {
    expect(laCancelacionDescuentaCarga("CLIENTE")).toBe(true)
  })

  it("descuenta cuando cancela el administrador", () => {
    expect(laCancelacionDescuentaCarga("ADMIN")).toBe(true)
  })

  it("NO descuenta cuando cancela el propio técnico", () => {
    // Si descontara, cancelar el trabajo propio devolvería al técnico a (0,0),
    // que en un sistema rodado es el mínimo estricto del reparto: se
    // garantizaría el siguiente mantenimiento sin que nadie lo viera.
    expect(laCancelacionDescuentaCarga("TECNICO")).toBe(false)
  })

  it("no descuenta cuando no consta quién canceló", () => {
    // Los mantenimientos cancelados antes de este cambio no tienen autor.
    // Ante la duda, se conserva el comportamiento anterior: la histórica no se
    // toca, que es lo que decía el spec hasta ahora.
    expect(laCancelacionDescuentaCarga(null)).toBe(false)
    expect(laCancelacionDescuentaCarga(undefined)).toBe(false)
  })
})
