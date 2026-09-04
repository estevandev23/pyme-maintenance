Las tareas marcadas **[app]** necesitan la aplicación corriendo en el puerto 3200
con datos reales y sesión iniciada del rol que indican. No las cubre la suite: en
jsdom no se compila CSS, así que `pnpm test` puede pasar en verde con la pantalla
rota. El resto se verifica de forma automática.

## 1. Estado de partida

- [x] 1.1 Guardar la salida de `pnpm exec tsc --noEmit` y de `pnpm lint` antes de
  tocar nada, en el scratchpad. Ambos arrastran errores previos: al terminar se
  compara contra esta referencia, no se exige cero
  <!-- Referencia: 28 errores de tsc, 42 líneas de error/aviso en lint. -->
- [x] 1.2 **[app]** Recorrer con sesión de técnico el camino actual —lista,
  detalle, diálogo de cambio de estado— y guardar capturas. Es lo único que
  permitirá comparar después si algo que hoy se ve se perdió por el camino
  <!-- El diálogo actual tiene «Nuevo Estado» y «Observaciones» y nada más: ni
       equipo, ni empresa, ni descripción del cliente, ni tipo, ni reporte. Se
       llega por el menú de tres puntos, en una entrada distinta de «Ver
       detalles». Defecto encontrado de paso: el selector de estado sale vacío
       porque el diálogo se monta una vez y `useState(estadoActual)` congela el
       valor del primer render. -->
- [x] 1.3 Confirmar que `adjuntos-de-reporte-privados` está aplicado y archivado.
  Verificar que existe la ruta del reporte bajo el mantenimiento y que
  `PUT /api/mantenimientos/[id]` ya no escribe `reporteUrl`: el grupo 5 da por hecho
  lo primero y el grupo 2 depende de lo segundo
  <!-- Archivado en 2026-09-03-adjuntos-de-reporte-privados (commit 4992dbd). La
       ruta del reporte expone GET, POST y DELETE. El PUT solo conserva un
       comentario sobre `reporteUrl`, no lo escribe. -->

## 2. La vía del técnico en el servidor

- [x] 2.1 Ampliar el esquema de validación del técnico para que admita `tipo`,
  dejando fuera `tecnicoId` y también `reporteUrl`, que va por la ruta del reporte.
  Verificar con una prueba de que una petición de técnico que incluye `tecnicoId`
  deja la asignación intacta
- [x] 2.2 Aplicar la regla de reclasificación comparando contra el estado que el
  mantenimiento tenía antes de la operación, siguiendo el criterio que la
  cancelación ya usa. Verificar con pruebas de los cuatro casos: reclasificar un
  abierto se aplica, reclasificar un cerrado se rechaza, reclasificar y completar
  en la misma operación se aplica, y el rechazo no guarda ningún otro campo de esa
  petición
- [x] 2.3 Escribir el asiento de historial del cambio de tipo dentro de la misma
  transacción que el resto de la actualización, con el técnico y el valor anterior.
  Verificar con una prueba de que el asiento existe tras reclasificar y de que
  guardar el mismo tipo que ya tenía no genera ninguno
- [x] 2.4 Comprobar que la vía del técnico sigue sin alcanzar fechas, descripción
  ni equipo. Verificar con una prueba que envía esos campos como técnico y
  confirma que no cambian
- [x] 2.5 Escribir las pruebas de los puntos anteriores doblando Prisma, de modo
  que corran siempre. Verificar que **no** quedan en `src/__tests__/integracion/`:
  esas dos suites hacen `return` sin ejercitar nada cuando no encuentran la base y
  pasan en verde sin haber probado nada

## 3. Los datos que la pantalla necesita

- [x] 3.1 Entregar a la pantalla del técnico el equipo, la empresa y la descripción
  del cliente, que hoy no recibe. Verificar con una prueba de que el componente los
  recibe y los muestra
- [x] 3.2 Contemplar el mantenimiento sin técnico asignado. Verificar con una
  prueba de que la pantalla lo indica en lugar de dejar el hueco vacío

## 4. La pantalla del técnico

- [x] 4.1 Componer la vista única: los datos de contexto en lectura sobre el
  formulario, sin selector de equipo. Verificar con una prueba de que los datos y
  los campos editables coexisten en la misma vista
- [x] 4.2 Presentar el técnico asignado como texto, no como control deshabilitado.
  Verificar con una prueba de que no existe ningún control para cambiarlo
- [x] 4.3 Ofrecer el selector de tipo solo cuando el mantenimiento está abierto.
  Verificar con una prueba de que en un mantenimiento cerrado el tipo se ve pero no
  se puede cambiar. Al escribir la prueba, rellenar `hasPointerCapture`,
  `setPointerCapture`, `releasePointerCapture` y `scrollIntoView`, o el selector de
  shadcn no se abre en jsdom; hay un ejemplo resuelto en
  `src/__tests__/components/cambiar-estado-motivo.test.tsx`
- [x] 4.4 Conservar el motivo de cancelación obligatorio que la pantalla actual ya
  exige. Verificar que la prueba existente de ese comportamiento sigue pasando

## 5. El reporte adjunto

