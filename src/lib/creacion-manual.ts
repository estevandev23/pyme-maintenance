/**
 * Reglas de cuándo el administrador puede crear el mantenimiento de una
 * solicitud que se quedó sin él.
 *
 * Vive fuera de la ruta porque un `route.ts` de Next solo admite exportar los
 * verbos HTTP y su configuración: exportar constantes desde ahí produce un error
 * de tipos en los archivos que Next genera.
 */

/**
 * Estados de solicitud sobre los que se puede crear el mantenimiento.
 *
 * La puerta es el estado, no la ausencia de enlace, y el motivo es de datos
 * heredados: bajo el flujo anterior, aprobar dejaba la solicitud en `APROBADA` y
 * el mantenimiento se creaba **sin ninguna referencia a ella**, porque el campo
 * no existía. Toda solicitud aprobada antes del cambio parece huérfana aunque su
 * trabajo exista, así que ofrecerle la acción crearía un segundo mantenimiento
 * sobre el mismo equipo. `PENDIENTE` y `EN_REVISION` son estados que el flujo
 * anterior abandonaba en cuanto creaba el mantenimiento: ahí no hay trabajo
 * hecho que duplicar.
 */
export const ESTADOS_QUE_ADMITEN_CREACION = ["PENDIENTE", "EN_REVISION"] as const

export const MOTIVO_YA_TIENE_MANTENIMIENTO =
  "Esta solicitud ya tiene un mantenimiento registrado."

export const MOTIVO_ESTADO_NO_ADMITE =
  "Solo se puede crear el mantenimiento de una solicitud pendiente o en revisión."
