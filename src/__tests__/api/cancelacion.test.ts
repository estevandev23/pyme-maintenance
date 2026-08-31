/**
 * @jest-environment node
 *
 * La cancelación tiene tres entradas —el cliente desde su solicitud, el técnico
 * desde su diálogo de estado y el administrador— y las tres tienen que dejar el
 * sistema igual: mantenimiento cancelado, solicitud cancelada, motivo y autor
 * guardados en ambos lados, asiento de historial y equipo recalculado.
 *
 * El motivo se guarda también en la solicitud, no solo en el mantenimiento,
 * porque la solicitud es el registro del cliente y le sobrevive: si más adelante
 * se elimina el mantenimiento, una solicitud cancelada perdería la explicación.
 */

import { PUT as putSolicitud } from "@/app/api/solicitudes/[id]/route"
import { PUT as putMantenimiento } from "@/app/api/mantenimientos/[id]/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { MOTIVO_CANCELACION_REQUERIDO } from "@/lib/validations/mantenimiento"
import { MOTIVO_TRABAJO_EMPEZADO } from "@/lib/cancelacion-solicitud"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    solicitudServicio: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    mantenimiento: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock("@/lib/cancelar.server", () => ({
  cancelarMantenimiento: jest.fn().mockResolvedValue(undefined),
}))

const { cancelarMantenimiento } = jest.requireMock("@/lib/cancelar.server")

const sesion = getServerSession as jest.Mock
const buscarSolicitud = prisma.solicitudServicio.findUnique as jest.Mock
const releerSolicitud = prisma.solicitudServicio.findUniqueOrThrow as jest.Mock
const buscarMantenimiento = prisma.mantenimiento.findUnique as jest.Mock
const releerMantenimiento = prisma.mantenimiento.findUniqueOrThrow as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

const MOTIVO = "El equipo se reemplazó por uno nuevo"

const SOLICITUD = {
  id: "sol-1",
  clienteId: "cli-1",
  equipoId: "eq-1",
  estado: "APROBADA",
  mantenimiento: { id: "mant-1", estado: "PROGRAMADO" },
}

const MANTENIMIENTO = {
  id: "mant-1",
  equipoId: "eq-1",
  solicitudId: "sol-1",
  tecnicoId: "tec-1",
  estado: "PROGRAMADO",
  equipo: { id: "eq-1", empresaId: "em-1" },
}

beforeEach(() => {
  jest.clearAllMocks()
  transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}))
  releerSolicitud.mockResolvedValue({ id: "sol-1", estado: "CANCELADA" })
  releerMantenimiento.mockResolvedValue({ id: "mant-1", estado: "CANCELADO" })
})

describe("el cliente cancela su solicitud", () => {
  beforeEach(() => {
    sesion.mockResolvedValue({ user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" } })
  })

  it("cancela cuando el mantenimiento sigue programado", async () => {
    buscarSolicitud.mockResolvedValue(SOLICITUD)

    const respuesta = await putSolicitud(
      peticion({ motivoCancelacion: MOTIVO }),
      contexto("sol-1")
    )

    expect(respuesta.status).toBe(200)
    expect(cancelarMantenimiento).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mantenimientoId: "mant-1",
        solicitudId: "sol-1",
        motivo: MOTIVO,
        autorId: "cli-1",
        autorRol: "CLIENTE",
      })
    )
  })

  it("no cancela si el técnico ya empezó", async () => {
    buscarSolicitud.mockResolvedValue({
      ...SOLICITUD,
      mantenimiento: { id: "mant-1", estado: "EN_PROCESO" },
    })

    const respuesta = await putSolicitud(
      peticion({ motivoCancelacion: MOTIVO }),
      contexto("sol-1")
    )
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(409)
    expect(cuerpo.error).toBe(MOTIVO_TRABAJO_EMPEZADO)
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })

  it("no cancela un trabajo ya completado", async () => {
    buscarSolicitud.mockResolvedValue({
      ...SOLICITUD,
      mantenimiento: { id: "mant-1", estado: "COMPLETADO" },
    })

    const respuesta = await putSolicitud(
      peticion({ motivoCancelacion: MOTIVO }),
      contexto("sol-1")
    )

    expect(respuesta.status).toBe(409)
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })

  it("exige el motivo, y lo dice", async () => {
    buscarSolicitud.mockResolvedValue(SOLICITUD)

    const respuesta = await putSolicitud(peticion({}), contexto("sol-1"))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(400)
    expect(cuerpo.error).toBe(MOTIVO_CANCELACION_REQUERIDO)
    expect(cuerpo.campos).toContain("motivoCancelacion")
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })

  it("un motivo en blanco no vale", async () => {
    buscarSolicitud.mockResolvedValue(SOLICITUD)

    const respuesta = await putSolicitud(
      peticion({ motivoCancelacion: "   " }),
      contexto("sol-1")
    )

    expect(respuesta.status).toBe(400)
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })

  it("no cancela solicitudes ajenas", async () => {
    buscarSolicitud.mockResolvedValue({ ...SOLICITUD, clienteId: "OTRO" })

    const respuesta = await putSolicitud(
      peticion({ motivoCancelacion: MOTIVO }),
      contexto("sol-1")
    )

    expect(respuesta.status).toBe(403)
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })
})

