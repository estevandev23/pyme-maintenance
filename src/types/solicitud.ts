export interface Solicitud {
  id: string
  equipoId: string
  clienteId: string
  descripcion: string
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE"
  estado: "PENDIENTE" | "EN_REVISION" | "APROBADA" | "RECHAZADA"
  respuesta: string | null
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
