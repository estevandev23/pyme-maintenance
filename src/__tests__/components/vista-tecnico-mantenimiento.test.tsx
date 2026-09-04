/**
 * La vista única con la que el técnico registra el avance.
 *
 * Lo que estas pruebas sostienen: que los datos para decidir y los campos con
 * los que se decide están en la misma vista, que lo que se muestra en lectura
 * no trae control para cambiarlo, y que el reporte va por su propia ruta y no
 * con el resto del formulario.
 *
 * Lo que NO sostienen, y hay que mirar: cómo se ve. jsdom no compila CSS, así
 * que esta suite pasa en verde con la pantalla rota.
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CambiarEstadoDialog } from "@/components/mantenimientos/cambiar-estado-dialog"
import type { Mantenimiento } from "@/types/mantenimiento"

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

const MANTENIMIENTO: Mantenimiento = {
  id: "mant-1",
  equipoId: "eq-1",
  tecnicoId: "tec-1",
  tipo: "CORRECTIVO",
  estado: "EN_PROCESO",
  fechaProgramada: "2026-09-10",
  fechaRealizada: null,
  descripcion: "El equipo no enciende",
  observaciones: null,
  reporteUrl: null,
  equipo: {
    id: "eq-1",
    tipo: "Laptop",
    marca: "HP",
    modelo: "Modelo-9373",
    serial: "SN-900123-456",
    empresa: { id: "em-1", nombre: "TechSolutions S.A.S" },
  },
  tecnico: { id: "tec-1", nombre: "Pedro Ramírez", email: "tecnico1@mantenpro.example" },
}

function abrir(cambios: Partial<Mantenimiento> = {}) {
  const onSuccess = jest.fn()
  const resultado = render(
    <CambiarEstadoDialog
      mantenimiento={{ ...MANTENIMIENTO, ...cambios }}
      open
      onOpenChange={jest.fn()}
      onSuccess={onSuccess}
    />
  )
  return { ...resultado, onSuccess }
}

const llamadas = () => (global.fetch as jest.Mock).mock.calls

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, url: "/api/mantenimientos/mant-1/reporte" }),
  })
})

describe("los datos para decidir están junto al formulario", () => {
  it("muestra el equipo con su serial", () => {
    abrir()

    expect(screen.getByText(/Laptop HP Modelo-9373/)).toBeInTheDocument()
    expect(screen.getByText(/SN-900123-456/)).toBeInTheDocument()
  })

  it("muestra la empresa del equipo", () => {
    abrir()

    expect(screen.getByText("TechSolutions S.A.S")).toBeInTheDocument()
  })

  it("muestra la descripción con la que el cliente pidió el servicio", () => {
    abrir()

    expect(screen.getByText("Descripción del cliente")).toBeInTheDocument()
    expect(screen.getByText("El equipo no enciende")).toBeInTheDocument()
  })

  it("los datos y los campos editables están en la misma vista", () => {
    abrir()

    // Sin cambiar de pestaña ni de diálogo.
    expect(screen.getByText("TechSolutions S.A.S")).toBeInTheDocument()
    expect(screen.getByLabelText("Nuevo Estado")).toBeInTheDocument()
    expect(screen.getByLabelText(/Observaciones/)).toBeInTheDocument()
  })

  it("no ofrece cambiar el equipo", () => {
    abrir()

    expect(screen.queryByLabelText(/equipo/i)).not.toBeInTheDocument()
  })
})

describe("el técnico asignado es dato, no control", () => {
  it("muestra quién lo tiene asignado", () => {
    abrir()

    expect(screen.getByText("Pedro Ramírez")).toBeInTheDocument()
  })

  it("no ofrece ningún control para cambiar la asignación", () => {
    abrir()

    expect(screen.queryByLabelText(/técnico/i)).not.toBeInTheDocument()
    // Ni siquiera deshabilitado: un control apagado se lee peor que un dato.
    const combos = screen.getAllByRole("combobox")
    for (const combo of combos) {
      expect(combo).not.toHaveAttribute("disabled")
    }
  })

  it("dice que no hay técnico en lugar de dejar el hueco vacío", () => {
    abrir({ tecnico: null, tecnicoId: null })

    expect(screen.getByText("Sin asignar")).toBeInTheDocument()
  })
})

describe("el tipo solo se ofrece mientras el trabajo sigue abierto", () => {
  it("ofrece el selector en un mantenimiento en proceso", () => {
    abrir({ estado: "EN_PROCESO" })

    expect(screen.getByLabelText("Tipo de Mantenimiento")).toBeInTheDocument()
  })

  it("ofrece el selector en un mantenimiento programado", () => {
    abrir({ estado: "PROGRAMADO" })

    expect(screen.getByLabelText("Tipo de Mantenimiento")).toBeInTheDocument()
  })

  it("en uno completado muestra el tipo pero no el control", () => {
    abrir({ estado: "COMPLETADO" })

    expect(screen.getByText("Tipo de Mantenimiento")).toBeInTheDocument()
    expect(screen.getByText("Correctivo")).toBeInTheDocument()
    expect(screen.queryByLabelText("Tipo de Mantenimiento")).not.toBeInTheDocument()
  })

  it("en uno cancelado tampoco ofrece el control", () => {
    abrir({ estado: "CANCELADO" })

    expect(screen.queryByLabelText("Tipo de Mantenimiento")).not.toBeInTheDocument()
  })

  it("el tipo reclasificado viaja al guardar", async () => {
    const usuario = userEvent.setup()
    abrir({ estado: "EN_PROCESO", tipo: "CORRECTIVO" })

    await usuario.click(screen.getByLabelText("Tipo de Mantenimiento"))
    await usuario.click(await screen.findByRole("option", { name: "Preventivo" }))
    await usuario.click(screen.getByRole("button", { name: /guardar/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const cuerpo = JSON.parse(llamadas()[0][1].body)
    expect(cuerpo.tipo).toBe("PREVENTIVO")
  })

  it("no manda el tipo si no se tocó", async () => {
    const usuario = userEvent.setup()
    abrir({ estado: "EN_PROCESO" })

    await usuario.click(screen.getByLabelText("Nuevo Estado"))
    await usuario.click(await screen.findByRole("option", { name: "Completado" }))
    await usuario.click(screen.getByRole("button", { name: /guardar/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const cuerpo = JSON.parse(llamadas()[0][1].body)
    expect(cuerpo).not.toHaveProperty("tipo")
  })
})

describe("el reporte adjunto", () => {
  it("anuncia formato y tamaño antes de que se elija archivo", () => {
    abrir()

    expect(
      screen.getByText(/Formatos aceptados: PDF\. Tamaño máximo: 5MB/)
    ).toBeInTheDocument()
  })

  it("adjunta por la ruta del reporte, no con el formulario", async () => {
    const usuario = userEvent.setup()
    abrir()

    const archivo = new File(["%PDF-1.4"], "informe.pdf", { type: "application/pdf" })
    await usuario.upload(screen.getByLabelText(/Reporte PDF/), archivo)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const [url, opciones] = llamadas()[0]
    expect(url).toBe("/api/mantenimientos/mant-1/reporte")
    expect(opciones.method).toBe("POST")
    expect(opciones.body).toBeInstanceOf(FormData)
  })

  it("ofrece quitar el reporte cuando lo hay", () => {
    abrir({ reporteUrl: "/api/mantenimientos/mant-1/reporte" })

    expect(screen.getByRole("button", { name: /quitar reporte/i })).toBeInTheDocument()
  })

  it("quitarlo llega a la misma ruta con DELETE", async () => {
    const usuario = userEvent.setup()
    abrir({ reporteUrl: "/api/mantenimientos/mant-1/reporte" })

    await usuario.click(screen.getByRole("button", { name: /quitar reporte/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const [url, opciones] = llamadas()[0]
    expect(url).toBe("/api/mantenimientos/mant-1/reporte")
    expect(opciones.method).toBe("DELETE")
  })

  it("adjuntar no recarga la lista mientras el diálogo sigue abierto", async () => {
    // Encontrado mirándolo con la aplicación corriendo: recargar la lista deja
    // la página en estado de carga, que desmonta la tabla y con ella este
    // diálogo. El técnico perdía lo que hubiera escrito solo por adjuntar.
    const usuario = userEvent.setup()
    const { onSuccess } = abrir()

    const archivo = new File(["%PDF-1.4"], "informe.pdf", { type: "application/pdf" })
    await usuario.upload(screen.getByLabelText(/Reporte PDF/), archivo)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("avisa del reporte al cerrar el diálogo", async () => {
    const usuario = userEvent.setup()
    const { onSuccess } = abrir()

    const archivo = new File(["%PDF-1.4"], "informe.pdf", { type: "application/pdf" })
    await usuario.upload(screen.getByLabelText(/Reporte PDF/), archivo)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    await usuario.click(screen.getByRole("button", { name: /cancelar/i }))

    expect(onSuccess).toHaveBeenCalled()
  })

  it("cerrar sin haber tocado el reporte no recarga nada", async () => {
    const usuario = userEvent.setup()
    const { onSuccess } = abrir()

    await usuario.click(screen.getByRole("button", { name: /cancelar/i }))

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("guardar el avance no manda el reporte", async () => {
    // Regresión: el adjunto salió de la actualización del mantenimiento al
    // dársele ruta propia. Si alguien lo devuelve a este camino, el archivo
    // vuelve a viajar sin que nadie compruebe a quién pertenece.
    const usuario = userEvent.setup()
    abrir({ estado: "EN_PROCESO", reporteUrl: "/api/mantenimientos/mant-1/reporte" })

    await usuario.click(screen.getByLabelText("Nuevo Estado"))
    await usuario.click(await screen.findByRole("option", { name: "Completado" }))
    await usuario.click(screen.getByRole("button", { name: /guardar/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const guardado = llamadas().find(([, o]) => o?.method === "PUT")
    const cuerpo = JSON.parse(guardado![1].body)
    expect(cuerpo).not.toHaveProperty("reporteUrl")
  })
})

describe("el estado de partida se refleja al abrir", () => {
  it("el selector de estado muestra el estado actual, no uno vacío", () => {
    // El diálogo se reutiliza para cada fila de la tabla: si los valores
    // iniciales solo se tomaran en el primer render, el selector saldría vacío.
    abrir({ estado: "EN_PROCESO" })

    expect(screen.getByLabelText("Nuevo Estado")).toHaveTextContent("En Proceso")
  })

  it("las observaciones que ya tenía aparecen escritas", () => {
    abrir({ observaciones: "Se limpió el ventilador" })

    expect(screen.getByLabelText(/Observaciones/)).toHaveValue("Se limpió el ventilador")
  })

  it("no guarda cuando no hay ningún cambio", async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(screen.getByRole("button", { name: /guardar/i }))

    expect(global.fetch).not.toHaveBeenCalled()
  })
})
