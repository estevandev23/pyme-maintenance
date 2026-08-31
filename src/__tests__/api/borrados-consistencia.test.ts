/**
 * @jest-environment node
 *
 * Consistencia al eliminar, ahora que la solicitud y el mantenimiento están
 * enlazados.
 *
 * Tres agujeros que este cambio abre o agrava:
 * - Borrar una solicitud con mantenimiento choca contra la clave foránea, y sin
 *   comprobación previa el administrador recibiría un 500 opaco.
 * - Borrar el mantenimiento dejaba la solicitud aprobada y sin enlace, sin
 *   forma de repararla, y el equipo atascado en mantenimiento.
 * - Borrar un equipo o un cliente con solicitudes: el primero las arrastraba en
 *   cascada sin avisar y el segundo reventaba contra la base.
 */

import { DELETE as borrarSolicitud } from "@/app/api/solicitudes/[id]/route"
import { DELETE as borrarMantenimiento } from "@/app/api/mantenimientos/[id]/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    solicitudServicio: { findUnique: jest.fn(), delete: jest.fn() },
    mantenimiento: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock("@/lib/estado-equipo.server", () => ({
  sincronizarEstadoEquipo: jest.fn().mockResolvedValue(undefined),
}))

const { sincronizarEstadoEquipo } = jest.requireMock("@/lib/estado-equipo.server")

const sesion = getServerSession as jest.Mock
const buscarSolicitud = prisma.solicitudServicio.findUnique as jest.Mock
const borrarFilaSolicitud = prisma.solicitudServicio.delete as jest.Mock
const buscarMantenimiento = prisma.mantenimiento.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = () => ({}) as never
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe("no se puede eliminar una solicitud con mantenimiento", () => {
  it("se rechaza con una explicación, no con un error interno", async () => {
    buscarSolicitud.mockResolvedValue({
      id: "sol-1",
      mantenimiento: { id: "mant-1" },
    })

    const respuesta = await borrarSolicitud(peticion(), contexto("sol-1"))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(409)
    expect(cuerpo.error).toMatch(/mantenimiento/i)
    expect(borrarFilaSolicitud).not.toHaveBeenCalled()
  })

  it("señala qué mantenimiento hay que eliminar primero", async () => {
    buscarSolicitud.mockResolvedValue({
      id: "sol-1",
      mantenimiento: { id: "mant-1" },
    })

    const respuesta = await borrarSolicitud(peticion(), contexto("sol-1"))
    const cuerpo = await respuesta.json()

    expect(cuerpo.details.mantenimientoId).toBe("mant-1")
  })

  it("sin mantenimiento sí se elimina", async () => {
    buscarSolicitud.mockResolvedValue({ id: "sol-1", mantenimiento: null })
    borrarFilaSolicitud.mockResolvedValue({})

    const respuesta = await borrarSolicitud(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(200)
    expect(borrarFilaSolicitud).toHaveBeenCalled()
  })
})

describe("eliminar el mantenimiento repara la solicitud", () => {
  /** Registra lo que la transacción escribe. */
  function montarTransaccion() {
    const escrituras: { solicitud?: Record<string, unknown>; borrado?: boolean } = {}

    transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        mantenimiento: {
          delete: async () => {
            escrituras.borrado = true
            return {}
          },
        },
        solicitudServicio: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            escrituras.solicitud = data
            return {}
          },
        },
      }
      return fn(tx as never)
    })

    return escrituras
  }

  it("devuelve la solicitud a pendiente", async () => {
    buscarMantenimiento.mockResolvedValue({
      id: "mant-1",
      equipoId: "eq-1",
      solicitudId: "sol-1",
    })
    const escrituras = montarTransaccion()

    const respuesta = await borrarMantenimiento(peticion(), contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    expect(escrituras.borrado).toBe(true)
    expect(escrituras.solicitud).toMatchObject({ estado: "PENDIENTE" })
  })

  it("recalcula el estado del equipo para que no quede atascado", async () => {
    buscarMantenimiento.mockResolvedValue({
      id: "mant-1",
      equipoId: "eq-1",
      solicitudId: "sol-1",
    })
    montarTransaccion()

    await borrarMantenimiento(peticion(), contexto("mant-1"))

    expect(sincronizarEstadoEquipo).toHaveBeenCalledWith(expect.anything(), "eq-1")
  })

  it("un mantenimiento sin origen no toca ninguna solicitud", async () => {
    buscarMantenimiento.mockResolvedValue({
      id: "mant-2",
      equipoId: "eq-1",
      solicitudId: null,
    })
    const escrituras = montarTransaccion()

    await borrarMantenimiento(peticion(), contexto("mant-2"))

    expect(escrituras.borrado).toBe(true)
    expect(escrituras.solicitud).toBeUndefined()
  })
})
