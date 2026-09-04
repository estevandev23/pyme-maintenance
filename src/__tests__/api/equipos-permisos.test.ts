/**
 * @jest-environment node
 *
 * El inventario es de la empresa de mantenimiento.
 *
 * Hasta ahora un cliente creaba y editaba equipos, y la interfaz se lo ofrecía.
 * El comentario que encabezaba la comprobación lo decía en voz alta —«Solo admin
 * y cliente pueden crear equipos»—, así que no era un descuido: era un modelo
 * anterior que nadie retiró.
 *
 * Se prueban los **tres** verbos por los **tres** roles, incluido el que ya
 * funcionaba: la eliminación llevaba tiempo restringida y es justo lo que nadie
 * mira al tocar los otros dos. Cada rechazo afirma además que el equipo conserva
 * sus datos, porque una prueba que solo espera un error pasa igual si el error es
 * de permisos que si es de cualquier otra cosa.
 *
 * Se dobla Prisma para que corran siempre. No van en `integracion/`: aquellas
 * suites hacen `return` sin ejercitar nada cuando no encuentran la base.
 */

import { POST as crearEquipo, GET as listarEquipos } from "@/app/api/equipos/route"
import { PUT as editarEquipo, DELETE as borrarEquipo } from "@/app/api/equipos/[id]/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    equipo: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    empresa: { findUnique: jest.fn() },
    mantenimiento: { count: jest.fn() },
    historial: { count: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const equipoDb = prisma.equipo as unknown as Record<string, jest.Mock>

const ADMIN = { user: { id: "adm", role: "ADMIN", empresaId: null } }
const CLIENTE = { user: { id: "cli", role: "CLIENTE", empresaId: "em-1" } }
const TECNICO = { user: { id: "tec", role: "TECNICO", empresaId: "em-1" } }

const EQUIPO_GUARDADO = {
  id: "eq-1",
  tipo: "Laptop",
  marca: "HP",
  modelo: "M-1",
  serial: "SN-1",
  estado: "ACTIVO",
  ubicacion: "Piso 2",
  empresaId: "em-1",
}

const NUEVO = {
  tipo: "Laptop",
  marca: "HP",
  modelo: "M-2",
  serial: "SN-NUEVO",
  estado: "ACTIVO",
  ubicacion: "Piso 3",
  empresaId: "em-1",
}

const peticion = (cuerpo?: unknown, query = "") =>
  ({
    url: `http://localhost:3200/api/equipos?${query}`,
    json: async () => cuerpo,
  }) as never

const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  jest.clearAllMocks()
  equipoDb.findUnique.mockResolvedValue(null)
  equipoDb.findMany.mockResolvedValue([EQUIPO_GUARDADO])
  equipoDb.count.mockResolvedValue(1)
  equipoDb.create.mockImplementation(async ({ data }) => ({ ...EQUIPO_GUARDADO, ...data }))
  equipoDb.update.mockImplementation(async ({ data }) => ({ ...EQUIPO_GUARDADO, ...data }))
  equipoDb.delete.mockResolvedValue(EQUIPO_GUARDADO)
  ;(prisma.empresa.findUnique as jest.Mock).mockResolvedValue({ id: "em-1", nombre: "TechSolutions" })
  ;(prisma.mantenimiento.count as jest.Mock).mockResolvedValue(0)
  ;(prisma.historial.count as jest.Mock).mockResolvedValue(0)
})

describe("solo el administrador da de alta un equipo", () => {
  it("el administrador lo registra", async () => {
    sesion.mockResolvedValue(ADMIN)
    const r = await crearEquipo(peticion(NUEVO))
    expect(r.status).toBe(201)
    expect(equipoDb.create).toHaveBeenCalled()
  })

  it("un cliente no lo registra, y nada se guarda", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const r = await crearEquipo(peticion(NUEVO))
    expect(r.status).toBe(403)
    expect(equipoDb.create).not.toHaveBeenCalled()
  })

  it("un cliente tampoco lo registra para su propia empresa", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const r = await crearEquipo(peticion({ ...NUEVO, empresaId: "em-1" }))
    expect(r.status).toBe(403)
    expect(equipoDb.create).not.toHaveBeenCalled()
  })

  it("un técnico no lo registra", async () => {
    sesion.mockResolvedValue(TECNICO)
    const r = await crearEquipo(peticion(NUEVO))
    expect(r.status).toBe(403)
    expect(equipoDb.create).not.toHaveBeenCalled()
  })

  it("sin sesión tampoco", async () => {
    sesion.mockResolvedValue(null)
    const r = await crearEquipo(peticion(NUEVO))
    expect(r.status).toBe(401)
    expect(equipoDb.create).not.toHaveBeenCalled()
  })
})