La custodia del archivo ya está resuelta en `adjuntos-de-reporte-privados`: el
reporte tiene su propia ruta bajo el mantenimiento, que comprueba por sí sola que
quien adjunta pueda editarlo. Aquí no se toca esa ruta ni se le añaden permisos.
Lo que falta es que el técnico llegue a ella desde su pantalla, que hoy solo se le
abre al administrador.

- [x] 5.1 Añadir el campo de reporte a la pantalla del técnico, adjuntando por la
  ruta del reporte y no con el resto del formulario, y anunciando formato y tamaño
  máximo antes de que elija archivo. Verificar con una prueba de que el texto de
  condiciones está presente sin haber interactuado y de que el envío va a esa ruta
- [x] 5.2 Ofrecer al técnico quitar el reporte adjunto, que la ruta ya admite.
  Verificar con una prueba de que quitarlo llega a esa ruta y no deja el archivo en
  disco
- [x] 5.3 Comprobar que guardar el avance no altera el reporte. Es cierto por
  construcción desde que la actualización del mantenimiento dejó de escribirlo:
  verificar con una prueba de regresión, que es lo que avisará si alguien vuelve a
  meter el campo en ese camino
- [x] 5.4 **[app]** Adjuntar un PDF real como técnico desde la pantalla y comprobar
  que queda asociado al mantenimiento y que puede abrirlo desde su detalle

## 6. Verificación con la aplicación corriendo

- [x] 6.1 **[app]** Con sesión de técnico: abrir un mantenimiento asignado y
  confirmar que el equipo, la empresa y la descripción del cliente se leen sin
  cambiar de pantalla. Comparar contra las capturas de 1.2
- [x] 6.2 **[app]** Con sesión de técnico: reclasificar y completar en un solo
  guardado, y confirmar que ambas cosas quedaron aplicadas
- [x] 6.3 **[app]** Con sesión de técnico: abrir un mantenimiento ya completado y
  confirmar que el tipo se lee pero no se ofrece cambiarlo
- [x] 6.4 **[app]** Con sesión de administrador: confirmar que su formulario de
  edición sigue igual y que puede cambiar el tipo de un mantenimiento cerrado
- [x] 6.5 **[app]** Comprobar que las clases de Tailwind de la pantalla nueva
  compilan de verdad. Una clase que no existe en v4 desaparece en silencio y la
  suite no lo detecta: comparar el estilo computado con lo que la clase debería
  producir, o buscar la regla en las hojas cargadas
- [x] 6.6 **[app]** Confirmar en el historial del equipo que el cambio de tipo dejó
  su asiento, con quién lo hizo y el valor anterior

## 7. Cierre

- [x] 7.1 Ejecutar `pnpm test` y confirmar que pasa
- [x] 7.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint`, y confirmar contra la
  referencia de 1.1 que no se han añadido errores nuevos
- [x] 7.3 Revisar que ninguna tarea quedó marcada sin que su verificación llegara a
  ejecutarse. Si alguna no se pudo comprobar, dejarla sin marcar y decir por qué

## Resultado de la verificación (2026-09-03)

- 1.1: referencia de partida 28 errores de `tsc` y 42 líneas de `lint`. Al
  cerrar: 28 y 42. Ninguno nuevo.
- 2.1: el esquema del técnico gana `tipo` y nada más. `reporteUrl` **no** entró:
  el adjunto tiene ruta propia desde `adjuntos-de-reporte-privados`, y la tarea
  se reescribió para decirlo antes de marcarla.
- 5.4: el archivo se inyectó en el campo por script y se disparó el mismo evento
  que produce elegirlo a mano; el diálogo de archivos del sistema operativo no se
  puede abrir desde aquí. El resto del camino es el real: `POST` a la ruta del
  reporte, 200, y la fila pasó a mostrar «Ver PDF».
- **Defecto encontrado al mirarlo, que la suite no veía:** adjuntar recargaba la
  lista, la recarga deja la página en estado de carga, y eso desmontaba la tabla
  y con ella el diálogo. El técnico perdía lo escrito solo por adjuntar. Ahora el
  aviso se da al cerrar. Cubierto por tres pruebas nuevas.
- Defecto previo corregido de paso: el selector de estado salía vacío porque el
  diálogo se monta una vez por tabla y `useState` congelaba el valor del primer
  render.
- 6.2: sobre la Impresora Cisco, de CORRECTIVO/PROGRAMADO a PREVENTIVO/COMPLETADO
  en un solo guardado. El historial recogió «Tipo cambiado de CORRECTIVO a
  PREVENTIVO» firmado por Pedro Ramírez.
- 6.5: comprobadas contra el CSS compilado, no a ojo: `bg-muted/40` produce alfa
  0.4, `p-4` 16px, `rounded-lg` 8px, `max-h-[90vh]` 648px de 720, `h-9` 36px y
  `font-mono` una familia distinta del cuerpo. Ninguna clase desapareció.
- 6.4: el administrador conserva su formulario completo y sigue pudiendo
  reclasificar un mantenimiento cerrado (200). El valor se restauró tras la
  comprobación.
- Entorno: base en Docker `pyme-maintenance-pg` (puerto 5444), ya levantada de la
  sesión anterior. Las sesiones de técnico y administrador se acuñaron con
  `next-auth/jwt` y el secreto de desarrollo, sin contraseñas.
