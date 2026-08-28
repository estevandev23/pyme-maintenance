## Context

Ver `proposal.md` — Why para la motivación.

Restricciones del estado actual que condicionan el enfoque:

- `GET /api/dashboard/stats` no acepta ningún parámetro. Las ventanas de tiempo
  están fijas en el código: seis meses para el gráfico, mes actual y mes anterior
  para los comparativos.
- El mismo endpoint mezcla tres criterios de fecha sin declararlo: el gráfico
  agrupa por `fechaProgramada`, los completados filtran por `fechaRealizada` y
  los pendientes del mes anterior por `createdAt`.
- Varias métricas se calculan con SQL crudo y cada una repite tres veces la misma
  consulta, una por rol (cliente, técnico, resto). Cualquier filtro nuevo se
  multiplica por tres.
- La causa del hueco de exportación no es que falten campos en las funciones de
  export: es que el panel arma a mano el objeto que les pasa, en
  `handleExportExcel` y otra vez en `handleExportPDF`, eligiendo campos uno por
  uno. Las firmas de `exportEstadisticasToExcel` y `exportEstadisticasToPDF`
  declaran exactamente esos cinco campos.
- `fechaRealizada` la introduce el administrador en un formulario; no es una
  marca de tiempo de un evento del sistema.

## Goals / Non-Goals

**Goals:**

- Que la paridad entre pantalla y archivo no dependa de que alguien se acuerde de
  actualizar dos funciones al añadir un indicador.
- Un solo criterio de fecha para todo el informe, de modo que los totales cuadren
  entre indicadores.
- Resolver el rango sin cambios de esquema.

**Non-Goals:**

- Rediseñar el panel o introducir una librería de reportes.
- Tocar las exportaciones de equipos, mantenimientos e historial, que tienen sus
  propias funciones y no comparten esta ruta.

## Decisions

### La exportación recibe el objeto completo de estadísticas

Las funciones de exportación pasan a recibir la misma estructura que el panel
usa para pintar, en lugar de un subconjunto armado a mano en el componente.

Alternativa considerada: dejar el mapeo manual y añadirle los campos que faltan.
Rechazada porque arregla el síntoma y conserva el mecanismo que lo produjo — el
próximo indicador que se agregue al panel volvería a quedarse fuera del archivo
salvo que alguien recuerde tocar tres sitios.

### La fecha de referencia es la realizada, y la programada si no hay

```
  fecha_referencia = COALESCE(fechaRealizada, fechaProgramada)
```

Alternativas consideradas:

- **Todo por `fechaProgramada`.** Un trabajo programado en marzo y ejecutado en
  mayo contaría en marzo, un mes en el que no se hizo nada.
- **Todo por `fechaRealizada`.** Los mantenimientos pendientes desaparecerían del
  informe, y el panel dejaría de poder mostrar lo que está por venir.

El coalesce mantiene trabajo hecho y trabajo pendiente en la misma serie con un
único criterio. Es una decisión de diseño, no algo que el cliente especificara:
queda como supuesto revisable.

### El rango se resuelve en el servidor

El endpoint recibe el rango como parámetros de consulta y filtra ahí. Alternativa
considerada: traer los datos completos y filtrar en el navegador. Rechazada
porque no escala y porque el alcance por rol dejaría de aplicarse en origen.

### Los meses sin actividad se rellenan en el servidor

Una consulta agrupada solo devuelve los meses que tienen filas. La serie completa
del rango se construye del lado del servidor. Alternativa considerada: rellenar
los huecos en el componente. Rechazada porque el archivo exportado necesita la
misma serie completa y la lógica acabaría duplicada.

### El rango por defecto son los últimos seis meses

Es la ventana que el panel ya usa hoy para su gráfico, así que al desplegar el
panel se ve igual que antes hasta que alguien toque el selector.

## Risks / Trade-offs

- **El cambio de rótulo del indicador de desviación puede leerse como una
  regresión.** El número es exactamente el mismo; lo que cambia es que deja de
  prometer un tiempo de resolución que nunca midió. → Explicarlo al entregar, y
  al cliente en particular, porque fue él quien pidió el tiempo promedio.
- **Las tres ramas por rol se multiplican al añadir el rango.** Si el filtro de
  alcance se sigue escribiendo indicador por indicador, cada métrica nueva son
  tres consultas más que mantener sincronizadas. → Construir el filtro de alcance
  una sola vez y reutilizarlo en todas las métricas.
- **Ampliar la firma de las funciones de exportación afecta a sus llamadores.**
  → Verificar que solo las llama el panel de estadísticas y que los exports de
  equipos, mantenimientos e historial no las comparten.
- **El informe seguirá sin responder qué falla y por qué.** Lo que el panel llama
  fallas recurrentes son equipos con dos o más correctivos. → Es la limitación
  conocida; conviene decírselo al cliente para que no espere esa columna en este
  entregable.
- **`fechaRealizada` es un dato tecleado, no una marca de evento.** Todo
  indicador que dependa de ella hereda esa imprecisión. → Se asume en este
  cambio; corregirlo pertenece al cambio de tiempos reales de resolución.

## Migration Plan

Sin migración de datos ni cambios de esquema. Despliegue directo y retroceso por
reversión de código. Los archivos exportados con anterioridad no se regeneran ni
se invalidan.

## Open Questions

- Si los seis meses por defecto resultan cortos o largos para el uso real, se
  ajusta el valor sin afectar a las specs ni al desglose de tareas.
- Dónde colocar el rango dentro del PDF (encabezado o tabla de resumen) se decide
  al implementar.
