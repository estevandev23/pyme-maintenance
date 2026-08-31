/**
 * @jest-environment node
 *
 * La ruta de usuarios tiene un atajo para `role=TECNICO` que sirve a los
 * desplegables de los formularios: permite pedir los técnicos asignables sin ser
 * administrador, y devuelve un array pelado en lugar de la forma paginada.
 *
 * La pantalla de administración de usuarios sí pide paginación, y al filtrar por
 * técnico caía en ese atajo: recibía el array, leía `result.data` —que era
 * `undefined`— y la tabla reventaba al mirar su longitud.
 *
 * Es un defecto anterior a este cambio; se arregla aquí porque salió al probar.
 */

import { GET } from "@/app/api/usuarios/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn(), count: jest.fn() },
    mantenimiento: { groupBy: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const buscarUsuarios = prisma.user.findMany as jest.Mock
const contarUsuarios = prisma.user.count as jest.Mock
const agrupar = prisma.mantenimiento.groupBy as jest.Mock

const peticion = (query: string) =>
  ({ url: `http://localhost:3200/api/usuarios${query}` }) as never

const TECNICO = {
  id: "tec-1",
  email: "tecnico1@mantenpro.example",
  nombre: "Pedro Ramírez",
  role: "TECNICO",
  empresaId: "em-1",
}

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
  buscarUsuarios.mockResolvedValue([TECNICO])
  contarUsuarios.mockResolvedValue(1)
  agrupar.mockResolvedValue([])
})

describe("el atajo de los desplegables", () => {
  it("sin paginación devuelve un array pelado con la carga de cada técnico", async () => {
    const respuesta = await GET(peticion("?role=TECNICO"))
    const cuerpo = await respuesta.json()

    expect(Array.isArray(cuerpo)).toBe(true)
    expect(cuerpo[0]).toMatchObject({ id: "tec-1", cargaAbierta: 0 })
  })

  it("lo puede usar un cliente: es para los formularios", async () => {
    sesion.mockResolvedValue({ user: { id: "cli-1", role: "CLIENTE" } })

    const respuesta = await GET(peticion("?role=TECNICO"))

    expect(respuesta.status).toBe(200)
  })
})

describe("el listado de administración", () => {
  it("filtrar por técnico devuelve la forma paginada, no un array", async () => {
    const respuesta = await GET(peticion("?role=TECNICO&page=1&limit=10"))
    const cuerpo = await respuesta.json()

    // Esto es lo que la pantalla lee. Antes llegaba `undefined` y la tabla
    // reventaba al mirar su longitud.
    expect(Array.isArray(cuerpo.data)).toBe(true)
    expect(cuerpo.data).toHaveLength(1)
    expect(cuerpo).toHaveProperty("total")
    expect(cuerpo).toHaveProperty("totalPages")
  })

  it("filtrar por otro rol sigue devolviendo la forma paginada", async () => {
    const respuesta = await GET(peticion("?role=CLIENTE&page=1&limit=10"))
    const cuerpo = await respuesta.json()

    expect(Array.isArray(cuerpo.data)).toBe(true)
  })

  it("el listado paginado sigue siendo solo para el administrador", async () => {
    sesion.mockResolvedValue({ user: { id: "cli-1", role: "CLIENTE" } })

    const respuesta = await GET(peticion("?role=TECNICO&page=1&limit=10"))

    expect(respuesta.status).toBe(403)
  })
})
