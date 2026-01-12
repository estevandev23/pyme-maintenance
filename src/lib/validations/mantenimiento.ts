import { z } from "zod"

export const mantenimientoSchema = z.object({
  equipoId: z.string().min(1, "El equipo es requerido"),
  tecnicoId: z.string().min(1, "El técnico es requerido"),
  tipo: z.enum(["PREVENTIVO", "CORRECTIVO"], {
    message: "El tipo de mantenimiento es requerido",
  }),
  estado: z.enum(["PROGRAMADO", "EN_PROCESO", "COMPLETADO", "CANCELADO"], {
    message: "El estado es requerido",
  }),
  fechaProgramada: z.string().min(1, "La fecha programada es requerida"),
  fechaRealizada: z.string().optional().nullable(),
  descripcion: z.string().min(1, "La descripción es requerida").max(1000, "Máximo 1000 caracteres"),
  observaciones: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
  reporteUrl: z.string().optional().nullable().or(z.literal("")),
})

export const updateMantenimientoSchema = mantenimientoSchema.partial()

export const cambiarEstadoSchema = z.object({
  estado: z.enum(["PROGRAMADO", "EN_PROCESO", "COMPLETADO", "CANCELADO"]),
  observaciones: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
})

export type MantenimientoInput = z.infer<typeof mantenimientoSchema>
export type UpdateMantenimientoInput = z.infer<typeof updateMantenimientoSchema>
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>
