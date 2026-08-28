import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  exportEquiposToPDF,
  exportMantenimientosToPDF,
  exportHistorialToPDF,
  exportEstadisticasToPDF,
} from "@/lib/pdf-export"
import type { EstadisticasInforme } from "@/lib/estadisticas"

// Mock jsPDF
jest.mock("jspdf", () => {
  const mockJsPDF = jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    setFont: jest.fn(),
    setPage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    internal: {
      pageSize: { width: 210, height: 297 },
      pages: [null, {}],
    },
  }))
  return mockJsPDF
})

// Mock jspdf-autotable
jest.mock("jspdf-autotable", () => {
  return jest.fn().mockImplementation((doc) => {
    doc.lastAutoTable = { finalY: 100 }
  })
})

describe("PDF Export Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("exportEquiposToPDF", () => {
    it("should create a PDF with equipos data", () => {
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
      ]

      exportEquiposToPDF(equipos)

      expect(jsPDF).toHaveBeenCalledTimes(1)
      expect(autoTable).toHaveBeenCalledTimes(1)

      const mockInstance = (jsPDF as jest.Mock).mock.results[0].value
      expect(mockInstance.save).toHaveBeenCalledTimes(1)
      expect(mockInstance.save).toHaveBeenCalledWith(expect.stringContaining("equipos_"))
    })

    it("should handle null values in equipos", () => {
      const equipos = [
        {
          tipo: "Servidor",
          marca: "HP",
          modelo: null,
          serial: "DEF456",
          estado: "ACTIVO",
          ubicacion: null,
          empresa: "InnovaTech",
        },
      ]

      expect(() => exportEquiposToPDF(equipos)).not.toThrow()
    })

    it("should handle empty array", () => {
      expect(() => exportEquiposToPDF([])).not.toThrow()
    })
  })

  describe("exportMantenimientosToPDF", () => {
    it("should create a PDF with mantenimientos data", () => {
      const mantenimientos = [
        {
          tipo: "PREVENTIVO",
          estado: "COMPLETADO",
          equipo: "Laptop Dell XPS",
          empresa: "Tech Solutions",
          tecnico: "Juan Pérez",
          fechaProgramada: "2026-01-15",
          fechaRealizada: "2026-01-15",
        },
      ]

      exportMantenimientosToPDF(mantenimientos)

      expect(jsPDF).toHaveBeenCalledTimes(1)
      expect(autoTable).toHaveBeenCalledTimes(1)

      const mockInstance = (jsPDF as jest.Mock).mock.results[0].value
      expect(mockInstance.save).toHaveBeenCalledWith(expect.stringContaining("mantenimientos_"))
    })

    it("should handle null fechaRealizada", () => {
      const mantenimientos = [
        {
          tipo: "CORRECTIVO",
          estado: "PROGRAMADO",
          equipo: "Servidor HP",
          empresa: "InnovaTech",
          tecnico: "María García",
          fechaProgramada: "2026-01-20",
          fechaRealizada: null,
        },
      ]

      expect(() => exportMantenimientosToPDF(mantenimientos)).not.toThrow()
    })
  })

  describe("exportHistorialToPDF", () => {
    it("should create a PDF with historial data", () => {
      const historial = [
        {
          fecha: "2026-01-15 10:30",
          equipo: "Laptop Dell XPS 15",
          tipoMantenimiento: "PREVENTIVO",
          tecnico: "Juan Pérez",
          observaciones: "Mantenimiento completado",
        },
      ]

      exportHistorialToPDF(historial)

      expect(jsPDF).toHaveBeenCalledTimes(1)
      expect(autoTable).toHaveBeenCalledTimes(1)

      const mockInstance = (jsPDF as jest.Mock).mock.results[0].value
      expect(mockInstance.save).toHaveBeenCalledWith(expect.stringContaining("historial_"))
    })

    it("should use custom title when provided", () => {
      const historial = [
        {
          fecha: "2026-01-15",
          equipo: "Test",
          tipoMantenimiento: "PREVENTIVO",
          tecnico: "Test",
          observaciones: "Test",
        },
      ]

      exportHistorialToPDF(historial, "Historial Personalizado")

      const mockInstance = (jsPDF as jest.Mock).mock.results[0].value
      expect(mockInstance.text).toHaveBeenCalledWith("Historial Personalizado", 14, 20)
    })
  })

  describe("exportEstadisticasToPDF", () => {
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

    /** Cuerpos de todas las tablas del documento, como texto plano. */
    const contenidoDelPDF = () =>
      JSON.stringify(
        (autoTable as jest.Mock).mock.calls.map((call) => call[1].body)
      )

    it("should create one table per section of the panel", () => {
      exportEstadisticasToPDF(informe)

      expect(jsPDF).toHaveBeenCalledTimes(1)
      // resumen, equipos por estado, mant. por estado, mant. por tipo,
      // mant. por mes, fallas recurrentes y próximos mantenimientos
      expect(autoTable).toHaveBeenCalledTimes(7)

      const mockInstance = (jsPDF as unknown as jest.Mock).mock.results[0].value
      expect(mockInstance.save).toHaveBeenCalledWith(expect.stringContaining("estadisticas_"))
    })

    it("should print the applied period so the file reads on its own", () => {
      exportEstadisticasToPDF(informe)

      const mockInstance = (jsPDF as unknown as jest.Mock).mock.results[0].value
      expect(mockInstance.text).toHaveBeenCalledWith(
        "Periodo: 2026-03-01 a 2026-08-31",
        14,
        expect.any(Number)
      )
    })

    // Este es el caso que falla si un indicador del panel no llega al archivo.
    it("should carry every indicator of the report into the file", () => {
      exportEstadisticasToPDF(informe)

      const resumen = (autoTable as jest.Mock).mock.calls[0][1].body

      expect(resumen).toContainEqual(["Total de Equipos", "100"])
      expect(resumen).toContainEqual(["Equipos Críticos", "7"])
      expect(resumen).toContainEqual(["Total de Mantenimientos (periodo)", "50"])
      expect(resumen).toContainEqual(["Completados (periodo)", "30"])
      expect(resumen).toContainEqual(["Pendientes (periodo)", "20"])
      expect(resumen).toContainEqual(["Equipos con fallas recurrentes", "1"])
      expect(resumen).toContainEqual([
        "Desviación respecto a la fecha programada",
        "1.5 días de adelanto",
      ])
    })

    it("should keep the preventivo/correctivo split and the detail tables", () => {
      exportEstadisticasToPDF(informe)

      const meses = (autoTable as jest.Mock).mock.calls[4][1].body
      expect(meses).toContainEqual(["2026-07", "4", "2", "6"])

      expect(contenidoDelPDF()).toContain("SRV-0001")
      expect(contenidoDelPDF()).toContain("Juan Pérez")
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

      expect(() => exportEstadisticasToPDF(vacio)).not.toThrow()
    })
  })
})
