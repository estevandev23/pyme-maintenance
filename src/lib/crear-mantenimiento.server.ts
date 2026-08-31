/**
 * Creación del mantenimiento que atiende una solicitud.
 *
 * Vive aquí, y no dentro de la ruta de solicitudes, porque hay dos caminos que
 * tienen que producir exactamente lo mismo: el automático, cuando el cliente
 * registra la solicitud, y el manual, cuando el administrador atiende una
 * solicitud que se quedó sin mantenimiento. En el flujo anterior esas dos vías
 * eran dos implementaciones distintas del mismo comportamiento, y de ahí salían
 * los mantenimientos duplicados.
 *
 * Lo que la función abarca: la fecha, el reparto de técnico, el registro, el
 * asiento de historial y el estado del equipo. Lo que NO abarca: el estado de la
 * solicitud —que en la vía automática nace ya aprobada en la misma inserción y
 * en la manual hay que actualizar una fila existente— ni el envío del correo,
 * que va fuera de la transacción.
 */

import type { Prisma } from "@prisma/client"
import { intentarAsignarTecnico } from "@/lib/asignacion-tecnicos.server"
import { sincronizarEstadoEquipo } from "@/lib/estado-equipo.server"
import {
  calcularFechaProgramada,
  obtenerConfiguracion,
} from "@/lib/configuracion.server"

export interface DatosSolicitudAtendida {
  solicitudId: string
  equipoId: string
  empresaId: string
  descripcion: string
  /** Quién provoca la creación: el cliente que solicita, o el administrador. */
  actorId: string
}

export interface MantenimientoCreado {
  id: string
  tecnicoId: string | null
  tecnicoNombre: string | null
  tecnicoEmail: string | null
  fechaProgramada: Date
}

/**
 * Crea el mantenimiento de una solicitud dentro de una transacción ya abierta.
 *
 * Si la empresa del equipo no tiene ningún técnico activo, el mantenimiento se
 * crea igualmente sin técnico y queda a la espera: la ausencia de candidatos no
 * impide registrar el trabajo.
 */
export async function crearMantenimientoDeSolicitud(
  tx: Prisma.TransactionClient,
  datos: DatosSolicitudAtendida
): Promise<MantenimientoCreado> {
  const { diasProgramacion } = await obtenerConfiguracion(tx)
  const fechaProgramada = calcularFechaProgramada(diasProgramacion)

  const tecnico = await intentarAsignarTecnico(tx, datos.empresaId)

  const mantenimiento = await tx.mantenimiento.create({
    data: {
      equipoId: datos.equipoId,
      solicitudId: datos.solicitudId,
      tecnicoId: tecnico?.id ?? null,
      // Una solicitud es siempre un problema reportado, nunca una revisión
      // planificada.
      tipo: "CORRECTIVO",
      estado: "PROGRAMADO",
      fechaProgramada,
      descripcion: datos.descripcion,
    },
    select: { id: true, tecnicoId: true, fechaProgramada: true },
  })

  // El asiento se firma con quien provoca la creación, no con el técnico
  // asignado: puede no haber ninguno, y aunque lo haya, quien creó el
  // mantenimiento fue el cliente o el administrador. `Historial.tecnicoId` es
  // obligatorio, así que sin esto la creación sin técnico no sería posible.
  await tx.historial.create({
    data: {
      equipoId: datos.equipoId,
      mantenimientoId: mantenimiento.id,
      tecnicoId: datos.actorId,
      observaciones: tecnico
        ? `Mantenimiento correctivo creado desde una solicitud y asignado a ${tecnico.nombre}: ${datos.descripcion}`
        : `Mantenimiento correctivo creado desde una solicitud, a la espera de técnico: ${datos.descripcion}`,
    },
  })

  // El equipo entra en mantenimiento solo si el trabajo tiene técnico. Lo decide
  // el invariante, no esta función.
  await sincronizarEstadoEquipo(tx, datos.equipoId)

  return {
    id: mantenimiento.id,
    tecnicoId: mantenimiento.tecnicoId,
    tecnicoNombre: tecnico?.nombre ?? null,
    tecnicoEmail: tecnico?.email ?? null,
    fechaProgramada: mantenimiento.fechaProgramada,
  }
}
