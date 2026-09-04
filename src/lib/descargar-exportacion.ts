/**
 * Pide el archivo exportado al servidor y lo entrega al navegador.
 *
 * Antes cada pantalla armaba el archivo con lo que tenía cargado —la página
 * visible, diez filas— y lo descargaba sin decir que faltaba el resto. Ahora lo
 * genera el servidor, que es donde están todos los datos y donde el alcance por
 * rol ya se aplica; la pantalla solo manda sus filtros y guarda lo que llega.
 */

/** El nombre que el servidor propuso, o uno de respaldo. */
function nombreDeLaRespuesta(respuesta: Response, respaldo: string): string {
  const cabecera = respuesta.headers.get("Content-Disposition") ?? ""
  const encontrado = /filename="([^"]+)"/.exec(cabecera)
  return encontrado ? encontrado[1] : respaldo
}

export type FormatoDescarga = "excel" | "pdf"

/**
 * Descarga el archivo. Lanza si el servidor no lo entrega, para que quien llama
 * pueda avisar en lugar de dejar el control colgado esperando.
 */
export async function descargarExportacion(
  ruta: string,
  parametros: URLSearchParams,
  formato: FormatoDescarga,
  nombreDeRespaldo: string
): Promise<void> {
  const params = new URLSearchParams(parametros)
  params.set("formato", formato)

  const respuesta = await fetch(`${ruta}?${params.toString()}`)

  if (!respuesta.ok) {
    // El servidor responde JSON cuando rechaza; si no lo es, vale el genérico.
    let mensaje = "No se pudo generar el archivo"
    try {
      const cuerpo = await respuesta.json()
      if (cuerpo?.error) mensaje = cuerpo.error
    } catch {
      // Respuesta sin JSON: se queda el mensaje genérico.
    }
    throw new Error(mensaje)
  }

  const blob = await respuesta.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombreDeLaRespuesta(
    respuesta,
    `${nombreDeRespaldo}.${formato === "excel" ? "xlsx" : "pdf"}`
  )
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
