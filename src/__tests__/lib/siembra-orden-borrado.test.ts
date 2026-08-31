/**
 * El script de siembra borra lo que cuelga de los equipos semilla antes de
 * volver a crearlo. Con el enlace nuevo entre mantenimiento y solicitud
 * —clave foránea con borrado restringido— el orden dejó de ser indiferente:
 * borrar una solicitud que ya generó un mantenimiento aborta la sentencia.
 *
 * Y esas líneas no van en una transacción, así que al reventar dejarían el
 * historial y las alertas ya borrados, la base a medio limpiar, y reejecutar
 * el script no lo arreglaría.
 *
 * Se comprueba leyendo el archivo y no ejecutándolo a propósito: ejecutar la
 * siembra borra los mantenimientos y equipos reales de la base de desarrollo.
 */

import { readFileSync } from "fs"
import { join } from "path"

const SIEMBRA = join(__dirname, "..", "..", "..", "scripts", "seed-data.js")

function posicionDe(fragmento: string, contenido: string): number {
  const indice = contenido.indexOf(fragmento)
  expect(indice).toBeGreaterThan(-1)
  return indice
}

describe("el orden de borrado del script de siembra respeta el enlace", () => {
  const contenido = readFileSync(SIEMBRA, "utf8")

  it("borra los mantenimientos antes que las solicitudes", () => {
    const mantenimientos = posicionDe("prisma.mantenimiento.deleteMany", contenido)
    const solicitudes = posicionDe("prisma.solicitudServicio.deleteMany", contenido)

    expect(mantenimientos).toBeLessThan(solicitudes)
  })

  it("borra los equipos al final, cuando ya no cuelga nada de ellos", () => {
    const mantenimientos = posicionDe("prisma.mantenimiento.deleteMany", contenido)
    const equipos = posicionDe("prisma.equipo.deleteMany", contenido)

    expect(mantenimientos).toBeLessThan(equipos)
  })
})
