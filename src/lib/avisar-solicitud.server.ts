/**
 * Envío del aviso al cliente, en modo «lo intento y sigo».
 *
 * Es el primer envío de este tipo del proyecto, así que conviene dejar escrito
 * por qué no se parece a los dos que ya existen:
 *
 * - `forgot-password` escribe en la base y luego, si el envío falla, responde
 *   error. Trasladado aquí, el cliente vería «error al crear la solicitud» con
 *   la solicitud y el mantenimiento ya creados, y volvería a intentarlo
 *   duplicando el ticket.
 * - `contact` responde error si el envío falla, y es correcto porque ahí el
 *   correo ES la operación: si no sale, no ha pasado nada.
 *
 * Aquí el correo es un efecto de una escritura ya confirmada. No puede deshacer
 * nada ni presentarse como un fallo de la operación.
 */

import { sendSolicitudRecibidaEmail } from "@/lib/email"
import type { AvisoSolicitudAtendida } from "@/lib/email"

/**
 * Envía el aviso y devuelve si salió. Nunca lanza.
 *
 * Debe llamarse DESPUÉS de confirmar la transacción: dentro de ella, el
 * presupuesto de tiempo de Prisma es de cinco segundos y un retraso de la red
 * desharía la solicitud, el mantenimiento y el cambio de estado del equipo por
 * no haber podido mandar un aviso.
 */
export async function avisarSolicitudAtendida(
  aviso: AvisoSolicitudAtendida
): Promise<boolean> {
  if (!aviso.clienteEmail) {
    console.warn(
      "No se envía el aviso de solicitud: el cliente no tiene correo registrado."
    )
    return false
  }

  try {
    await sendSolicitudRecibidaEmail(aviso)
    return true
  } catch (error) {
    // Se registra para poder diagnosticarlo, y se sigue: lo importante ya está
    // guardado.
    console.error(
      "No se pudo enviar el aviso de solicitud al cliente. La solicitud y el mantenimiento sí quedaron registrados.",
      error
    )
    return false
  }
}
