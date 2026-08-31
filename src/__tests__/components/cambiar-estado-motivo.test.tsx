/**
 * El diálogo con el que el técnico cambia el estado de su mantenimiento no
 * tenía campo para el motivo de cancelación.
 *
 * El servidor sí lo exige, así que el técnico podía elegir «Cancelado», pulsar
 * Guardar y recibir «Indique el motivo de la cancelación» sin tener dónde
 * escribirlo: se quedaba sin poder cancelar nada. Lo encontró la comprobación a
 * mano, no la suite, porque las pruebas de la ruta pasaban.
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CambiarEstadoDialog } from "@/components/mantenimientos/cambiar-estado-dialog"

// El selector de Radix usa dos APIs de puntero y desplazamiento que jsdom no
// implementa. Sin estos rellenos el desplegable no llega a abrirse y las
// opciones no existen en el documento.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

function abrir(estadoActual = "PROGRAMADO") {
  return render(
    <CambiarEstadoDialog
      mantenimientoId="mant-1"
      estadoActual={estadoActual}
      open
      onOpenChange={jest.fn()}
      onSuccess={jest.fn()}
    />
  )
}

/** Elige un estado en el selector del diálogo. */
async function elegirEstado(usuario: ReturnType<typeof userEvent.setup>, etiqueta: string) {
  await usuario.click(screen.getByRole("combobox"))
  await usuario.click(await screen.findByRole("option", { name: etiqueta }))
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ id: "mant-1", estado: "CANCELADO" }),
  })
})

describe("el motivo de cancelación en el diálogo de estado", () => {
  it("no se pide para los estados que no son una cancelación", async () => {
    const usuario = userEvent.setup()
    abrir()

    await elegirEstado(usuario, "Completado")

    expect(screen.queryByText(/Motivo de la cancelación/i)).not.toBeInTheDocument()
  })

  it("aparece al elegir Cancelado", async () => {
    const usuario = userEvent.setup()
    abrir()

    await elegirEstado(usuario, "Cancelado")

    expect(await screen.findByText(/Motivo de la cancelación/i)).toBeInTheDocument()
  })

  it("el botón de guardar está deshabilitado hasta que se escriba el motivo", async () => {
    const usuario = userEvent.setup()
    abrir()

    await elegirEstado(usuario, "Cancelado")

    const guardar = screen.getByRole("button", { name: /guardar/i })
    expect(guardar).toBeDisabled()

    const motivo = screen.getByPlaceholderText(/por qué no se va a hacer/i)
    await usuario.type(motivo, "El equipo se dio de baja")

    await waitFor(() => expect(guardar).toBeEnabled())
  })

  it("el motivo viaja al servidor junto con el estado", async () => {
    const usuario = userEvent.setup()
    abrir()

    await elegirEstado(usuario, "Cancelado")
    await usuario.type(
      screen.getByPlaceholderText(/por qué no se va a hacer/i),
      "El equipo se dio de baja"
    )
    await usuario.click(screen.getByRole("button", { name: /guardar/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const cuerpo = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(cuerpo).toMatchObject({
      estado: "CANCELADO",
      motivoCancelacion: "El equipo se dio de baja",
    })
  })

  it("un cambio de estado normal no manda motivo", async () => {
    const usuario = userEvent.setup()
    abrir()

    await elegirEstado(usuario, "En Proceso")
    await usuario.click(screen.getByRole("button", { name: /guardar/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const cuerpo = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(cuerpo.estado).toBe("EN_PROCESO")
    expect(cuerpo.motivoCancelacion).toBeUndefined()
  })
})
