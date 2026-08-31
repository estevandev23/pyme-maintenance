/**
 * @jest-environment node
 *
 * El administrador puede crear el mantenimiento de una solicitud que se quedó
 * sin él: las anteriores al cambio, y las que vuelven a quedar pendientes
 * porque se eliminó el suyo.
 *
 * La puerta es el ESTADO de la solicitud y no la ausencia de enlace. Es la
 * distinción que evita reintroducir el defecto de los duplicados: bajo el flujo
 * anterior, aprobar dejaba la solicitud en APROBADA y el mantenimiento se creaba
 * sin referencia a ella, así que todas las aprobadas históricas parecen
 * huérfanas aunque su trabajo exista.
 */

import { POST } from "@/app/api/solicitudes/[id]/mantenimiento/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    solicitudServicio: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock("@/lib/crear-mantenimiento.server", () => ({
  crearMantenimientoDeSolicitud: jest.fn(),
}))

const { crearMantenimientoDeSolicitud } = jest.requireMock(
  "@/lib/crear-mantenimiento.server"
)

const sesion = getServerSession as jest.Mock
const buscar = prisma.solicitudServicio.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = () => ({}) as never
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

const SOLICITUD_PENDIENTE = {
  id: "sol-1",
  estado: "PENDIENTE",
  descripcion: "El equipo no enciende",
  equipoId: "eq-1",
  equipo: {
    id: "eq-1",
    empresaId: "em-1",
    tipo: "Servidor",
    marca: "Lenovo",
    modelo: "M-1",
    serial: "SN-1",
  },
  cliente: { nombre: "Carlos Mendoza", email: "cliente1@techsolutions.example" },
  mantenimiento: null,
}

/** Captura lo que la transacción escribe sobre la solicitud. */
function montarTransaccion(tecnicoId: string | null = "tec-1") {
  const escrituras: { solicitud?: Record<string, unknown> } = {}

  crearMantenimientoDeSolicitud.mockResolvedValue({
    id: "mant-nuevo",
    tecnicoId,
    tecnicoNombre: tecnicoId ? "Ana García" : null,
    tecnicoEmail: tecnicoId ? "ana@mantenpro.example" : null,
    fechaProgramada: new Date("2026-09-01"),
  })

  transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
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

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
  // Los casos de error registran en consola a propósito; se silencia para que
  // la salida de la suite no parezca un fallo.
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("el administrador crea el mantenimiento de una solicitud pendiente", () => {
  it("lo crea y deja la solicitud aprobada", async () => {
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    const escrituras = montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(201)
    expect(escrituras.solicitud).toMatchObject({ estado: "APROBADA" })
  })

  it("reutiliza la función compartida con los datos de la solicitud", async () => {
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    montarTransaccion()

    await POST(peticion(), contexto("sol-1"))

    expect(crearMantenimientoDeSolicitud).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        solicitudId: "sol-1",
        equipoId: "eq-1",
        empresaId: "em-1",
        descripcion: "El equipo no enciende",
        actorId: "adm-1",
      })
    )
  })

  it("también funciona sobre una solicitud en revisión", async () => {
    buscar.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "EN_REVISION" })
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(201)
  })

  it("avisa cuando la empresa sigue sin técnicos", async () => {
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    montarTransaccion(null)

    const respuesta = await POST(peticion(), contexto("sol-1"))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(201)
    expect(cuerpo.avisoSinTecnico).toMatch(/técnico/i)
  })
})

describe("la acción no procede", () => {
  it("rechaza una solicitud que ya tiene mantenimiento", async () => {
    buscar.mockResolvedValue({
      ...SOLICITUD_PENDIENTE,
      mantenimiento: { id: "mant-existente" },
    })
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(409)
    expect(cuerpo.error).toMatch(/ya tiene un mantenimiento/i)
    expect(crearMantenimientoDeSolicitud).not.toHaveBeenCalled()
  })

  it("rechaza una solicitud APROBADA, aunque no tenga enlace", async () => {
    // Este es el caso que protege de duplicar el trabajo de las solicitudes
    // anteriores al cambio: su mantenimiento existe, pero sin referencia.
    buscar.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "APROBADA" })
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(409)
    expect(crearMantenimientoDeSolicitud).not.toHaveBeenCalled()
  })

  it("rechaza una solicitud rechazada", async () => {
    buscar.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "RECHAZADA" })
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(409)
    expect(crearMantenimientoDeSolicitud).not.toHaveBeenCalled()
  })

  it("rechaza una solicitud cancelada", async () => {
    buscar.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "CANCELADA" })
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(409)
    expect(crearMantenimientoDeSolicitud).not.toHaveBeenCalled()
  })

  it("un cliente no dispone de la acción", async () => {
    sesion.mockResolvedValue({ user: { id: "cli-1", role: "CLIENTE" } })
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(403)
    expect(crearMantenimientoDeSolicitud).not.toHaveBeenCalled()
  })

  it("un técnico tampoco", async () => {
    sesion.mockResolvedValue({ user: { id: "tec-1", role: "TECNICO" } })
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(403)
  })

  it("una solicitud inexistente da 404", async () => {
    buscar.mockResolvedValue(null)
    montarTransaccion()

    const respuesta = await POST(peticion(), contexto("sol-inexistente"))

    expect(respuesta.status).toBe(404)
  })
})

describe("dos intentos simultáneos", () => {
  it("el conflicto de unicidad se traduce a un mensaje explicable, no a un 500", async () => {
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    montarTransaccion()

    // La segunda petición supera la comprobación previa —todavía no hay
    // enlace— y choca contra el índice único al escribir.
    transaccion.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      })
    )

    const respuesta = await POST(peticion(), contexto("sol-1"))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(409)
    expect(cuerpo.error).toMatch(/ya tiene un mantenimiento/i)
  })

  it("un fallo cualquiera sí es un 500", async () => {
    buscar.mockResolvedValue(SOLICITUD_PENDIENTE)
    montarTransaccion()
    transaccion.mockRejectedValue(new Error("la base se cayó"))

    const respuesta = await POST(peticion(), contexto("sol-1"))

    expect(respuesta.status).toBe(500)
  })
})
