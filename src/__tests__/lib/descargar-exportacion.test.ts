/**
 * La petición del archivo al servidor.
 *
 * Es el reemplazo de armar el archivo en el navegador con la página cargada.
 * Lo que sostienen estas pruebas: que los filtros de la pantalla viajan, que el
 * formato se manda siempre, que el nombre lo decide el servidor, y que un fallo
 * llega a quien llamó en vez de quedarse en silencio dejando el control colgado.
 */

import { descargarExportacion } from "@/lib/descargar-exportacion"

const respuestaOk = (cabeceras: Record<string, string> = {}) => ({
  ok: true,
  blob: async () => new Blob(["contenido"], { type: "application/pdf" }),
  headers: new Headers(cabeceras),
})

let enlaceCreado: HTMLAnchorElement

beforeEach(() => {
  jest.clearAllMocks()
  global.URL.createObjectURL = jest.fn(() => "blob:x")
  global.URL.revokeObjectURL = jest.fn()
  const crear = document.createElement.bind(document)
  jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = crear(tag)
    if (tag === "a") {
      enlaceCreado = el as HTMLAnchorElement
      // El clic real abriría una descarga que jsdom no sabe atender.
      ;(el as HTMLAnchorElement).click = jest.fn()
    }
    return el
  })
  ;(global.fetch as jest.Mock).mockResolvedValue(respuestaOk())
})

afterEach(() => {
  ;(document.createElement as jest.Mock).mockRestore()
})

describe("la petición", () => {
  it("lleva los filtros de la pantalla", async () => {
    const filtros = new URLSearchParams({ estado: "COMPLETADO", search: "laptop" })
    await descargarExportacion("/api/mantenimientos/exportar", filtros, "excel", "m")

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain("estado=COMPLETADO")
    expect(url).toContain("search=laptop")
  })

  it("manda el formato pedido", async () => {
    await descargarExportacion("/api/x/exportar", new URLSearchParams(), "pdf", "m")
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("formato=pdf")
  })

  it("no arrastra la paginación de la pantalla", async () => {
    // Si `page` o `limit` viajaran, el servidor podría acabar recortando el
    // archivo: es justo el defecto que se está corrigiendo.
    const filtros = new URLSearchParams({ estado: "COMPLETADO" })
    await descargarExportacion("/api/x/exportar", filtros, "excel", "m")
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).not.toContain("page=")
    expect(url).not.toContain("limit=")
  })

  it("no modifica los filtros que recibe", async () => {
    const filtros = new URLSearchParams({ estado: "COMPLETADO" })
    await descargarExportacion("/api/x/exportar", filtros, "excel", "m")
    expect(filtros.get("formato")).toBeNull()
  })
})

describe("el archivo que llega", () => {
  it("se guarda con el nombre que propone el servidor", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      respuestaOk({ "Content-Disposition": 'attachment; filename="mantenimientos_2026-09-04_1200.xlsx"' })
    )
    await descargarExportacion("/api/x/exportar", new URLSearchParams(), "excel", "m")
    expect(enlaceCreado.download).toBe("mantenimientos_2026-09-04_1200.xlsx")
  })

  it("usa un nombre de respaldo si el servidor no propone ninguno", async () => {
    await descargarExportacion("/api/x/exportar", new URLSearchParams(), "excel", "equipos")
    expect(enlaceCreado.download).toBe("equipos.xlsx")
  })

  it("libera la url temporal", async () => {
    await descargarExportacion("/api/x/exportar", new URLSearchParams(), "pdf", "m")
    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
  })
})

describe("cuando el archivo no llega", () => {
  it("lanza con el motivo que da el servidor", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Formato no admitido. Use 'excel' o 'pdf'." }),
      headers: new Headers(),
    })

    await expect(
      descargarExportacion("/api/x/exportar", new URLSearchParams(), "excel", "m")
    ).rejects.toThrow(/Formato no admitido/)
  })

  it("lanza igualmente si la respuesta no trae JSON", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("no es json")
      },
      headers: new Headers(),
    })

    await expect(
      descargarExportacion("/api/x/exportar", new URLSearchParams(), "excel", "m")
    ).rejects.toThrow(/No se pudo generar el archivo/)
  })

  it("no deja un enlace de descarga a medias", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "fallo" }),
      headers: new Headers(),
    })

    await expect(
      descargarExportacion("/api/x/exportar", new URLSearchParams(), "excel", "m")
    ).rejects.toThrow()
    expect(document.querySelector("a[download]")).toBeNull()
  })
})
