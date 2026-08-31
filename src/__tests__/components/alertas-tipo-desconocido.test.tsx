/**
 * La pantalla de alertas indexaba su tabla de presentación con el tipo que
 * viniera del servidor, sin comprobar que la clave existiera. Una categoría
 * nueva emitida por el servidor antes de desplegar la pantalla dejaba la lista
 * entera en blanco: el usuario perdía de vista también las alertas que sí
 * conocía.
 *
 * Importa porque este cambio añade justamente una categoría nueva, y servidor
 * y pantalla pueden desplegarse desacompasados.
 */

import { render, screen, waitFor } from "@testing-library/react"
import AlertasPage from "@/app/(dashboard)/alertas/page"

function respuestaConAlertas(alertas: unknown[], contadores: Record<string, number>) {
  return {
    ok: true,
    json: async () => ({ alertas, contadores }),
  } as unknown as Response
}

const alertaConocida = {
  id: "a-1",
  tipo: "ATRASADO",
  prioridad: "ALTA",
  titulo: "Mantenimiento atrasado",
  mensaje: "El mantenimiento correctivo del equipo Servidor está atrasado",
  fecha: new Date("2026-08-20").toISOString(),
}

const alertaDesconocida = {
  id: "a-2",
  tipo: "CATEGORIA_QUE_LA_PANTALLA_NO_CONOCE",
  prioridad: "PRIORIDAD_QUE_LA_PANTALLA_NO_CONOCE",
  titulo: "Aviso de categoría nueva",
  mensaje: "Este aviso llega de un servidor más nuevo que esta pantalla",
  fecha: new Date("2026-08-21").toISOString(),
}

describe("la pantalla de alertas tolera una categoría desconocida", () => {
  it("pinta el resto de alertas cuando llega una de tipo desconocido", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      respuestaConAlertas([alertaConocida, alertaDesconocida], {
        atrasados: 1,
        proximos: 0,
        criticos: 0,
        total: 2,
      })
    )

    render(<AlertasPage />)

    // La conocida se sigue viendo: es lo que la regresión hacía desaparecer.
    await waitFor(() => {
      expect(screen.getByText("Mantenimiento atrasado")).toBeInTheDocument()
    })

    // Y la desconocida también, con la presentación de reserva.
    expect(screen.getByText("Aviso de categoría nueva")).toBeInTheDocument()
  })

  it("no rompe cuando todas las alertas son de tipo desconocido", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      respuestaConAlertas([alertaDesconocida], {
        atrasados: 0,
        proximos: 0,
        criticos: 0,
        total: 1,
      })
    )

    render(<AlertasPage />)

    await waitFor(() => {
      expect(screen.getByText("Aviso de categoría nueva")).toBeInTheDocument()
    })
  })
})
