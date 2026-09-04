/**
 * @jest-environment node
 *
 * El reporte no sobrevive a su mantenimiento: eliminarlo se lleva el archivo.
 * Antes quedaba en el disco sin nada que lo referenciara. Prisma va doblado
 * para que corra siempre; el archivo es real, en un directorio temporal.
 */

import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { DELETE as borrarMantenimiento } from "@/app/api/mantenimientos/[id]/route"
import { guardarReporte, leerReporte } from "@/lib/reportes.server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock("@/lib/estado-equipo.server", () => ({
  sincronizarEstadoEquipo: jest.fn().mockResolvedValue(undefined),
}))

const sesion = getServerSession as jest.Mock
const buscar = prisma.mantenimiento.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const PDF = Buffer.from("%PDF-1.4\n%prueba\n%%EOF\n")

const contexto = (id: string) => ({ params: Promise.resolve({ id }) })
const peticion = () => ({}) as never

let directorio: string

beforeAll(() => {
  directorio = mkdtempSync(path.join(tmpdir(), "reportes-borrado-"))
  process.env.REPORTES_DIR = directorio
})

afterAll(() => {
  delete process.env.REPORTES_DIR
  rmSync(directorio, { recursive: true, force: true })
})

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

/** Transacción que borra sin protestar. */
function transaccionQueBorra() {
  transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      mantenimiento: { delete: async () => ({}) },
      solicitudServicio: { update: async () => ({}) },
    })
  )
}

describe("eliminar el mantenimiento se lleva el reporte", () => {
  it("tras eliminar, el archivo deja de estar disponible", async () => {
    await guardarReporte("mant-1", PDF)
    buscar.mockResolvedValue({ id: "mant-1", equipoId: "eq-1", solicitudId: null })
    transaccionQueBorra()

    const respuesta = await borrarMantenimiento(peticion(), contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    expect(await leerReporte("mant-1")).toBeNull()
  })

  it("eliminar uno que nunca tuvo reporte no falla por eso", async () => {
    buscar.mockResolvedValue({ id: "mant-2", equipoId: "eq-1", solicitudId: null })
    transaccionQueBorra()

    const respuesta = await borrarMantenimiento(peticion(), contexto("mant-2"))

    expect(respuesta.status).toBe(200)
  })

  it("si el mantenimiento no se pudo borrar, el reporte se queda", async () => {
    await guardarReporte("mant-3", PDF)
    buscar.mockResolvedValue({ id: "mant-3", equipoId: "eq-1", solicitudId: null })
    transaccion.mockRejectedValue(new Error("la base no responde"))

    const respuesta = await borrarMantenimiento(peticion(), contexto("mant-3"))

    expect(respuesta.status).toBe(500)
    expect(await leerReporte("mant-3")).toEqual(PDF)
  })
})
