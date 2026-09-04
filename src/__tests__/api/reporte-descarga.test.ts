/**
 * @jest-environment node
 *
 * La descarga del reporte aplica el mismo alcance que la lectura del
 * mantenimiento, y no una copia de sus condiciones: para cada rol, las dos
 * rutas tienen que decir lo mismo. Prisma va doblado para que corra siempre; el
 * archivo es real, en un directorio temporal, para afirmar sobre lo que se
 * entrega y cómo.
 */

import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { GET as descargar } from "@/app/api/mantenimientos/[id]/reporte/route"
import { GET as leerMantenimiento } from "@/app/api/mantenimientos/[id]/route"
import { guardarReporte } from "@/lib/reportes.server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const sesion = getServerSession as jest.Mock
const buscar = prisma.mantenimiento.findUnique as jest.Mock

const PDF = Buffer.from("%PDF-1.4\n%prueba\n%%EOF\n")

/**
 * Sirve a las dos rutas: la lectura mira `equipo.empresa.id` y la descarga
 * `equipo.empresaId`. Es la misma empresa vista por dos consultas distintas.
 */
const MANTENIMIENTO = {
  id: "mant-1",
  tecnicoId: "tec-1",
  estado: "PROGRAMADO",
  reporteUrl: "/api/mantenimientos/mant-1/reporte",
  equipo: { empresaId: "em-1", empresa: { id: "em-1" } },
}

const ADMIN = { user: { id: "adm-1", role: "ADMIN", empresaId: null } }

const CASOS = [
  { nombre: "sin sesión", sesion: null, alcance: false },
  { nombre: "administrador", sesion: ADMIN, alcance: true },
  {
    nombre: "técnico con el trabajo asignado",
    sesion: { user: { id: "tec-1", role: "TECNICO", empresaId: "em-1" } },
    alcance: true,
  },
  {
    nombre: "técnico sin él",
    sesion: { user: { id: "tec-OTRO", role: "TECNICO", empresaId: "em-1" } },
    alcance: false,
  },
  {
    nombre: "cliente de la empresa del equipo",
    sesion: { user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" } },
    alcance: true,
  },
  {
    nombre: "cliente de otra empresa",
    sesion: { user: { id: "cli-9", role: "CLIENTE", empresaId: "em-OTRA" } },
    alcance: false,
  },
]

const contexto = (id: string) => ({ params: Promise.resolve({ id }) })
const peticion = () => ({}) as never

let directorio: string

beforeAll(async () => {
  directorio = mkdtempSync(path.join(tmpdir(), "reportes-descarga-"))
  process.env.REPORTES_DIR = directorio
  await guardarReporte("mant-1", PDF)
})

afterAll(() => {
  delete process.env.REPORTES_DIR
  rmSync(directorio, { recursive: true, force: true })
})

beforeEach(() => {
  jest.clearAllMocks()
  buscar.mockResolvedValue(MANTENIMIENTO)
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe("los seis casos de alcance", () => {
  it.each(CASOS)("$nombre", async ({ sesion: quien, alcance }) => {
    sesion.mockResolvedValue(quien)

    const respuesta = await descargar(peticion(), contexto("mant-1"))

    if (alcance) {
      expect(respuesta.status).toBe(200)
      expect(Buffer.from(await respuesta.arrayBuffer())).toEqual(PDF)
    } else {
      expect(respuesta.status).toBe(quien ? 403 : 401)
      expect(respuesta.headers.get("content-type")).not.toBe("application/pdf")
    }
  })
})

describe("la descarga y la lectura del mantenimiento coinciden", () => {
  it.each(CASOS)("$nombre", async ({ sesion: quien }) => {
    sesion.mockResolvedValue(quien)

    const lectura = await leerMantenimiento(peticion(), contexto("mant-1"))
    const descarga = await descargar(peticion(), contexto("mant-1"))

    expect(descarga.status === 200).toBe(lectura.status === 200)
  })
})

describe("cómo se entrega", () => {
  it("como archivo para guardar, con el tipo fijado por el sistema y sin reinterpretar", async () => {
    sesion.mockResolvedValue(ADMIN)

    const respuesta = await descargar(peticion(), contexto("mant-1"))

    expect(respuesta.headers.get("content-type")).toBe("application/pdf")
    expect(respuesta.headers.get("content-disposition")).toBe(
      'attachment; filename="reporte-mant-1.pdf"'
    )
    expect(respuesta.headers.get("x-content-type-options")).toBe("nosniff")
    expect(respuesta.headers.get("cache-control")).toContain("no-store")
  })
})

describe("un reporte ausente se distingue de un fallo", () => {
  it("con alcance y sin reporte: una ausencia que se dice, no un error", async () => {
    sesion.mockResolvedValue(ADMIN)
    buscar.mockResolvedValue({ ...MANTENIMIENTO, reporteUrl: null })

    const respuesta = await descargar(peticion(), contexto("mant-1"))

    expect(respuesta.status).toBe(404)
    expect(await respuesta.json()).toMatchObject({ sinReporte: true })
    expect(console.error).not.toHaveBeenCalled()
  })

  it("el registro dice que hay reporte y el disco dice que no: eso sí es un fallo", async () => {
    sesion.mockResolvedValue(ADMIN)
    buscar.mockResolvedValue({ ...MANTENIMIENTO, id: "mant-sin-archivo" })

    const respuesta = await descargar(peticion(), contexto("mant-sin-archivo"))

    expect(respuesta.status).toBe(500)
    expect(await respuesta.json()).not.toMatchObject({ sinReporte: true })
  })

  it("un mantenimiento inexistente no se confunde con uno sin reporte", async () => {
    sesion.mockResolvedValue(ADMIN)
    buscar.mockResolvedValue(null)

    const respuesta = await descargar(peticion(), contexto("mant-9"))

    expect(respuesta.status).toBe(404)
    expect(await respuesta.json()).not.toMatchObject({ sinReporte: true })
  })

  it("sin alcance, la respuesta es la misma haya reporte o no", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-9", role: "CLIENTE", empresaId: "em-OTRA" },
    })

    const conReporte = await descargar(peticion(), contexto("mant-1"))
    buscar.mockResolvedValue({ ...MANTENIMIENTO, reporteUrl: null })
    const sinReporte = await descargar(peticion(), contexto("mant-1"))

    expect(conReporte.status).toBe(403)
    expect(sinReporte.status).toBe(403)
    expect(await conReporte.json()).toEqual(await sinReporte.json())
  })
})
