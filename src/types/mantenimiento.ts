export interface Mantenimiento {
  id: string
  equipoId: string
  tecnicoId: string
  tipo: "PREVENTIVO" | "CORRECTIVO"
  estado: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO"
  fechaProgramada: Date
  fechaRealizada: Date | null
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
  }
}
