import { z } from "zod"
import {
  DIAS_PROGRAMACION_MAXIMO,
  DIAS_PROGRAMACION_MINIMO,
} from "@/lib/configuracion.server"

export const MENSAJE_RANGO_DIAS =
  `Los días de adelanto deben estar entre ${DIAS_PROGRAMACION_MINIMO} y ` +
  `${DIAS_PROGRAMACION_MAXIMO}. Por debajo, el mantenimiento nacería vencido; ` +
  `por encima, no aparecería en los avisos hasta pasados varios días.`

export const configuracionSchema = z.object({
  diasProgramacion: z.coerce
    .number({ message: "Indique un número de días" })
    .int("Los días de adelanto deben ser un número entero")
    .min(DIAS_PROGRAMACION_MINIMO, MENSAJE_RANGO_DIAS)
    .max(DIAS_PROGRAMACION_MAXIMO, MENSAJE_RANGO_DIAS),
})

export type ConfiguracionInput = z.infer<typeof configuracionSchema>
