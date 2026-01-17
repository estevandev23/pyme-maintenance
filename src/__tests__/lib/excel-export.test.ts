import * as XLSX from "xlsx"
import {
  exportEquiposToExcel,
  exportMantenimientosToExcel,
  exportHistorialToExcel,
  exportEstadisticasToExcel,
} from "@/lib/excel-export"

// Mock XLSX module
jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn().mockReturnValue({}),
    book_new: jest.fn().mockReturnValue({ Props: {}, SheetNames: [], Sheets: {} }),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

describe("Excel Export Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("exportEquiposToExcel", () => {
    it("should create an Excel file with equipos data", () => {
      const equipos = [
        {
          tipo: "Laptop",
          marca: "Dell",
          modelo: "XPS 15",
          serial: "ABC123",
          estado: "ACTIVO",
          ubicacion: "Oficina 1",
          empresa: "Tech Solutions",
        },
        {
          tipo: "Servidor",
          marca: "HP",
          modelo: null,
          serial: "DEF456",
          estado: "EN_MANTENIMIENTO",
          ubicacion: null,
          empresa: "InnovaTech",
        },
      ]

      exportEquiposToExcel(equipos, "test_equipos")

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1)
      expect(XLSX.utils.book_new).toHaveBeenCalledTimes(1)
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(1)
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })

    it("should handle empty equipos array", () => {
      exportEquiposToExcel([], "empty_test")

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([])
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })

    it("should use default filename when not provided", () => {
      exportEquiposToExcel([])

      const writeFileCall = (XLSX.writeFile as jest.Mock).mock.calls[0]
      expect(writeFileCall[1]).toContain("equipos_")
    })
  })

  describe("exportMantenimientosToExcel", () => {
    it("should create an Excel file with mantenimientos data", () => {
      const mantenimientos = [
        {
          tipo: "PREVENTIVO",
          estado: "COMPLETADO",
          equipo: "Laptop Dell XPS",
          empresa: "Tech Solutions",
          tecnico: "Juan Pérez",
          fechaProgramada: "2026-01-15",
          fechaRealizada: "2026-01-15",
          descripcion: "Mantenimiento preventivo mensual",
          observaciones: "Todo OK",
        },
      ]

      exportMantenimientosToExcel(mantenimientos, "test_mantenimientos")

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1)
      expect(XLSX.utils.book_new).toHaveBeenCalledTimes(1)
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })

    it("should handle null values correctly", () => {
      const mantenimientos = [
        {
          tipo: "CORRECTIVO",
          estado: "PROGRAMADO",
          equipo: "Servidor HP",
          empresa: "InnovaTech",
          tecnico: "María García",
          fechaProgramada: "2026-01-20",
          fechaRealizada: null,
          descripcion: "Reparación de disco",
          observaciones: null,
        },
      ]

      exportMantenimientosToExcel(mantenimientos)

      const jsonToSheetCall = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      expect(jsonToSheetCall[0]["Fecha Realizada"]).toBe("-")
      expect(jsonToSheetCall[0]["Observaciones"]).toBe("-")
    })
  })

  describe("exportHistorialToExcel", () => {
    it("should create an Excel file with historial data", () => {
      const historial = [
        {
          fecha: "2026-01-15 10:30",
          equipo: "Laptop Dell XPS 15",
          tipoMantenimiento: "PREVENTIVO",
          tecnico: "Juan Pérez",
          observaciones: "Mantenimiento completado sin problemas",
        },
      ]

      exportHistorialToExcel(historial, "test_historial")

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1)
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        "Historial"
      )
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })
  })

  describe("exportEstadisticasToExcel", () => {
    it("should create an Excel file with multiple sheets", () => {
      const stats = {
        totalEquipos: 100,
        equiposPorEstado: [
          { estado: "ACTIVO", cantidad: 80 },
          { estado: "INACTIVO", cantidad: 20 },
        ],
        totalMantenimientos: 50,
        mantenimientosPorEstado: [
          { estado: "COMPLETADO", cantidad: 30 },
          { estado: "PROGRAMADO", cantidad: 20 },
        ],
        mantenimientosPorMes: [
          { mes: "2026-01", cantidad: 25 },
          { mes: "2025-12", cantidad: 25 },
        ],
      }

      exportEstadisticasToExcel(stats, "test_stats")

      // Should create 4 sheets: Resumen, Equipos por Estado, Mantenimientos por Estado, Mantenimientos por Mes
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(4)
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })

    it("should include correct summary data", () => {
      const stats = {
        totalEquipos: 50,
        equiposPorEstado: [],
        totalMantenimientos: 100,
        mantenimientosPorEstado: [],
        mantenimientosPorMes: [],
      }

      exportEstadisticasToExcel(stats)

      const jsonToSheetCalls = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls
      const resumenData = jsonToSheetCalls[0][0]

      expect(resumenData).toContainEqual({ Métrica: "Total de Equipos", Valor: 50 })
      expect(resumenData).toContainEqual({ Métrica: "Total de Mantenimientos", Valor: 100 })
    })
  })
})
