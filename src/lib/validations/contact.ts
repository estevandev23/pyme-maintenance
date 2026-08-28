import { z } from "zod"

export const MENSAJE_MIN_CARACTERES = 10
export const MENSAJE_MAX_CARACTERES = 1000

export const contactSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  email: z
    .string()
    .trim()
    .min(1, "El correo electrónico es requerido")
    .email("Correo electrónico inválido"),
  mensaje: z
    .string()
    .trim()
    .min(1, "El mensaje es requerido")
    .min(
      MENSAJE_MIN_CARACTERES,
      `El mensaje debe tener al menos ${MENSAJE_MIN_CARACTERES} caracteres`
    )
    .max(MENSAJE_MAX_CARACTERES, `Máximo ${MENSAJE_MAX_CARACTERES} caracteres`),
})

export type ContactInput = z.infer<typeof contactSchema>
