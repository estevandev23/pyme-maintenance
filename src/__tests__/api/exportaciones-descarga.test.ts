/**
 * @jest-environment node
 *
 * Las rutas de descarga de los listados.
 *
 * Lo que sostienen estas pruebas:
 *
 * 1. El archivo cubre todo lo que cumple los filtros. La consulta no lleva
 *    paginación: exportar diez de setenta y cuatro sin decirlo es el defecto que
 *    motivó el cambio.
 * 2. El alcance por rol se aplica, y un parámetro de la petición no lo ensancha.
 * 3. Los mantenimientos se acotan por la fecha de referencia —realizada si
 *    existe, programada si no—, la misma del panel, para que un mes no dé dos
 *    cifras distintas según dónde se mire.
 * 4. El archivo declara cuántos elementos trae, con qué filtros y si está
 *    acotado por rol.
 *
 * Se dobla Prisma para que corran siempre. No van en `integracion/`: aquellas
 * suites hacen `return` sin ejercitar nada cuando no encuentran la base.
 */

import { GET as exportarMantenimientos } from "@/app/api/mantenimientos/exportar/route"
import { GET as exportarEquipos } from "@/app/api/equipos/exportar/route"
import { GET as exportarHistorial } from "@/app/api/historial/exportar/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: { findMany: jest.fn() },
    equipo: { findMany: jest.fn() },
    historial: { findMany: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const buscarMant = prisma.mantenimiento.findMany as jest.Mock
const buscarEquipos = prisma.equipo.findMany as jest.Mock
const buscarHist = prisma.historial.findMany as jest.Mock

const peticion = (query: string) =>
  ({ url: `http://localhost:3200/api/x/exportar?${query}` }) as never

const MANT = {
  tipo: "PREVENTIVO",
  estado: "COMPLETADO",
  fechaProgramada: new Date("2026-09-01"),
  fechaRealizada: new Date("2026-09-02"),
  descripcion: "Limpieza",
  observaciones: null,
  equipo: {
    tipo: "Laptop",
    marca: "HP",
    modelo: "M-1",
    serial: "SN-1",
    empresa: { nombre: "TechSolutions S.A.S" },
  },
  tecnico: { nombre: "Pedro Ramírez" },
}

const EQUIPO = {
  tipo: "Laptop",
  marca: "HP",
  modelo: "M-1",
  serial: "SN-1",
  estado: "ACTIVO",
  ubicacion: "Piso 2",
  empresa: { nombre: "TechSolutions S.A.S" },
}

const HIST = {
  fecha: new Date("2026-09-01T10:00:00Z"),
  observaciones: "Se limpió el ventilador",
  equipo: { tipo: "Laptop", marca: "HP", serial: "SN-1" },
  tecnico: { nombre: "Pedro Ramírez" },
  mantenimiento: { tipo: "PREVENTIVO" },
}

/** Lee la hoja «Alcance» del Excel que la ruta devolvió. */
async function alcanceDelExcel(respuesta: Response) {
  const buf = Buffer.from(await respuesta.arrayBuffer())
  const wb = XLSX.read(buf, { type: "buffer" })
  const hoja = wb.Sheets["Alcance"]
  const filas = XLSX.utils.sheet_to_json<Record<string, string>>(hoja)
  const mapa: Record<string, string> = {}
  for (const f of filas) mapa[f["Dato"]] = f["Valor"]
  return { mapa, hojas: wb.SheetNames }
}

beforeEach(() => {
  jest.clearAllMocks()
  buscarMant.mockResolvedValue([MANT])
  buscarEquipos.mockResolvedValue([EQUIPO])
  buscarHist.mockResolvedValue([HIST])
  sesion.mockResolvedValue({ user: { id: "adm", role: "ADMIN", empresaId: null } })
})

describe("la consulta no está paginada", () => {
  it("mantenimientos: sin skip ni take", async () => {
    await exportarMantenimientos(peticion("formato=excel"))
    const args = buscarMant.mock.calls[0][0]
    expect(args).not.toHaveProperty("skip")
    expect(args).not.toHaveProperty("take")
  })

  it("equipos: sin skip ni take", async () => {
    await exportarEquipos(peticion("formato=excel"))
    const args = buscarEquipos.mock.calls[0][0]
    expect(args).not.toHaveProperty("skip")
    expect(args).not.toHaveProperty("take")
  })

  it("historial: sin skip ni take", async () => {
    await exportarHistorial(peticion("formato=excel"))
    const args = buscarHist.mock.calls[0][0]
    expect(args).not.toHaveProperty("skip")
    expect(args).not.toHaveProperty("take")
  })
})

describe("el alcance por rol se aplica", () => {
  it("sin sesión no se entrega nada", async () => {
    sesion.mockResolvedValue(null)
    const r = await exportarMantenimientos(peticion("formato=excel"))
    expect(r.status).toBe(401)
    expect(buscarMant).not.toHaveBeenCalled()
  })

  it("un cliente solo obtiene su empresa", async () => {
    sesion.mockResolvedValue({ user: { id: "cli", role: "CLIENTE", empresaId: "em-1" } })
    await exportarMantenimientos(peticion("formato=excel"))
    expect(JSON.stringify(buscarMant.mock.calls[0][0].where)).toContain("em-1")
  })

  it("un cliente que pide otra empresa no la obtiene", async () => {
    sesion.mockResolvedValue({ user: { id: "cli", role: "CLIENTE", empresaId: "em-1" } })
    await exportarMantenimientos(peticion("formato=excel&empresaId=em-999"))
    const where = JSON.stringify(buscarMant.mock.calls[0][0].where)
    expect(where).toContain("em-1")
    expect(where).not.toContain("em-999")
  })

  it("un técnico solo obtiene lo suyo", async () => {
    sesion.mockResolvedValue({ user: { id: "tec-1", role: "TECNICO", empresaId: "em-1" } })
    await exportarMantenimientos(peticion("formato=excel"))
    expect(JSON.stringify(buscarMant.mock.calls[0][0].where)).toContain("tec-1")
  })

  it("equipos: el cliente queda acotado a su empresa", async () => {
    sesion.mockResolvedValue({ user: { id: "cli", role: "CLIENTE", empresaId: "em-1" } })
    await exportarEquipos(peticion("formato=excel"))
    expect(JSON.stringify(buscarEquipos.mock.calls[0][0].where)).toContain("em-1")
  })

  it("historial: el técnico queda acotado a lo suyo", async () => {
    sesion.mockResolvedValue({ user: { id: "tec-1", role: "TECNICO", empresaId: null } })
    await exportarHistorial(peticion("formato=excel"))
    expect(JSON.stringify(buscarHist.mock.calls[0][0].where)).toContain("tec-1")
  })

  it("historial: un cliente que pide otra empresa no la obtiene", async () => {
    sesion.mockResolvedValue({ user: { id: "cli", role: "CLIENTE", empresaId: "em-1" } })
    await exportarHistorial(peticion("formato=excel&empresaId=em-999"))
    const where = JSON.stringify(buscarHist.mock.calls[0][0].where)
    expect(where).toContain("em-1")
    expect(where).not.toContain("em-999")
  })
})

describe("el rango de los mantenimientos usa la fecha de referencia", () => {
  it("acota por realizada cuando existe y por programada cuando no", async () => {
    await exportarMantenimientos(peticion("formato=excel&desde=2026-04-01&hasta=2026-09-30"))
    const where = buscarMant.mock.calls[0][0].where
    const rama = JSON.stringify(where)
    // Las dos ramas: realizada dentro del rango, o sin realizar y programada
    // dentro del rango. Sin la segunda, el informe se quedaría sin pendientes.
    expect(rama).toContain("fechaRealizada")
    expect(rama).toContain("fechaProgramada")
    expect(where.AND[1].OR).toHaveLength(2)
    expect(where.AND[1].OR[1].fechaRealizada).toBeNull()
  })

  it("aplica un rango por defecto cuando no llega ninguno", async () => {
    await exportarMantenimientos(peticion("formato=excel"))
    const where = buscarMant.mock.calls[0][0].where
    expect(where.AND[1].OR[0].fechaRealizada.gte).toBeInstanceOf(Date)
  })

  it("rechaza un rango invertido", async () => {
    const r = await exportarMantenimientos(
      peticion("formato=excel&desde=2026-09-30&hasta=2026-04-01")
    )
    expect(r.status).toBe(400)
    expect(buscarMant).not.toHaveBeenCalled()
  })

  it("el rango viaja en el archivo", async () => {
    const r = await exportarMantenimientos(
      peticion("formato=excel&desde=2026-04-01&hasta=2026-09-30")
    )
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Filtros aplicados"]).toContain("2026-04-01")
    expect(mapa["Filtros aplicados"]).toContain("2026-09-30")
  })
})

describe("el archivo declara qué recoge", () => {
  it("indica cuántos elementos contiene", async () => {
    buscarMant.mockResolvedValue([MANT, MANT, MANT])
    const r = await exportarMantenimientos(peticion("formato=excel"))
    const { mapa, hojas } = await alcanceDelExcel(r)
    expect(hojas).toContain("Alcance")
    expect(mapa["Elementos incluidos"]).toBe("3")
  })

  it("indica los filtros aplicados", async () => {
    const r = await exportarMantenimientos(peticion("formato=excel&estado=COMPLETADO"))
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Filtros aplicados"]).toContain("Estado: COMPLETADO")
  })

  it("indica cuándo se generó", async () => {
    const r = await exportarEquipos(peticion("formato=excel"))
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Generado"]).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it("un archivo de cliente dice que está acotado", async () => {
    sesion.mockResolvedValue({ user: { id: "cli", role: "CLIENTE", empresaId: "em-1" } })
    const r = await exportarEquipos(peticion("formato=excel"))
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Alcance"]).toContain("empresa")
  })

  it("un archivo de técnico dice que está acotado", async () => {
    sesion.mockResolvedValue({ user: { id: "tec", role: "TECNICO", empresaId: null } })
    const r = await exportarHistorial(peticion("formato=excel"))
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Alcance"]).toContain("asignados")
  })

  it("un archivo de administrador no se presenta como acotado", async () => {
    const r = await exportarEquipos(peticion("formato=excel"))
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Alcance"]).toBeUndefined()
  })

  it("una lista vacía produce un archivo que lo dice", async () => {
    buscarEquipos.mockResolvedValue([])
    const r = await exportarEquipos(peticion("formato=excel"))
    expect(r.status).toBe(200)
    const { mapa } = await alcanceDelExcel(r)
    expect(mapa["Elementos incluidos"]).toBe("0")
    expect(mapa["Aviso"]).toContain("Ningún elemento")
  })
})

describe("la entrega", () => {
  it("el Excel se entrega como archivo para guardar", async () => {
    const r = await exportarMantenimientos(peticion("formato=excel"))
    expect(r.headers.get("Content-Disposition")).toContain("attachment")
    expect(r.headers.get("Content-Type")).toContain("spreadsheetml")
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("el PDF se entrega como archivo para guardar", async () => {
    const r = await exportarMantenimientos(peticion("formato=pdf"))
    expect(r.status).toBe(200)
    expect(r.headers.get("Content-Type")).toBe("application/pdf")
    expect(r.headers.get("Content-Disposition")).toContain("attachment")
  })

  it("un formato desconocido se rechaza sin consultar nada", async () => {
    const r = await exportarMantenimientos(peticion("formato=csv"))
    expect(r.status).toBe(400)
    expect(buscarMant).not.toHaveBeenCalled()
  })
})
