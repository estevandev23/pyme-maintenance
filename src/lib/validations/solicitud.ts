import { z } from "zod"

export const solicitudSchema = z.object({
  equipoId: z.string().min(1, "Seleccione un equipo"),
  descripcion: z
    .string()
    .min(10, "Describa el problema con al menos 10 caracteres")
    .max(1000, "Máximo 1000 caracteres"),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"], {
    message: "Seleccione una prioridad",
  }),
})

export const updateSolicitudSchema = z.object({
  estado: z
    .enum(["PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA", "CANCELADA"])
    .optional(),
  respuesta: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
  /**
   * Motivo con el que el cliente cancela su solicitud. Obligatorio en esa
   * operación; la comprobación va en la ruta, que es donde se sabe que se está
   * cancelando y no haciendo otra cosa.
   */
  motivoCancelacion: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .nullable(),
})

export type SolicitudInput = z.infer<typeof solicitudSchema>
export type UpdateSolicitudInput = z.infer<typeof updateSolicitudSchema>
