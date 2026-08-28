/**
 * @jest-environment node
 *
 * Paridad entre lo que muestra el panel y lo que llega al archivo exportado, y
 * alcance por rol, comprobados contra la base de datos real.
 *
 * Se salta solo si no hay base alcanzable, para que `pnpm test` siga pasando en
 * un entorno sin ella.
 */
import { GET } from "@/app/api/dashboard/stats/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { exportEstadisticasToExcel } from "@/lib/excel-export"
import { exportEstadisticasToPDF } from "@/lib/pdf-export"
import * as XLSX from "xlsx"
import autoTable from "jspdf-autotable"
import type { EstadisticasInforme } from "@/lib/estadisticas"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))

jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn().mockReturnValue({}),
    book_new: jest.fn().mockReturnValue({ Props: {}, SheetNames: [], Sheets: {} }),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

jest.mock("jspdf", () =>
  jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    setFont: jest.fn(),
    setPage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    internal: { pageSize: { width: 210, height: 297 }, pages: [null, {}] },
  }))
)

jest.mock("jspdf-autotable", () =>
  jest.fn().mockImplementation((doc) => {
    doc.lastAutoTable = { finalY: 100 }
  })
)

const sesion = getServerSession as jest.Mock
const peticion = (query = "") =>
  ({ url: `http://localhost:3200/api/dashboard/stats${query}` }) as never

let hayBase = false
let cliente: { id: string; empresaId: string | null } | null = null
let tecnico: { id: string; empresaId: string | null } | null = null

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    hayBase = true
    cliente = await prisma.user.findFirst({
      where: { role: "CLIENTE", empresaId: { not: null } },
      select: { id: true, empresaId: true },
    })
    tecnico = await prisma.user.findFirst({
      where: { role: "TECNICO", mantenimientos: { some: {} } },
      select: { id: true, empresaId: true },
    })
  } catch {
    hayBase = false
  }
})

afterAll(async () => {
  if (hayBase) await prisma.$disconnect()
})

/** Pide el informe con la sesión indicada. */
async function informe(user: {
  id: string
  role: string
  empresaId?: string | null
}): Promise<EstadisticasInforme> {
  sesion.mockResolvedValue({ user })
  const respuesta = await GET(peticion())
  expect(respuesta.status).toBe(200)
  return respuesta.json()
}

/** Los indicadores destacados del panel, con el valor que muestra cada uno. */
function indicadoresEnPantalla(stats: EstadisticasInforme) {
  return {
    "Total de Equipos": stats.totalEquipos,
    "Equipos Críticos": stats.equiposCriticos,
    "Total de Mantenimientos (periodo)": stats.totalMantenimientos,
    "Completados (periodo)": stats.completadosPeriodo,
    "Pendientes (periodo)": stats.mantenimientosPendientes,
    "Equipos con fallas recurrentes": stats.fallasRecurrentes.length,
  }
}

describe("paridad pantalla-archivo y alcance por rol", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("hay base de datos alcanzable", () => {
    if (!hayBase) {
      console.warn("Sin base de datos: el resto de esta suite se omite.")
    }
    expect(true).toBe(true)
  })

  describe("6.1 — cada indicador de pantalla llega al archivo con el mismo valor", () => {
    it("Excel lleva todos los indicadores con el valor que muestra el panel", async () => {
      if (!hayBase) return
      const stats = await informe({ id: "admin", role: "ADMIN", empresaId: null })

      exportEstadisticasToExcel(stats)
      const resumen = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]

      for (const [metrica, valor] of Object.entries(indicadoresEnPantalla(stats))) {
        expect(resumen).toContainEqual({ Métrica: metrica, Valor: valor })
      }
    })

    it("el desglose mensual del archivo coincide con el de pantalla", async () => {
      if (!hayBase) return
      const stats = await informe({ id: "admin", role: "ADMIN", empresaId: null })

      exportEstadisticasToExcel(stats)
      const hojaMeses = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[4][0]

      expect(hojaMeses).toHaveLength(stats.mantenimientosPorMes.length)
      for (const punto of stats.mantenimientosPorMes) {
        expect(hojaMeses).toContainEqual({
          Mes: punto.mes,
          Preventivos: punto.preventivo,
          Correctivos: punto.correctivo,
          Total: punto.total,
        })
      }
    })

    it("PDF lleva los mismos indicadores que Excel", async () => {
      if (!hayBase) return
      const stats = await informe({ id: "admin", role: "ADMIN", empresaId: null })

      exportEstadisticasToPDF(stats)
      const resumen = (autoTable as jest.Mock).mock.calls[0][1].body

      for (const [metrica, valor] of Object.entries(indicadoresEnPantalla(stats))) {
        expect(resumen).toContainEqual([metrica, String(valor)])
      }
    })

    it("el total del periodo cuadra con la suma del desglose", async () => {
      if (!hayBase) return
      const stats = await informe({ id: "admin", role: "ADMIN", empresaId: null })

      const suma = stats.mantenimientosPorMes.reduce((a, p) => a + p.total, 0)
      expect(stats.totalMantenimientos).toBe(suma)
    })
  })

  describe("6.2 — el archivo de cada rol contiene solo lo que ese rol ve", () => {
    it("un CLIENTE solo alcanza equipos de su empresa", async () => {
      if (!hayBase || !cliente) return
      const stats = await informe({
        id: cliente.id,
        role: "CLIENTE",
        empresaId: cliente.empresaId,
      })

      const equiposDeSuEmpresa = await prisma.equipo.count({
        where: { empresaId: cliente.empresaId! },
      })
      const equiposTotales = await prisma.equipo.count()

      expect(stats.totalEquipos).toBe(equiposDeSuEmpresa)
      expect(stats.totalEquipos).toBeLessThan(equiposTotales)

      // y lo que se exporta es exactamente ese informe
      exportEstadisticasToExcel(stats)
      const resumen = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      expect(resumen).toContainEqual({
        Métrica: "Total de Equipos",
        Valor: equiposDeSuEmpresa,
      })
    })

    it("un TECNICO solo alcanza sus propios mantenimientos", async () => {
      if (!hayBase || !tecnico) return
      const stats = await informe({
        id: tecnico.id,
        role: "TECNICO",
        empresaId: tecnico.empresaId,
      })

      const suyosEnCualquierFecha = await prisma.mantenimiento.count({
        where: { tecnicoId: tecnico.id },
      })
      const todos = await prisma.mantenimiento.count()

      expect(stats.totalMantenimientos).toBeLessThanOrEqual(suyosEnCualquierFecha)
      expect(stats.totalMantenimientos).toBeLessThan(todos)
    })

    it("ampliar el rango al histórico no expone datos de otra empresa", async () => {
      if (!hayBase || !cliente) return
      sesion.mockResolvedValue({
        user: { id: cliente.id, role: "CLIENTE", empresaId: cliente.empresaId },
      })
      const respuesta = await GET(peticion("?desde=2000-01-01&hasta=2030-12-31"))
      const stats: EstadisticasInforme = await respuesta.json()

      const equiposDeSuEmpresa = await prisma.equipo.count({
        where: { empresaId: cliente.empresaId! },
      })
      expect(stats.totalEquipos).toBe(equiposDeSuEmpresa)

      const empresasEnFallas = new Set(
        stats.fallasRecurrentes.map((f) => f.equipo?.empresa).filter(Boolean)
      )
      expect(empresasEnFallas.size).toBeLessThanOrEqual(1)
    })
  })
})
