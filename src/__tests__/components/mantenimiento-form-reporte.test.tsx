/**
 * El reporte se adjunta sobre un mantenimiento que ya existe: el formulario no
 * lo ofrece al crear y sí al editar, y anuncia el formato y el tamaño admitidos
 * antes de que se elija el archivo.
 *
 * Cubre lo funcional, no el aspecto: la suite corre en jsdom y no compila CSS,
 * así que la comprobación visual sigue haciendo falta.
 */

import { render, screen } from "@testing-library/react"
import { MantenimientoForm } from "@/components/mantenimientos/mantenimiento-form"
import type { Mantenimiento } from "@/types/mantenimiento"

const equipo = {
  id: "eq-1",
  tipo: "Servidor",
  marca: "Lenovo",
  modelo: "M1",
  serial: "SN-1",
  empresa: { id: "em-1", nombre: "TechSolutions" },
}

const existente: Mantenimiento = {
  id: "mant-1",
  equipoId: "eq-1",
  tecnicoId: "tec-1",
  tipo: "CORRECTIVO",
  estado: "PROGRAMADO",
  fechaProgramada: "2026-09-02T00:00:00.000Z",
  fechaRealizada: null,
  descripcion: "El equipo no enciende",
  observaciones: null,
  reporteUrl: null,
  equipo,
  tecnico: { id: "tec-1", nombre: "Ana García", email: "ana@mantenpro.example" },
}

const props = {
  equipos: [{ ...equipo, empresaId: "em-1", estado: "ACTIVO" }],
  tecnicos: [
    { id: "tec-1", nombre: "Ana García", email: "ana@mantenpro.example", empresaId: "em-1" },
  ],
  empresas: [{ id: "em-1", nombre: "TechSolutions" }],
  open: true,
  onOpenChange: jest.fn(),
  onSubmit: jest.fn(),
  isLoading: false,
}

describe("el reporte solo se ofrece sobre un mantenimiento que ya existe", () => {
  it("al crear no ofrece adjuntar el reporte", () => {
    render(<MantenimientoForm {...props} />)

    expect(screen.getByText("Nuevo Mantenimiento")).toBeInTheDocument()
    expect(screen.queryByText(/Reporte PDF/)).not.toBeInTheDocument()
  })

  it("al editar sí lo ofrece, y anuncia formato y tamaño antes de elegir", () => {
    render(<MantenimientoForm {...props} mantenimiento={existente} />)

    expect(screen.getByText("Editar Mantenimiento")).toBeInTheDocument()
    expect(screen.getByText(/Reporte PDF/)).toBeInTheDocument()
    expect(screen.getByText(/Formatos aceptados: PDF/)).toBeInTheDocument()
    expect(screen.getByText(/Tamaño máximo: 5MB/)).toBeInTheDocument()
  })

  it("al editar uno que ya tiene reporte, muestra el adjunto y la opción de quitarlo", () => {
    render(
      <MantenimientoForm
        {...props}
        mantenimiento={{ ...existente, reporteUrl: "/api/mantenimientos/mant-1/reporte" }}
      />
    )

    expect(screen.getByText("Reporte adjunto")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quitar reporte" })).toBeInTheDocument()
  })
})
