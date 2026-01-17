import { render, screen } from "@testing-library/react"
import { MaintenanceTable } from "@/components/maintenance-table"

describe("MaintenanceTable", () => {
  const mockData = [
    {
      id: "1",
      tipo: "PREVENTIVO",
      estado: "PROGRAMADO",
      fechaProgramada: new Date("2026-01-20"),
      equipo: {
        tipo: "Laptop",
        marca: "Dell",
        modelo: "XPS 15",
        serial: "ABC123",
        empresa: {
          nombre: "Tech Solutions",
        },
      },
      tecnico: {
        nombre: "Juan Pérez",
      },
    },
    {
      id: "2",
      tipo: "CORRECTIVO",
      estado: "EN_PROCESO",
      fechaProgramada: new Date("2026-01-18"),
      equipo: {
        tipo: "Servidor",
        marca: "HP",
        modelo: null,
        serial: "DEF456",
        empresa: {
          nombre: "InnovaTech",
        },
      },
      tecnico: {
        nombre: "María García",
      },
    },
  ]

  it("should render table with data", () => {
    render(<MaintenanceTable data={mockData} />)

    expect(screen.getByText("Laptop")).toBeInTheDocument()
    expect(screen.getByText("Tech Solutions")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
  })

  it("should render empty state when no data", () => {
    render(<MaintenanceTable data={[]} />)

    expect(screen.getByText("No hay mantenimientos próximos")).toBeInTheDocument()
  })

  it("should display tipo badges correctly", () => {
    render(<MaintenanceTable data={mockData} />)

    expect(screen.getByText("Preventivo")).toBeInTheDocument()
    expect(screen.getByText("Correctivo")).toBeInTheDocument()
  })

  it("should display estado badges correctly", () => {
    render(<MaintenanceTable data={mockData} />)

    expect(screen.getByText("Programado")).toBeInTheDocument()
    expect(screen.getByText("En Proceso")).toBeInTheDocument()
  })

  it("should handle null modelo", () => {
    render(<MaintenanceTable data={mockData} />)

    // Servidor HP should be rendered even without modelo
    expect(screen.getByText("Servidor")).toBeInTheDocument()
    expect(screen.getByText(/HP/)).toBeInTheDocument()
  })

  it("should render all table headers", () => {
    render(<MaintenanceTable data={mockData} />)

    expect(screen.getByText("Tipo")).toBeInTheDocument()
    expect(screen.getByText("Equipo")).toBeInTheDocument()
    expect(screen.getByText("Empresa")).toBeInTheDocument()
    expect(screen.getByText("Técnico")).toBeInTheDocument()
    expect(screen.getByText("Estado")).toBeInTheDocument()
    expect(screen.getByText("Fecha Programada")).toBeInTheDocument()
  })

  it("should format dates correctly", () => {
    render(<MaintenanceTable data={mockData} />)

    // Check that dates are rendered in Spanish format (day month year)
    // Dates may shift due to UTC conversion, so we check for any date with "ene 2026"
    const dateElements = screen.getAllByText(/\d{1,2}\s+ene\s+2026/i)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it("should render equipment brand and model", () => {
    render(<MaintenanceTable data={mockData} />)

    // Check for brand and model text
    expect(screen.getByText(/Dell.*XPS/)).toBeInTheDocument()
  })
})
