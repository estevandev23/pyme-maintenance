import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  exportEquiposToPDF,
  exportMantenimientosToPDF,
  exportHistorialToPDF,
  exportEstadisticasToPDF,
} from "@/lib/pdf-export"

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
    it("should create a PDF with estadisticas data", () => {
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
        ],
      }

      exportEstadisticasToPDF(stats)

      expect(jsPDF).toHaveBeenCalledTimes(1)
      // Should call autoTable 4 times: resumen, equipos por estado, mant por estado, mant por mes
      expect(autoTable).toHaveBeenCalledTimes(4)

      const mockInstance = (jsPDF as jest.Mock).mock.results[0].value
      expect(mockInstance.save).toHaveBeenCalledWith(expect.stringContaining("estadisticas_"))
    })

    it("should handle empty arrays in stats", () => {
      const stats = {
        totalEquipos: 0,
        equiposPorEstado: [],
        totalMantenimientos: 0,
        mantenimientosPorEstado: [],
        mantenimientosPorMes: [],
      }

      expect(() => exportEstadisticasToPDF(stats)).not.toThrow()
    })
  })
})
