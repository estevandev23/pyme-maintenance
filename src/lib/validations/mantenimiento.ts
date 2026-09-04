import { z } from "zod"

export const MOTIVO_CANCELACION_REQUERIDO =
  "Indique el motivo de la cancelación."

const MAX_MOTIVO = 1000

export const mantenimientoSchema = z.object({
  equipoId: z.string().min(1, "El equipo es requerido"),
  // Opcional: su ausencia delega la elección en el reparto automático.
  tecnicoId: z.string().optional().nullable(),
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
  // El reporte no viaja con el formulario: se adjunta sobre el mantenimiento ya
  // creado, por su propia ruta, y es esa ruta la que escribe `reporteUrl`.
  /**
   * Motivo de la cancelación. Campo propio y no `observaciones`, porque aquel se
   * borra cada vez que alguien cambia el estado con la caja vacía.
   */
  motivoCancelacion: z
    .string()
    .max(MAX_MOTIVO, `Máximo ${MAX_MOTIVO} caracteres`)
    .optional()
    .nullable(),
})

/**
 * Exige el motivo cuando el estado que se envía es CANCELADO.
 *
 * Se aplica sobre el esquema DERIVADO, nunca sobre `mantenimientoSchema`.
 *
 * No es una preferencia de estilo: `.partial()` sobre un objeto que lleva
 * refinamientos lanza una excepción, y los esquemas derivados son constantes de
 * nivel superior, así que la excepción saltaría al evaluar el módulo. Caerían
 * sus tres importadores con valor —las dos rutas de mantenimientos, en todos sus
 * verbos, y el formulario— con un error en cada petición, no solo al validar una
 * cancelación. El proyecto ya tenía la prueba de que esto se sabía:
 * `updateUserSchema` está escrito a mano en lugar de derivarse, teniendo el
 * original un refinamiento idéntico.
 */
function tieneMotivoSiCancela(datos: {
  estado?: string | null
  motivoCancelacion?: string | null
}): boolean {
  return datos.estado !== "CANCELADO" || Boolean(datos.motivoCancelacion?.trim())
}

const PROBLEMA_MOTIVO = {
  message: MOTIVO_CANCELACION_REQUERIDO,
  path: ["motivoCancelacion"],
}

// El refinamiento se aplica aquí, sobre el esquema ya derivado. Ver la nota de
// arriba: hacerlo sobre el base rompería el módulo entero al evaluarlo.
export const updateMantenimientoSchema = mantenimientoSchema
  .partial()
  .refine(tieneMotivoSiCancela, PROBLEMA_MOTIVO)

/**
 * Lo que el técnico puede cambiar de un mantenimiento suyo.
 *
 * Es deliberadamente más estrecho que `updateMantenimientoSchema`, y la
 * diferencia es de seguridad, no de comodidad: al enumerar solo lo permitido, un
 * campo que se añada mañana al esquema del administrador queda fuera de la vía
 * del técnico salvo que alguien lo abra a propósito. Con la forma contraria
 * —aceptar todo y descartar después— entraría solo con que a alguien se le
 * olvidara cerrarlo.
 *
 * En concreto **no** lleva `tecnicoId`: es lo único que impide que un técnico se
 * reasigne trabajo saltándose la pantalla. Repartir es del administrador y del
 * reparto automático.
 *
 * Tampoco lleva `reporteUrl`: el adjunto tiene su propia ruta bajo el
 * mantenimiento, que comprueba por sí sola quién puede adjuntar.
 */
export const cambiarEstadoSchema = z
  .object({
    estado: z.enum(["PROGRAMADO", "EN_PROCESO", "COMPLETADO", "CANCELADO"]),
    observaciones: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
    tipo: z.enum(["PREVENTIVO", "CORRECTIVO"]).optional(),
    motivoCancelacion: z
      .string()
      .max(MAX_MOTIVO, `Máximo ${MAX_MOTIVO} caracteres`)
      .optional()
      .nullable(),
  })
  .refine(tieneMotivoSiCancela, PROBLEMA_MOTIVO)

/** El mantenimiento cerrado conserva su tipo: ver `esMantenimientoAbierto`. */
export const TIPO_NO_RECLASIFICABLE =
  "Un mantenimiento cerrado no se reclasifica: su tipo queda como está."

export type MantenimientoInput = z.infer<typeof mantenimientoSchema>
export type UpdateMantenimientoInput = z.infer<typeof updateMantenimientoSchema>
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>
