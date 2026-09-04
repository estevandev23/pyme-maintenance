/**
 * La pantalla de equipos no ofrece lo que el rol no puede usar.
 *
 * Ofrecer una acción que el servidor va a rechazar convierte una regla de
 * permisos en un fallo aparente de la aplicación: el cliente pulsaría y recibiría
 * un error, y eso se denuncia como avería, no como política.
 *
 * Nota de alcance: esta suite cubre las acciones por fila, que es donde vivían
 * «Editar» y «Eliminar». Que el botón «Nuevo Equipo» desaparezca para el cliente
 * se comprueba con la aplicación corriendo, porque depende de la sesión real.
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EquiposTable } from "@/components/equipos/equipos-table"

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

const EQUIPOS = [
  {
    id: "eq-1",
    tipo: "Laptop",
    marca: "HP",
    modelo: "Modelo-9373",
    serial: "SN-900123",
    estado: "ACTIVO" as const,
    ubicacion: "Piso 2",
    empresaId: "em-1",
    empresa: { id: "em-1", nombre: "TechSolutions S.A.S" },
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
]

/** Abre el menú de acciones de la primera fila y devuelve lo que ofrece. */
async function opcionesDeFila(canEdit: boolean, canDelete: boolean) {
  const usuario = userEvent.setup()
  render(
    <EquiposTable
      equipos={EQUIPOS as never}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
  const disparador = screen.queryByRole("button", { expanded: false })
  if (disparador) await usuario.click(disparador)
  return {
    editar: screen.queryByRole("menuitem", { name: /editar/i }),
    eliminar: screen.queryByRole("menuitem", { name: /eliminar/i }),
  }
}

describe("las acciones sobre un equipo son del administrador", () => {
  it("al administrador se le ofrecen editar y eliminar", async () => {
    const { editar, eliminar } = await opcionesDeFila(true, true)
    expect(editar).toBeInTheDocument()
    expect(eliminar).toBeInTheDocument()
  })

  it("a un cliente no se le ofrece editar", async () => {
    const { editar } = await opcionesDeFila(false, false)
    expect(editar).not.toBeInTheDocument()
  })

  it("a un cliente no se le ofrece eliminar", async () => {
    const { eliminar } = await opcionesDeFila(false, false)
    expect(eliminar).not.toBeInTheDocument()
  })

  it("sin ninguna acción no se ofrece ni el menú", async () => {
    // Un botón que abre un menú vacío es un control que no lleva a ninguna
    // parte. Encontrado mirándolo con la aplicación corriendo.
    render(
      <EquiposTable
        equipos={EQUIPOS as never}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canEdit={false}
        canDelete={false}
      />
    )
    expect(screen.queryByRole("button", { expanded: false })).not.toBeInTheDocument()
  })

  it("a un técnico tampoco se le ofrece ninguna de las dos", async () => {
    // Mismo trato que al cliente: el inventario no es suyo.
    const { editar, eliminar } = await opcionesDeFila(false, false)
    expect(editar).not.toBeInTheDocument()
    expect(eliminar).not.toBeInTheDocument()
  })
})

describe("consultar el inventario se conserva", () => {
  it("los datos del equipo se siguen viendo sin poder tocarlos", async () => {
    render(
      <EquiposTable
        equipos={EQUIPOS as never}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canEdit={false}
        canDelete={false}
      />
    )
    expect(screen.getByText(/SN-900123/)).toBeInTheDocument()
    expect(screen.getByText("TechSolutions S.A.S")).toBeInTheDocument()
    expect(screen.getByText(/Laptop/)).toBeInTheDocument()
  })
})