describe("el técnico cancela desde su diálogo de estado", () => {
  beforeEach(() => {
    sesion.mockResolvedValue({ user: { id: "tec-1", role: "TECNICO" } })
    buscarMantenimiento.mockResolvedValue(MANTENIMIENTO)
  })

  it("cancela con motivo y queda registrado como suyo", async () => {
    const respuesta = await putMantenimiento(
      peticion({ estado: "CANCELADO", motivoCancelacion: MOTIVO }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(cancelarMantenimiento).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autorRol: "TECNICO", autorId: "tec-1", motivo: MOTIVO })
    )
  })

  it("sin motivo no cancela", async () => {
    const respuesta = await putMantenimiento(
      peticion({ estado: "CANCELADO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(400)
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })

  it("propaga a la solicitud de origen", async () => {
    await putMantenimiento(
      peticion({ estado: "CANCELADO", motivoCancelacion: MOTIVO }),
      contexto("mant-1")
    )

    expect(cancelarMantenimiento).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ solicitudId: "sol-1" })
    )
  })

  it("un mantenimiento sin origen no arrastra ninguna solicitud", async () => {
    buscarMantenimiento.mockResolvedValue({ ...MANTENIMIENTO, solicitudId: null })

    await putMantenimiento(
      peticion({ estado: "CANCELADO", motivoCancelacion: MOTIVO }),
      contexto("mant-1")
    )

    expect(cancelarMantenimiento).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ solicitudId: null })
    )
  })
})

describe("el administrador cancela", () => {
  beforeEach(() => {
    sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
    buscarMantenimiento.mockResolvedValue(MANTENIMIENTO)
  })

  it("cancela con motivo y queda registrado como suyo", async () => {
    const respuesta = await putMantenimiento(
      peticion({ estado: "CANCELADO", motivoCancelacion: MOTIVO }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(cancelarMantenimiento).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autorRol: "ADMIN", autorId: "adm-1" })
    )
  })

  it("sin motivo no cancela, y la validación lo dice", async () => {
    const respuesta = await putMantenimiento(
      peticion({ estado: "CANCELADO" }),
      contexto("mant-1")
    )
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(400)
    expect(cuerpo.error).toBe(MOTIVO_CANCELACION_REQUERIDO)
    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })

  it("cancelar no reescribe la descripción ni las fechas", async () => {
    await putMantenimiento(
      peticion({
        estado: "CANCELADO",
        motivoCancelacion: MOTIVO,
        descripcion: "esto no debería aplicarse",
      }),
      contexto("mant-1")
    )

    // La cancelación va por su propio camino: solo toca los campos de
    // cancelación, no el resto del formulario.
    const datos = cancelarMantenimiento.mock.calls[0][1]
    expect(datos).not.toHaveProperty("descripcion")
  })

  it("cancelar dos veces no vuelve a cancelar", async () => {
    buscarMantenimiento.mockResolvedValue({ ...MANTENIMIENTO, estado: "CANCELADO" })

    await putMantenimiento(
      peticion({ estado: "CANCELADO", motivoCancelacion: MOTIVO }),
      contexto("mant-1")
    )

    expect(cancelarMantenimiento).not.toHaveBeenCalled()
  })
})