describe("solo el administrador modifica un equipo", () => {
  beforeEach(() => equipoDb.findUnique.mockResolvedValue(EQUIPO_GUARDADO))

  it("el administrador lo modifica", async () => {
    sesion.mockResolvedValue(ADMIN)
    const r = await editarEquipo(peticion({ ubicacion: "Piso 9" }), contexto("eq-1"))
    expect(r.status).toBe(200)
    expect(equipoDb.update).toHaveBeenCalled()
  })

  it("un cliente no modifica un equipo de su empresa, y el equipo no cambia", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const r = await editarEquipo(peticion({ ubicacion: "Piso 9" }), contexto("eq-1"))
    expect(r.status).toBe(403)
    expect(equipoDb.update).not.toHaveBeenCalled()
  })

  it("un cliente no cambia el serial, que es la identidad del equipo", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const r = await editarEquipo(peticion({ serial: "OTRO" }), contexto("eq-1"))
    expect(r.status).toBe(403)
    expect(equipoDb.update).not.toHaveBeenCalled()
  })

  it("un cliente no modifica un equipo de otra empresa", async () => {
    sesion.mockResolvedValue(CLIENTE)
    equipoDb.findUnique.mockResolvedValue({ ...EQUIPO_GUARDADO, empresaId: "em-999" })
    const r = await editarEquipo(peticion({ ubicacion: "Piso 9" }), contexto("eq-1"))
    expect(r.status).toBe(403)
    expect(equipoDb.update).not.toHaveBeenCalled()
  })

  it("un técnico no modifica ninguno", async () => {
    sesion.mockResolvedValue(TECNICO)
    const r = await editarEquipo(peticion({ ubicacion: "Piso 9" }), contexto("eq-1"))
    expect(r.status).toBe(403)
    expect(equipoDb.update).not.toHaveBeenCalled()
  })
})

describe("la eliminación sigue siendo del administrador", () => {
  // Ya lo estaba. Se prueba igualmente: es lo que nadie mira al tocar los otros
  // dos verbos, y quedarse sin red es como divergen.
  //
  // El borrado comprueba antes que el equipo no arrastre trabajo ni solicitudes,
  // así que su lectura pide los recuentos.
  beforeEach(() =>
    equipoDb.findUnique.mockResolvedValue({
      ...EQUIPO_GUARDADO,
      _count: { mantenimientos: 0, historial: 0, solicitudes: 0 },
    })
  )

  it("el administrador lo elimina", async () => {
    sesion.mockResolvedValue(ADMIN)
    const r = await borrarEquipo(peticion(), contexto("eq-1"))
    expect([200, 204]).toContain(r.status)
  })

  it("un cliente no lo elimina, y el equipo sigue estando", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const r = await borrarEquipo(peticion(), contexto("eq-1"))
    expect(r.status).toBe(403)
    expect(equipoDb.delete).not.toHaveBeenCalled()
  })

  it("un técnico no lo elimina", async () => {
    sesion.mockResolvedValue(TECNICO)
    const r = await borrarEquipo(peticion(), contexto("eq-1"))
    expect(r.status).toBe(403)
    expect(equipoDb.delete).not.toHaveBeenCalled()
  })
})

describe("un equipo recién registrado no figura en mantenimiento", () => {
  beforeEach(() => sesion.mockResolvedValue(ADMIN))

  it("declararlo en mantenimiento no lo deja así", async () => {
    // El estado de mantenimiento lo determina el trabajo abierto del equipo, y
    // uno recién creado no tiene ninguno. Era la única puerta por la que ese
    // estado se aceptaba a ciegas.
    await crearEquipo(peticion({ ...NUEVO, estado: "EN_MANTENIMIENTO" }))
    expect(equipoDb.create.mock.calls[0][0].data.estado).toBe("ACTIVO")
  })

  it.each(["ACTIVO", "INACTIVO", "DADO_DE_BAJA"])(
    "el estado %s se acepta tal cual",
    async (estado) => {
      await crearEquipo(peticion({ ...NUEVO, estado }))
      expect(equipoDb.create.mock.calls[0][0].data.estado).toBe(estado)
    }
  )
})

describe("lo que el cliente conserva", () => {
  it("sigue viendo los equipos de su empresa", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const r = await listarEquipos(peticion(undefined, "page=1&limit=10"))
    expect(r.status).toBe(200)
    expect(JSON.stringify(equipoDb.findMany.mock.calls[0][0].where)).toContain("em-1")
  })

  it("y solo esos", async () => {
    sesion.mockResolvedValue(CLIENTE)
    await listarEquipos(peticion(undefined, "empresaId=em-999"))
    const where = JSON.stringify(equipoDb.findMany.mock.calls[0][0].where)
    expect(where).toContain("em-1")
  })

  it("un técnico sigue pudiendo consultar", async () => {
    sesion.mockResolvedValue(TECNICO)
    const r = await listarEquipos(peticion(undefined, "page=1&limit=10"))
    expect(r.status).toBe(200)
  })
})
