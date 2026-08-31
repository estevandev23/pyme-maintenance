/**
 * @jest-environment node
 *
 * El aviso al cliente es el primer envío «lo intento y sigo» del proyecto, y la
 * parte que importa no es que salga: es que su fallo no deshaga nada ni se
 * presente como un fallo de la operación.
 *
 * Los dos envíos que ya existían no sirven de patrón. `forgot-password` escribe
 * y luego responde error si el envío falla —el cliente vería «error al crear la
 * solicitud» con la solicitud ya creada, y reintentaría duplicando el ticket—;
 * `contact` responde error, pero ahí el correo ES la operación.
 */

import { avisarSolicitudAtendida } from "@/lib/avisar-solicitud.server"
import { sendSolicitudRecibidaEmail } from "@/lib/email"

const enviar = sendSolicitudRecibidaEmail as jest.Mock

const AVISO = {
  clienteNombre: "Carlos Mendoza",
  clienteEmail: "cliente1@techsolutions.example",
  descripcion: "El equipo no enciende",
  equipo: {
    tipo: "Servidor",
    marca: "Lenovo",
    modelo: "M-1",
    serial: "SN-1",
  },
  fechaProgramada: new Date("2026-09-02"),
  tecnicoNombre: "Ana García",
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "error").mockImplementation(() => {})
  jest.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe("el aviso al cliente", () => {
  it("se envía con el técnico cuando lo hay", async () => {
    const salio = await avisarSolicitudAtendida(AVISO)

    expect(salio).toBe(true)
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ tecnicoNombre: "Ana García" })
    )
  })

  it("se envía advirtiendo la ausencia cuando no hay técnico", async () => {
    const salio = await avisarSolicitudAtendida({ ...AVISO, tecnicoNombre: null })

    expect(salio).toBe(true)
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ tecnicoNombre: null })
    )
  })

  it("lleva el detalle, el equipo y la fecha programada", async () => {
    await avisarSolicitudAtendida(AVISO)

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: "El equipo no enciende",
        fechaProgramada: AVISO.fechaProgramada,
        equipo: expect.objectContaining({ serial: "SN-1" }),
      })
    )
  })
})

describe("un fallo del envío no puede tumbar la operación", () => {
  it("no lanza cuando el servicio de correo falla", async () => {
    enviar.mockRejectedValueOnce(new Error("SMTP caído"))

    await expect(avisarSolicitudAtendida(AVISO)).resolves.toBe(false)
  })

  it("no lanza cuando el envío agota el tiempo", async () => {
    enviar.mockRejectedValueOnce(new Error("Greeting never received"))

    await expect(avisarSolicitudAtendida(AVISO)).resolves.toBe(false)
  })

  it("deja el fallo registrado para poder diagnosticarlo", async () => {
    enviar.mockRejectedValueOnce(new Error("SMTP caído"))

    await avisarSolicitudAtendida(AVISO)

    expect(console.error).toHaveBeenCalled()
  })

  it("no intenta enviar a un cliente sin correo", async () => {
    const salio = await avisarSolicitudAtendida({ ...AVISO, clienteEmail: "" })

    expect(salio).toBe(false)
    expect(enviar).not.toHaveBeenCalled()
  })
})
