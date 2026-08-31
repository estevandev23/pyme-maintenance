/** Quién canceló. Decide el rótulo y si descuenta carga al técnico. */
export type AutorCancelacion = "CLIENTE" | "TECNICO" | "ADMIN"

export interface Solicitud {
  id: string
  equipoId: string
  clienteId: string
  descripcion: string
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE"
  /**
   * `CANCELADA` es distinto de `RECHAZADA`: aquella la cancela el cliente, el
   * técnico o el administrador sobre un trabajo que existía; esta significa que
   * el administrador denegó la solicitud, y ya no se alcanza por el flujo
   * normal.
   */
  estado: "PENDIENTE" | "EN_REVISION" | "APROBADA" | "RECHAZADA" | "CANCELADA"
  respuesta: string | null
  motivoCancelacion: string | null
  canceladoPorRol: AutorCancelacion | null
  canceladoEn: string | null
  canceladaPor: { id: string; nombre: string } | null
  /**
   * Mantenimiento que atiende la solicitud. Nulo mientras no tenga: las
   * anteriores al cambio, y las que vuelven a quedar pendientes porque se
   * eliminó el suyo.
   */
  mantenimiento: {
    id: string
    estado: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO"
    fechaProgramada: string
    tecnico: { id: string; nombre: string } | null
  } | null
  createdAt: string
  updatedAt: string
  equipo: {
    id: string
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    empresa: {
      id: string
      nombre: string
    }
  }
  cliente: {
    id: string
    nombre: string
    email: string
  }
}
