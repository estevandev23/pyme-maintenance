/**
 * Alcance de un usuario sobre un mantenimiento.
 *
 * Una sola regla para leer el mantenimiento y para abrir su reporte. Si el
 * archivo tuviera una copia propia de las condiciones, con el tiempo dejaría de
 * coincidir con quién puede ver el mantenimiento, y la diferencia no se vería
 * en pantalla: la lectura por identificador y la descarga del reporte llaman a
 * la misma función.
 *
 * El mantenimiento llega a su empresa a través del equipo, por eso lo que se
 * compara es la empresa del equipo y no un campo del mantenimiento.
 */

import { esMantenimientoAbierto } from "@/lib/estados-mantenimiento"

/** Lo que la sesión sabe de quien pregunta. */
export interface UsuarioDeSesion {
  id: string
  role: string
  empresaId?: string | null
}

export interface AlcanceDeMantenimiento {
  tecnicoId: string | null
  /** Empresa del equipo del mantenimiento. */
  empresaId: string
}

/**
 * Quién puede consultar un mantenimiento: el administrador cualquiera, el
 * técnico los suyos, el cliente los de los equipos de su empresa.
 *
 * Un cliente sin empresa no ve ninguno. La comprobación anterior de la lectura
 * por identificador saltaba la condición cuando faltaba la empresa, y eso le
 * daba acceso a todo; el rol exige empresa al crearse, así que ningún cliente
 * real cambia de alcance con esto.
 */
export function puedeVerMantenimiento(
  usuario: UsuarioDeSesion,
  mantenimiento: AlcanceDeMantenimiento
): boolean {
  switch (usuario.role) {
    case "ADMIN":
      return true
    case "TECNICO":
      return (
        mantenimiento.tecnicoId !== null &&
        mantenimiento.tecnicoId === usuario.id
      )
    case "CLIENTE":
      return (
        Boolean(usuario.empresaId) &&
        mantenimiento.empresaId === usuario.empresaId
      )
    default:
      return false
  }
}

/**
 * Quién puede adjuntar el reporte, o quitarlo: el administrador siempre, el
 * técnico cuando el mantenimiento es suyo y sigue abierto. El cliente nunca.
 */
export function puedeAdjuntarReporte(
  usuario: UsuarioDeSesion,
  mantenimiento: { tecnicoId: string | null; estado: string }
): boolean {
  if (usuario.role === "ADMIN") return true

  if (usuario.role === "TECNICO") {
    return (
      mantenimiento.tecnicoId !== null &&
      mantenimiento.tecnicoId === usuario.id &&
      esMantenimientoAbierto(mantenimiento.estado)
    )
  }

  return false
}
