/**
 * Lectura de los parámetros de operación que el administrador puede ajustar.
 *
 * La fila de configuración no la crea nadie: el repositorio no tiene semilla de
 * Prisma ni script que la siembre, así que en una instalación recién puesta en
 * marcha la tabla está vacía. La lectura tiene que resolver el valor por defecto
 * por sí sola, o la primera solicitud fallaría por un dato que nadie sabía que
 * había que crear.
 */

import { prisma } from "@/lib/prisma"

/** Identificador de la única fila. Ver el modelo `Configuracion`. */
export const ID_CONFIGURACION = "unica"

/**
 * Días de adelanto por defecto.
 *
 * Coincide con el `@default` del esquema a propósito: uno cubre la fila que se
 * crea desde la pantalla, el otro la instalación donde esa fila todavía no
 * existe. Si divergen, el mismo sistema programaría con dos criterios según
 * hubiera entrado alguien en configuración.
 */
export const DIAS_PROGRAMACION_POR_DEFECTO = 3

/**
 * Rango admitido para los días de adelanto.
 *
 * No es arbitrario: por debajo del mínimo el mantenimiento nace vencido, y por
 * encima del máximo no aparece en ningún aviso hasta pasados varios días,
 * porque la ventana de «próximos a vencer» es de tres días. Fuera de este rango
 * el valor no es una preferencia del administrador, es un defecto.
 */
export const DIAS_PROGRAMACION_MINIMO = 1
export const DIAS_PROGRAMACION_MAXIMO = 3

export interface ConfiguracionOperativa {
  diasProgramacion: number
}

type LectorConfiguracion = Pick<typeof prisma, "configuracion">

/**
 * Devuelve la configuración vigente, con los valores por defecto cuando no hay
 * fila guardada.
 *
 * Acepta un ejecutor para poder llamarse dentro de una transacción.
 */
export async function obtenerConfiguracion(
  db: LectorConfiguracion = prisma
): Promise<ConfiguracionOperativa> {
  const guardada = await db.configuracion.findUnique({
    where: { id: ID_CONFIGURACION },
    select: { diasProgramacion: true },
  })

  return {
    diasProgramacion: guardada?.diasProgramacion ?? DIAS_PROGRAMACION_POR_DEFECTO,
  }
}

/**
 * Fecha programada de un mantenimiento nacido de una solicitud.
 *
 * Se cuenta desde el día en que se crea el mantenimiento, **no desde el de la
 * solicitud**. En la vía automática ambos coinciden; en la manual —cuando el
 * administrador atiende una solicitud antigua— no, y contar desde la solicitud
 * produciría una fecha en el pasado: el mantenimiento nacería vencido y el
 * correo anunciaría al cliente una fecha ya pasada.
 *
 * Se devuelve el comienzo del día objetivo en hora local, para que el criterio
 * de retraso pueda compararse por días naturales.
 */
export function calcularFechaProgramada(
  diasProgramacion: number,
  hoy: Date = new Date()
): Date {
  const objetivo = new Date(hoy)
  objetivo.setDate(objetivo.getDate() + diasProgramacion)
  objetivo.setHours(0, 0, 0, 0)
  return objetivo
}
