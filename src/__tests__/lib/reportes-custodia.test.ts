/**
 * @jest-environment node
 *
 * Custodia del reporte: el archivo se nombra por el mantenimiento y por nada
 * más, se admite por su contenido y no por lo que dice ser, y sustituirlo o
 * borrarlo no deja restos. Corre sobre un directorio temporal real: son
 * afirmaciones sobre el disco y no tiene sentido doblarlo.
 */

import { existsSync, mkdtempSync, readdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import {
  MAX_TAMANO_REPORTE,
  MENSAJE_FORMATO,
  MENSAJE_TAMANO,
  directorioDeReportes,
  eliminarReporte,
  esPdf,
  guardarReporte,
  leerReporte,
  rutaDeReporte,
  urlDeReporte,
  validarReporte,
} from "@/lib/reportes.server"

const PDF = Buffer.from("%PDF-1.4\n%contenido de prueba\n%%EOF\n")

let directorio: string

beforeAll(() => {
  directorio = mkdtempSync(path.join(tmpdir(), "reportes-"))
  process.env.REPORTES_DIR = directorio
})

afterAll(() => {
  delete process.env.REPORTES_DIR
  rmSync(directorio, { recursive: true, force: true })
})

describe("el archivo se nombra por el mantenimiento", () => {
  it("la ruta sale del identificador y vive en el directorio privado", () => {
    expect(rutaDeReporte("mant-1")).toBe(path.join(directorio, "mant-1.pdf"))
  })

  it("un identificador con caracteres de ruta se rechaza", () => {
    expect(() => rutaDeReporte("../fuera")).toThrow()
    expect(() => rutaDeReporte("a/b")).toThrow()
    expect(() => rutaDeReporte("a\\b")).toThrow()
    expect(() => rutaDeReporte("")).toThrow()
  })

  it("la dirección de descarga es la ruta del propio mantenimiento", () => {
    expect(urlDeReporte("mant-1")).toBe("/api/mantenimientos/mant-1/reporte")
  })

  it("el directorio por defecto queda fuera de public/", () => {
    delete process.env.REPORTES_DIR
    const porDefecto = directorioDeReportes()
    process.env.REPORTES_DIR = directorio

    expect(porDefecto.startsWith(path.join(process.cwd(), "almacen"))).toBe(true)
    expect(porDefecto.split(path.sep)).not.toContain("public")
  })
})

describe("el archivo se admite por lo que es", () => {
  it("reconoce un PDF por su cabecera", () => {
    expect(esPdf(PDF)).toBe(true)
    expect(esPdf(Buffer.from("Esto es texto plano"))).toBe(false)
    expect(esPdf(Buffer.alloc(0))).toBe(false)
  })

  it("un archivo que no es PDF se rechaza por formato", () => {
    expect(validarReporte(Buffer.from("Esto es texto plano"))).toEqual({
      motivo: "formato",
      mensaje: MENSAJE_FORMATO,
    })
  })

  it("uno que excede el tamaño se rechaza por tamaño, y el motivo se distingue", () => {
    // Empieza como PDF: lo único que tiene mal es el tamaño.
    const grande = Buffer.alloc(MAX_TAMANO_REPORTE + 1, "%PDF-")

    expect(validarReporte(grande)).toEqual({
      motivo: "tamano",
      mensaje: MENSAJE_TAMANO,
    })
  })

  it("un PDF dentro del límite se admite", () => {
    expect(validarReporte(PDF)).toBeNull()
  })
})

describe("guardar, leer, sustituir y eliminar", () => {
  it("guarda y lee el mismo contenido", async () => {
    await guardarReporte("mant-a", PDF)

    expect(await leerReporte("mant-a")).toEqual(PDF)
  })

  it("sin archivo, leer devuelve null en lugar de fallar", async () => {
    expect(await leerReporte("mant-inexistente")).toBeNull()
  })

  it("sustituir deja solo el nuevo", async () => {
    await guardarReporte("mant-b", PDF)
    const nuevo = Buffer.from("%PDF-1.7\n%sustituto\n")

    await guardarReporte("mant-b", nuevo)

    expect(await leerReporte("mant-b")).toEqual(nuevo)
    expect(readdirSync(directorio).filter((n) => n.startsWith("mant-b"))).toEqual([
      "mant-b.pdf",
    ])
  })

  it("eliminar quita el archivo y no falla si ya no estaba", async () => {
    await guardarReporte("mant-c", PDF)

    await eliminarReporte("mant-c")

    expect(existsSync(path.join(directorio, "mant-c.pdf"))).toBe(false)
    await expect(eliminarReporte("mant-c")).resolves.toBeUndefined()
  })
})
