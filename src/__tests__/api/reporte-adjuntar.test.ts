/**
 * @jest-environment node
 *
 * Adjuntar el reporte exige poder editar el mantenimiento, y el archivo se
 * admite por su contenido. Prisma va doblado a propósito: son decisiones del
 * servidor y tienen que comprobarse siempre, no solo cuando hay base. El disco
 * sí es real, sobre un directorio temporal: lo que se afirma es qué queda
 * escrito y qué no.
 */

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { DELETE, POST } from "@/app/api/mantenimientos/[id]/reporte/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const buscar = prisma.mantenimiento.findUnique as jest.Mock
const actualizar = prisma.mantenimiento.update as jest.Mock

const PDF = Buffer.from("%PDF-1.4\n%prueba\n%%EOF\n")
const URL_DESCARGA = "/api/mantenimientos/mant-1/reporte"

const MANTENIMIENTO = {
  id: "mant-1",
  tecnicoId: "tec-1",
  estado: "PROGRAMADO",
  reporteUrl: null,
  equipo: { empresaId: "em-1" },
}

const ADMIN = { user: { id: "adm-1", role: "ADMIN", empresaId: null } }
const TECNICO = { user: { id: "tec-1", role: "TECNICO", empresaId: "em-1" } }
const CLIENTE = { user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" } }

/** Petición multiparte con un archivo. El tipo declarado lo pone quien envía. */
function peticionConArchivo(
  contenido: Buffer | string,
  nombre = "reporte.pdf",
  tipo = "application/pdf"
) {
  const formData = new FormData()
  const bytes = typeof contenido === "string" ? contenido : new Uint8Array(contenido)
  formData.append("file", new File([bytes], nombre, { type: tipo }))
  return { formData: async () => formData } as never
}

const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

let directorio: string

const archivosEnDisco = () => readdirSync(directorio)

beforeAll(() => {
  directorio = mkdtempSync(path.join(tmpdir(), "reportes-api-"))
  process.env.REPORTES_DIR = directorio
})

afterAll(() => {
  delete process.env.REPORTES_DIR
  rmSync(directorio, { recursive: true, force: true })
})

beforeEach(() => {
  jest.clearAllMocks()
  buscar.mockResolvedValue(MANTENIMIENTO)
  actualizar.mockResolvedValue({})
  jest.spyOn(console, "error").mockImplementation(() => {})
  for (const nombre of archivosEnDisco()) {
    rmSync(path.join(directorio, nombre), { force: true })
  }
})

afterEach(() => jest.restoreAllMocks())

describe("quién puede adjuntar", () => {
  it("sin sesión no se pasa de la puerta y nada llega al disco", async () => {
    sesion.mockResolvedValue(null)

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(respuesta.status).toBe(401)
    expect(archivosEnDisco()).toEqual([])
  })

  it("el administrador adjunta y el mantenimiento queda enlazado a la descarga", async () => {
    sesion.mockResolvedValue(ADMIN)

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    expect(await respuesta.json()).toEqual({ success: true, url: URL_DESCARGA })
    expect(actualizar).toHaveBeenCalledWith({
      where: { id: "mant-1" },
      data: { reporteUrl: URL_DESCARGA },
    })
    expect(archivosEnDisco()).toEqual(["mant-1.pdf"])
  })

  it("el técnico adjunta a un trabajo suyo y abierto", async () => {
    sesion.mockResolvedValue(TECNICO)

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    expect(archivosEnDisco()).toEqual(["mant-1.pdf"])
  })

  it("el técnico no adjunta a un trabajo suyo que ya está cerrado", async () => {
    sesion.mockResolvedValue(TECNICO)
    buscar.mockResolvedValue({ ...MANTENIMIENTO, estado: "COMPLETADO" })

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(respuesta.status).toBe(403)
    expect(archivosEnDisco()).toEqual([])
    expect(actualizar).not.toHaveBeenCalled()
  })

  it("el técnico no adjunta a un trabajo ajeno", async () => {
    sesion.mockResolvedValue({
      user: { id: "tec-OTRO", role: "TECNICO", empresaId: "em-1" },
    })

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(respuesta.status).toBe(403)
    expect(archivosEnDisco()).toEqual([])
    expect(actualizar).not.toHaveBeenCalled()
  })

  it("un cliente no adjunta, ni a su empresa ni a otra", async () => {
    sesion.mockResolvedValue(CLIENTE)
    const propia = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    sesion.mockResolvedValue({
      user: { id: "cli-9", role: "CLIENTE", empresaId: "em-OTRA" },
    })
    const ajena = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(propia.status).toBe(403)
    expect(ajena.status).toBe(403)
    expect(archivosEnDisco()).toEqual([])
    expect(actualizar).not.toHaveBeenCalled()
  })

  it("no se adjunta a lo que no existe", async () => {
    sesion.mockResolvedValue(ADMIN)
    buscar.mockResolvedValue(null)

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-9"))

    expect(respuesta.status).toBe(404)
    expect(archivosEnDisco()).toEqual([])
    expect(actualizar).not.toHaveBeenCalled()
  })
})

describe("el archivo se admite por lo que es", () => {
  beforeEach(() => sesion.mockResolvedValue(ADMIN))

  it("un archivo que dice ser PDF y no lo es se rechaza y no se guarda", async () => {
    const respuesta = await POST(
      peticionConArchivo("Esto no es un PDF", "falso.pdf", "application/pdf"),
      contexto("mant-1")
    )
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(400)
    expect(cuerpo.motivo).toBe("formato")
    expect(cuerpo.error).toMatch(/PDF/)
    expect(archivosEnDisco()).toEqual([])
    expect(actualizar).not.toHaveBeenCalled()
  })

  it("un PDF que excede el tamaño se rechaza por tamaño, no por formato", async () => {
    const grande = Buffer.alloc(5 * 1024 * 1024 + 1, "%PDF-")

    const respuesta = await POST(peticionConArchivo(grande), contexto("mant-1"))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(400)
    expect(cuerpo.motivo).toBe("tamano")
    expect(cuerpo.error).toMatch(/tamaño/i)
    expect(archivosEnDisco()).toEqual([])
  })

  it("sin archivo en la petición, 400", async () => {
    const respuesta = await POST(
      { formData: async () => new FormData() } as never,
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(400)
    expect(archivosEnDisco()).toEqual([])
  })
})

describe("el nombre original no decide nada", () => {
  it("un nombre con caracteres de ruta no cambia dónde se escribe", async () => {
    sesion.mockResolvedValue(ADMIN)

    const respuesta = await POST(
      peticionConArchivo(PDF, "../../../fuera-del-directorio.pdf"),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(archivosEnDisco()).toEqual(["mant-1.pdf"])
    expect(
      existsSync(path.join(directorio, "..", "fuera-del-directorio.pdf"))
    ).toBe(false)
  })
})

describe("sustituir y quitar", () => {
  it("adjuntar sobre uno existente deja solo el nuevo", async () => {
    sesion.mockResolvedValue(ADMIN)
    await POST(peticionConArchivo(PDF), contexto("mant-1"))
    buscar.mockResolvedValue({ ...MANTENIMIENTO, reporteUrl: URL_DESCARGA })
    const nuevo = Buffer.from("%PDF-1.7\n%sustituto\n")

    const respuesta = await POST(
      peticionConArchivo(nuevo, "otro nombre.pdf"),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(archivosEnDisco()).toEqual(["mant-1.pdf"])
    expect(readFileSync(path.join(directorio, "mant-1.pdf"))).toEqual(nuevo)
  })

  it("quitar el reporte borra el archivo y vacía el enlace", async () => {
    sesion.mockResolvedValue(ADMIN)
    await POST(peticionConArchivo(PDF), contexto("mant-1"))
    buscar.mockResolvedValue({ ...MANTENIMIENTO, reporteUrl: URL_DESCARGA })

    const respuesta = await DELETE({} as never, contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    expect(actualizar).toHaveBeenLastCalledWith({
      where: { id: "mant-1" },
      data: { reporteUrl: null },
    })
    expect(archivosEnDisco()).toEqual([])
  })

  it("un cliente tampoco puede quitarlo", async () => {
    sesion.mockResolvedValue(CLIENTE)
    buscar.mockResolvedValue({ ...MANTENIMIENTO, reporteUrl: URL_DESCARGA })

    const respuesta = await DELETE({} as never, contexto("mant-1"))

    expect(respuesta.status).toBe(403)
    expect(actualizar).not.toHaveBeenCalled()
  })

  it("si el registro no se puede actualizar en la primera subida, el archivo no se queda", async () => {
    sesion.mockResolvedValue(ADMIN)
    actualizar.mockRejectedValue(new Error("base caída"))

    const respuesta = await POST(peticionConArchivo(PDF), contexto("mant-1"))

    expect(respuesta.status).toBe(500)
    expect(archivosEnDisco()).toEqual([])
  })
})
