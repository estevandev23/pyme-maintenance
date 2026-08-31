export interface Mantenimiento {
  id: string
  equipoId: string
  /**
   * Nulo cuando el mantenimiento aún no tiene técnico asignado: la empresa del
   * equipo no tenía ninguno activo al crearlo, o el administrador se lo retiró.
   * No es un estado de error.
   */
  tecnicoId: string | null
  tipo: "PREVENTIVO" | "CORRECTIVO"
  estado: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO"
  fechaProgramada: string | Date
  fechaRealizada: string | Date | null
  descripcion: string
  observaciones: string | null
  reporteUrl: string | null
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
  tecnico: {
    id: string
    nombre: string
    email: string
  } | null
  /**
   * Solicitud que originó el mantenimiento. Nulo cuando lo creó el
   * administrador desde el formulario, sin partir de ninguna.
   */
  solicitud?: {
    id: string
    prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE"
    createdAt: string
  } | null
}
