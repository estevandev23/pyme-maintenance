/**
 * Cancelación de un mantenimiento y de su solicitud de origen.
 *
 * Vive aquí porque hay tres entradas —el cliente desde su solicitud, el técnico
 * desde su diálogo de estado y el administrador— y las tres tienen que dejar el
 * sistema igual: mantenimiento cancelado, solicitud cancelada si la hay, motivo
 * y autor guardados en ambos lados, asiento de historial y estado del equipo
 * recalculado.
 *
 * El motivo y el autor se guardan también en la solicitud, y no solo en el
 * mantenimiento, porque la solicitud es el registro del cliente y tiene que
 * sobrevivirle: si más adelante se elimina el mantenimiento, una solicitud
 * cancelada perdería la explicación.
 */

import type { Prisma } from "@prisma/client"
import { sincronizarEstadoEquipo } from "@/lib/estado-equipo.server"
import type { AutorCancelacionConocido } from "@/lib/cancelacion-solicitud"

export interface DatosCancelacion {
  mantenimientoId: string
  equipoId: string
  /** Solicitud de origen, si el mantenimiento vino de una. */
  solicitudId: string | null
  motivo: string
  autorId: string
  autorRol: AutorCancelacionConocido
  /** Nombre para el asiento de historial. */
  autorNombre?: string | null
}

/**
 * Cancela el mantenimiento dentro de una transacción ya abierta.
 *
 * No comprueba si la cancelación procede: esa decisión es de quien llama, que
 * es quien conoce el rol y las reglas que le aplican.
 */
export async function cancelarMantenimiento(
  tx: Prisma.TransactionClient,
  datos: DatosCancelacion
): Promise<void> {
  const canceladoEn = new Date()

  await tx.mantenimiento.update({
    where: { id: datos.mantenimientoId },
    data: {
      estado: "CANCELADO",
      motivoCancelacion: datos.motivo,
      canceladoPorId: datos.autorId,
      canceladoPorRol: datos.autorRol,
      canceladoEn,
    },
  })

  if (datos.solicitudId) {
    await tx.solicitudServicio.update({
      where: { id: datos.solicitudId },
      data: {
        estado: "CANCELADA",
        motivoCancelacion: datos.motivo,
        canceladoPorId: datos.autorId,
        canceladoPorRol: datos.autorRol,
        canceladoEn,
      },
    })
  }

  await tx.historial.create({
    data: {
      equipoId: datos.equipoId,
      mantenimientoId: datos.mantenimientoId,
      tecnicoId: datos.autorId,
      observaciones: `Mantenimiento cancelado por ${etiquetaDeAutor(datos.autorRol)}: ${datos.motivo}`,
    },
  })

  // Al cancelar puede quedarse el equipo sin trabajo abierto con técnico.
  await sincronizarEstadoEquipo(tx, datos.equipoId)
}

/** Cómo se nombra al autor en el rastro del historial. */
function etiquetaDeAutor(rol: AutorCancelacionConocido): string {
  switch (rol) {
    case "CLIENTE":
      return "el cliente"
    case "TECNICO":
      return "el técnico"
    case "ADMIN":
      return "el administrador"
  }
}
