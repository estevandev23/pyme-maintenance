/**
 * Un mantenimiento puede existir sin técnico asignado. Antes de este cambio no
 * podía, y tres pantallas leían el nombre del técnico sin contemplar su
 * ausencia: se caían con un error en tiempo de ejecución.
 *
 * Estas pruebas fijan que las tres se rinden y dicen que el mantenimiento
 * espera técnico. Cubren el fallo funcional, no el aspecto: la suite corre en
 * jsdom y no compila CSS, así que la comprobación visual sigue haciendo falta.
 */

import { render, screen } from "@testing-library/react"
import { MaintenanceTable } from "@/components/maintenance-table"
import { MantenimientosTable } from "@/components/mantenimientos/mantenimientos-table"
import { MantenimientoDetail } from "@/components/mantenimientos/mantenimiento-detail"
import { SIN_TECNICO } from "@/lib/tecnico-asignado"
import type { Mantenimiento } from "@/types/mantenimiento"

const equipo = {
  id: "eq-1",
  tipo: "Servidor",
  marca: "Lenovo",
  modelo: "Modelo-1",
  serial: "SN-HUERFANO-1",
  empresa: { id: "em-1", nombre: "TechSolutions" },
}

const huerfano: Mantenimiento = {
  id: "mant-huerfano",
  equipoId: "eq-1",
  tecnicoId: null,
  tipo: "CORRECTIVO",
  estado: "PROGRAMADO",
  fechaProgramada: new Date("2026-09-02"),
  fechaRealizada: null,
  descripcion: "El equipo no enciende",
  observaciones: null,
  reporteUrl: null,
  equipo,
  tecnico: null,
}

describe("un mantenimiento sin técnico no rompe ninguna pantalla", () => {
  it("la tabla de próximos del panel lo muestra como pendiente de asignar", () => {
    render(
      <MaintenanceTable
        data={[
          {
            id: huerfano.id,
            tipo: huerfano.tipo,
            estado: huerfano.estado,
            fechaProgramada: new Date(huerfano.fechaProgramada),
            equipo: {
              tipo: equipo.tipo,
              marca: equipo.marca,
              modelo: equipo.modelo,
              serial: equipo.serial,
              empresa: { nombre: equipo.empresa.nombre },
            },
            tecnico: null,
          },
        ]}
      />
    )

    expect(screen.getByText("Servidor")).toBeInTheDocument()
    expect(screen.getByText(SIN_TECNICO)).toBeInTheDocument()
  })

  it("el listado de mantenimientos lo muestra como pendiente de asignar", () => {
    render(
      <MantenimientosTable
        mantenimientos={[huerfano]}
        userRole="ADMIN"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onRefresh={jest.fn()}
      />
    )

    expect(screen.getByText(SIN_TECNICO)).toBeInTheDocument()
    // La fila se pinta entera: el equipo sigue ahí aunque falte el técnico.
    expect(screen.getByText(/SN-HUERFANO-1/)).toBeInTheDocument()
  })

  it("el listado sigue mostrando el técnico cuando lo hay", () => {
    const conTecnico: Mantenimiento = {
      ...huerfano,
      id: "mant-con-tecnico",
      tecnicoId: "tec-1",
      tecnico: { id: "tec-1", nombre: "Ana García", email: "ana@mantenpro.example" },
    }

    render(
      <MantenimientosTable
        mantenimientos={[conTecnico]}
        userRole="ADMIN"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onRefresh={jest.fn()}
      />
    )

    expect(screen.getByText("Ana García")).toBeInTheDocument()
    expect(screen.queryByText(SIN_TECNICO)).not.toBeInTheDocument()
  })

  it("el detalle del mantenimiento se abre sin técnico", () => {
    render(
      <MantenimientoDetail
        mantenimiento={huerfano}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByText(SIN_TECNICO)).toBeInTheDocument()
    expect(screen.getByText("El equipo no enciende")).toBeInTheDocument()
  })
})
