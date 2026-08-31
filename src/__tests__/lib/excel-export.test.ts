import * as XLSX from "xlsx"
import {
  exportEquiposToExcel,
  exportMantenimientosToExcel,
  exportHistorialToExcel,
  exportEstadisticasToExcel,
} from "@/lib/excel-export"
import type { EstadisticasInforme } from "@/lib/estadisticas"
import { SIN_TECNICO } from "@/lib/tecnico-asignado"

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

    it("exporta un mantenimiento sin técnico con la etiqueta de ausencia", () => {
      const mantenimientos = [
        {
          tipo: "CORRECTIVO",
          estado: "PROGRAMADO",
          equipo: "Servidor Lenovo",
          empresa: "TechSolutions",
          tecnico: null,
          fechaProgramada: "2026-09-02",
          fechaRealizada: null,
          descripcion: "El equipo no enciende",
          observaciones: null,
        },
      ]

      exportMantenimientosToExcel(mantenimientos)

      const filas = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      expect(filas[0]["Técnico"]).toBe(SIN_TECNICO)
      // El resto de la fila sigue completo: la ausencia de técnico no la vacía.
      expect(filas[0]["Equipo"]).toBe("Servidor Lenovo")
      expect(filas[0]["Descripción"]).toBe("El equipo no enciende")
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
    const informe: EstadisticasInforme = {
      rango: { desde: "2026-03-01", hasta: "2026-08-31" },
      totalEquipos: 100,
      equiposPorEstado: { ACTIVO: 80, INACTIVO: 20 },
      equiposCriticos: 7,
      totalMantenimientos: 50,
      mantenimientosPorEstado: { COMPLETADO: 30, PROGRAMADO: 20 },
      mantenimientosPorTipo: { PREVENTIVO: 35, CORRECTIVO: 15 },
      completadosPeriodo: 30,
      cambioCompletados: 12,
      mantenimientosPendientes: 20,
      cambioPendientes: -8,
      desviacionPromedioProgramacion: -1.5,
      fallasRecurrentes: [
        {
          equipoId: "eq-1",
          cantidadFallas: 3,
          equipo: {
            tipo: "Servidor",
            marca: "HP",
            modelo: "DL380",
            serial: "SRV-0001",
            empresa: "InnovaTech",
          },
        },
      ],
      mantenimientosPorMes: [
        { mes: "2026-07", preventivo: 4, correctivo: 2, total: 6 },
        { mes: "2026-08", preventivo: 5, correctivo: 1, total: 6 },
      ],
      proximosMantenimientos: [
        {
          id: "m-1",
          tipo: "PREVENTIVO",
          estado: "PROGRAMADO",
          fechaProgramada: "2026-09-02T00:00:00.000Z",
          equipo: {
            tipo: "Laptop",
            marca: "Dell",
            modelo: "XPS 15",
            serial: "LT-0007",
            empresa: { nombre: "Tech Solutions" },
          },
          tecnico: { nombre: "Juan Pérez" },
        },
      ],
    }

    /** Todo lo que acabó dentro del libro, como texto plano. */
    const contenidoDelLibro = () =>
      JSON.stringify((XLSX.utils.json_to_sheet as jest.Mock).mock.calls)

    it("should create one sheet per section of the panel", () => {
      exportEstadisticasToExcel(informe, "test_stats")

      const hojas = (XLSX.utils.book_append_sheet as jest.Mock).mock.calls.map(
        (call) => call[2]
      )

      expect(hojas).toEqual([
        "Resumen",
        "Equipos por Estado",
        "Mantenimientos por Estado",
        "Mantenimientos por Tipo",
        "Mantenimientos por Mes",
        "Fallas Recurrentes",
        "Próximos Mantenimientos",
      ])
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })

    // Este es el caso que falla si un indicador del panel no llega al archivo.
    it("should carry every indicator of the report into the file", () => {
      exportEstadisticasToExcel(informe)

      const resumen = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      const metricas = resumen.map((fila: { Métrica: string }) => fila.Métrica)

      expect(metricas).toEqual(
        expect.arrayContaining([
          "Periodo del informe",
          "Total de Equipos",
          "Equipos Críticos",
          "Total de Mantenimientos (periodo)",
          "Completados (periodo)",
          "Variación de completados (%)",
          "Pendientes (periodo)",
          "Variación de pendientes (%)",
          "Equipos con fallas recurrentes",
        ])
      )

      expect(resumen).toContainEqual({ Métrica: "Total de Equipos", Valor: 100 })
      expect(resumen).toContainEqual({ Métrica: "Equipos Críticos", Valor: 7 })
      expect(resumen).toContainEqual({
        Métrica: "Completados (periodo)",
        Valor: 30,
      })
      expect(resumen).toContainEqual({
        Métrica: "Periodo del informe",
        Valor: "2026-03-01 a 2026-08-31",
      })
      expect(resumen).toContainEqual({
        Métrica: "Desviación respecto a la fecha programada",
        Valor: "1.5 días de adelanto",
      })
    })

    it("should keep the preventivo/correctivo split in the monthly sheet", () => {
      exportEstadisticasToExcel(informe)

      const hojaMeses = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[4][0]

      expect(hojaMeses).toContainEqual({
        Mes: "2026-07",
        Preventivos: 4,
        Correctivos: 2,
        Total: 6,
      })
    })

    it("should include the recurring failures detail", () => {
      exportEstadisticasToExcel(informe)

      const hojaFallas = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[5][0]

      expect(hojaFallas).toContainEqual({
        Equipo: "Servidor HP DL380",
        Serial: "SRV-0001",
        Empresa: "InnovaTech",
        "Cantidad de Fallas": 3,
      })
    })

    it("should include the upcoming maintenance table", () => {
      exportEstadisticasToExcel(informe)

      expect(contenidoDelLibro()).toContain("LT-0007")
      expect(contenidoDelLibro()).toContain("Juan Pérez")
    })

    it("should handle a report with no activity", () => {
      const vacio: EstadisticasInforme = {
        ...informe,
        totalEquipos: 0,
        equiposPorEstado: {},
        equiposCriticos: 0,
        totalMantenimientos: 0,
        mantenimientosPorEstado: {},
        mantenimientosPorTipo: {},
        completadosPeriodo: 0,
        mantenimientosPendientes: 0,
        desviacionPromedioProgramacion: 0,
        fallasRecurrentes: [],
        mantenimientosPorMes: [],
        proximosMantenimientos: [],
      }

      expect(() => exportEstadisticasToExcel(vacio)).not.toThrow()
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    })
  })
})
