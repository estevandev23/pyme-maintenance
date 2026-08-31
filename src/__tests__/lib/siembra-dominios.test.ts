/**
 * Comprueba que el script de siembra no reparte direcciones de correo en
 * dominios registrables.
 *
 * Motivo: el flujo nuevo envía correo al cliente cuando su solicitud obtiene
 * mantenimiento. Con direcciones sembradas en dominios reales —y varios de los
 * que había estaban registrados por terceros— probar el flujo a mano, o una
 * prueba que se saltara el doble de `jest.setup.js`, entregaría a un
 * desconocido la descripción escrita por el cliente, el serial del equipo y el
 * nombre del técnico.
 *
 * Los dominios admitidos son los que RFC 2606 reserva justo para esto.
 */

import { readFileSync } from "fs"
import { join } from "path"

const RAIZ = join(__dirname, "..", "..", "..")
const SIEMBRA = join(RAIZ, "scripts", "seed-data.js")

/** TLD y dominios que RFC 2606 reserva y que nunca resuelven en la red. */
const TLD_RESERVADOS = [".example", ".test", ".invalid", ".localhost"]
const DOMINIOS_RESERVADOS = ["example.com", "example.net", "example.org"]

function esReservado(dominio: string): boolean {
  const d = dominio.toLowerCase()
  return (
    TLD_RESERVADOS.some((tld) => d.endsWith(tld)) ||
    DOMINIOS_RESERVADOS.some((dom) => d === dom || d.endsWith(`.${dom}`))
  )
}

function direccionesDe(ruta: string): string[] {
  const contenido = readFileSync(ruta, "utf8")
  const encontradas = contenido.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)
  return [...new Set(encontradas ?? [])]
}

describe("el script de siembra no usa dominios registrables", () => {
  it("encuentra direcciones que revisar", () => {
    // Si esto falla, o el script cambió de sitio o dejó de sembrar usuarios:
    // en ambos casos hay que revisar esta prueba antes que el script.
    expect(direccionesDe(SIEMBRA).length).toBeGreaterThan(0)
  })

  it("todas las direcciones sembradas están en dominios reservados", () => {
    const registrables = direccionesDe(SIEMBRA).filter((direccion) => {
      const dominio = direccion.split("@")[1] ?? ""
      return !esReservado(dominio)
    })

    expect(registrables).toEqual([])
  })
})
