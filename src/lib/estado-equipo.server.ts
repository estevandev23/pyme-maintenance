/**
 * Sincroniza el estado de un equipo con el trabajo que tiene abierto.
 *
 * La regla es un invariante, no una transición: **un equipo figura en
 * mantenimiento si y solo si existe al menos un mantenimiento abierto sobre él
 * con técnico asignado**. Formulada así, la función es idempotente y da igual
 * desde dónde se llame; la versión anterior dependía de qué transición se
 * estaba haciendo y por eso se le escapaban casos.
 *
 * Dos precisiones que la versión anterior no tenía:
 *
 * - Se cuentan solo los mantenimientos **con técnico**. Sin ese filtro, un
 *   mantenimiento huérfano abierto dejaba atascado en mantenimiento al equipo
 *   que sí se había atendido, que es el efecto contrario al buscado.
 * - Se lee el estado actual antes de escribir. La versión anterior ponía
 *   `ACTIVO` a ciegas, así que cerrar un mantenimiento resucitaba equipos
 *   inactivos o dados de baja. Con la cancelación convertida en acción
 *   cotidiana del cliente, ese efecto dejaba de ser anecdótico.
 */

import type { Prisma } from "@prisma/client"
import { ESTADOS_ABIERTOS } from "@/lib/estados-mantenimiento"

/**
 * Recalcula el estado del equipo a partir de sus mantenimientos.
 *
 * Debe llamarse dentro de la misma transacción que haya modificado los
 * mantenimientos, y **después** de escribirlos: el recuento tiene que ver ya el
 * estado nuevo.
 */
export async function sincronizarEstadoEquipo(
  tx: Prisma.TransactionClient,
  equipoId: string
): Promise<void> {
  const abiertosConTecnico = await tx.mantenimiento.count({
    where: {
      equipoId,
      estado: { in: [...ESTADOS_ABIERTOS] },
      tecnicoId: { not: null },
    },
  })

  const equipo = await tx.equipo.findUnique({
    where: { id: equipoId },
    select: { estado: true },
  })

  if (!equipo) return

  if (abiertosConTecnico > 0) {
    // Solo se entra en mantenimiento desde activo. Un equipo inactivo o dado de
    // baja no cambia de estado porque le programen trabajo.
    if (equipo.estado === "ACTIVO") {
      await tx.equipo.update({
        where: { id: equipoId },
        data: { estado: "EN_MANTENIMIENTO" },
      })
    }
    return
  }

  // Solo se sale hacia activo desde mantenimiento. Cualquier otro estado es una
  // decisión que alguien tomó a mano y que cerrar un trabajo no debe deshacer.
  if (equipo.estado === "EN_MANTENIMIENTO") {
    await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "ACTIVO" },
    })
  }
}
