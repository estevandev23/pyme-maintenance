## Why

El cliente pidió que "lo que se muestra en pantalla se refleje en el export", y
tiene razón: el panel de estadísticas calcula doce indicadores y el archivo
exportado solo lleva cinco. Faltan justo los dos que el cliente nombró — el
tiempo promedio y las fallas recurrentes. Además pidió un informe mensual por
rango de fechas, y hoy el endpoint de estadísticas no acepta ningún parámetro de
fecha: tiene "últimos 6 meses" y "este mes" fijos en el código.

## What Changes

- Las estadísticas aceptan un rango de fechas y todos sus indicadores se calculan
  dentro de ese rango, en lugar de sobre ventanas fijas.
- Las métricas pasan a usar una fecha de referencia única, para que los totales
  del informe sean coherentes entre sí. Hoy conviven tres criterios distintos:
  el gráfico agrupa por `fechaProgramada`, los completados del mes filtran por
  `fechaRealizada` y los pendientes del mes anterior por `createdAt`.
- El desglose mensual cubre todos los meses del rango seleccionado y se acompaña
  del total del periodo.
- La exportación a Excel y a PDF incluye todos los indicadores visibles en
  pantalla, no un subconjunto.
- El archivo exportado deja constancia del rango con el que se generó.
- **BREAKING** El indicador hoy rotulado "tiempo promedio de resolución" se
  renombra a lo que realmente mide: la desviación respecto a la fecha programada.
  El cálculo actual es `fechaRealizada - fechaProgramada`, que puede dar
  negativo cuando el trabajo se adelanta, y no es el tiempo que toma resolver un
  ticket. Cambia el rótulo, no el número.

Fuera de alcance (registrado a propósito, no se implementa aquí):

- El tiempo real de resolución de un ticket. Medirlo exige vincular
  `SolicitudServicio` con `Mantenimiento` y registrar marcas de tiempo de los
  eventos, que hoy no existen. Va en un cambio aparte.
- Clasificar las fallas por tipo y por causa. Hoy no hay ningún campo
  estructurado donde vivan; lo que el panel llama "fallas recurrentes" son
  equipos con dos o más mantenimientos correctivos, que responde qué equipo falla
  más, no qué falla ni por qué. Requiere cambios de esquema y decisiones sobre
  quién captura el dato. Va en un cambio aparte.
- Crear una pantalla `/reportes` nueva. Se extiende el panel existente, que es
  donde el cliente ya ve los datos.

## Capabilities

### New Capabilities

- `reportes-estadisticas`: qué indicadores expone el panel de estadísticas, cómo
  se acotan por rango de fechas y por rol, y qué debe contener el archivo
  exportado.

### Modified Capabilities

Ninguna. La única capacidad publicada hasta ahora es `asignacion-tecnicos`, que
este cambio no toca.

## Impact

Código afectado:

- `src/app/api/dashboard/stats/route.ts` — aceptar el rango, unificar el criterio
  de fecha y devolver el desglose mensual completo del periodo.
- `src/app/(dashboard)/page.tsx` — selector de rango y armado completo del objeto
  que se manda a exportar, que hoy se construye a mano y deja campos fuera.
- `src/lib/excel-export.ts` — `exportEstadisticasToExcel` acepta hoy una firma de
  cinco campos; debe cubrir todos los indicadores.
- `src/lib/pdf-export.ts` — `exportEstadisticasToPDF`, misma situación.

Sin cambios en `prisma/schema.prisma` y sin migración de datos: todo se calcula
sobre campos que ya existen.

Riesgo para terceros: quien tenga guardado un archivo exportado anterior verá que
el nuevo trae más columnas y un rótulo distinto en el indicador de desviación.
