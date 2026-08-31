> Convención: las tareas marcadas con **[app]** solo se pueden dar por buenas con
> la aplicación corriendo y datos reales delante. El resto se verifican con la
> suite, el compilador o el linter. Recordatorio del proyecto: la suite corre en
> jsdom y no compila CSS, así que un verde no es evidencia de nada visual.

## 1. Capturar el estado de partida

Este cambio mueve las cifras del panel, el contenido de la pantalla de alertas y
el estado de los equipos. Sin una foto previa no habrá con qué comparar.

- [x] 1.1 Ejecutar `pnpm test`, `pnpm exec tsc --noEmit` y `pnpm lint` y guardar la salida como referencia, para poder distinguir después los errores nuevos de los que ya arrastraba el repositorio
- [x] 1.2 **[app]** Capturar el panel, la pantalla de alertas y el listado de equipos con los datos actuales, anotando: número de alertas por categoría, contador del distintivo de la barra lateral, equipos con fallas recurrentes y cuántos equipos figuran en mantenimiento
- [x] 1.3 Anotar cuántos mantenimientos existen y confirmar que todos tienen técnico, para saber que la migración no encuentra filas incompatibles
- [x] 1.4 Contar las solicitudes por estado. Las pendientes y en revisión miden el trabajo manual del primer día; las aprobadas, cuántos mantenimientos se quedan sin poder señalar su origen y sin la protección de borrado

## 2. Cerrar los riesgos antes de tocar nada

Estas tareas van primero porque evitan daño, no porque construyan nada.

- [x] 2.1 Añadir un doble del módulo de correo al arranque de pruebas y verificar que ninguna prueba puede alcanzar el envío real; comprobarlo con una prueba que llame al módulo y afirme que el doble se invocó
- [x] 2.2 Sustituir en el script de siembra los dominios de correo por dominios reservados para pruebas, y verificar que ninguna dirección sembrada apunta a un dominio registrable
- [x] 2.3 Hacer opcional el técnico en los contratos escritos a mano —el tipo del mantenimiento, el del próximo mantenimiento de estadísticas, los de las dos bibliotecas de exportación y la interfaz local de la tabla del panel— y verificar que `pnpm exec tsc --noEmit` señala entonces las lecturas rotas, que hasta ahora no señalaba
- [x] 2.4 Hacer que las tres pantallas que muestran el técnico toleren su ausencia —listado de mantenimientos, detalle del mantenimiento y tabla de próximos del panel— y verificar con una prueba de componente que se rinden sin técnico
- [x] 2.5 Hacer que los dos manejadores de exportación de la pantalla de mantenimientos toleren el técnico ausente y verificar con las pruebas de exportación ampliadas con un caso sin técnico
- [x] 2.6 Hacer que la pantalla de alertas tolere una categoría que no conozca, y verificar con una prueba de componente que una alerta de tipo desconocido no impide pintar el resto
- [x] 2.7 Restringir al administrador la rama de edición completa del mantenimiento, dejando intactas las dos vías acotadas del técnico y del cliente; verificar con pruebas de la ruta para los tres roles
- [x] 2.8 Corregir la comprobación de pertenencia al crear una solicitud para que un cliente sin empresa no alcance equipos ajenos, y verificar con una prueba de la ruta

## 3. Esquema y migración

- [x] 3.1 Hacer opcional el técnico del mantenimiento **declarando explícitamente la acción de borrado**, añadir el enlace único y opcional a la solicitud con borrado restringido, los campos de motivo y autor de la cancelación, y el valor `CANCELADA` en los estados de solicitud
- [x] 3.2 Añadir el modelo de configuración operativa con su valor por defecto
- [x] 3.3 Generar y aplicar la migración y regenerar el cliente de Prisma; verificar que `pnpm exec tsc --noEmit` no arroja más errores que los anotados en 1.1 y los ya resueltos en 2.3
- [x] 3.4 Invertir en el script de siembra el orden de borrado para que los mantenimientos se eliminen antes que las solicitudes, y verificar ejecutando la siembra sobre una base con datos
- [x] 3.5 Hacer que el script de siembra cree solicitudes con su mantenimiento, derive el estado de cada equipo de los mantenimientos que crea en lugar de sortearlo, y tolere una empresa sin técnicos; verificar que tras sembrar no queda ningún equipo en mantenimiento sin trabajo abierto con técnico

## 4. Reglas en funciones puras

- [x] 4.1 Escribir la función que decide si una solicitud se puede cancelar a partir del estado de su mantenimiento, con pruebas unitarias que cubran los cuatro estados
- [x] 4.2 Cambiar el cálculo de la carga histórica para que no cuente los cancelados salvo cuando canceló el propio técnico, **filtrando al acumular y no en la consulta**, con pruebas unitarias que cubran ambos casos
- [x] 4.3 Corregir los comentarios que describen la carga histórica como «en cualquier estado» y verificar que ningún comentario del módulo contradice el comportamiento
- [x] 4.4 Actualizar la prueba existente que afirma que todos los estados cuentan como histórico, incluido su nombre, y verificar que la suite de asignación vuelve a estar en verde

## 5. Creación del mantenimiento a partir de una solicitud

- [x] 5.1 Escribir la variante del reparto que devuelve la ausencia de candidatos en lugar de abortar, con pruebas unitarias
- [x] 5.2 Crear el mantenimiento dentro de la creación de la solicitud, en una transacción, con tipo correctivo, la descripción heredada y la fecha calculada **contando desde el día de creación del mantenimiento, no desde el de la solicitud**; verificar con una prueba de la ruta que una solicitud produce solicitud y mantenimiento enlazados con la fecha esperada
- [x] 5.3 Cubrir con una prueba de la ruta el caso sin técnicos: la solicitud y el mantenimiento se crean, el mantenimiento queda sin técnico y el equipo no cambia de estado
- [x] 5.4 Resolver la entrada de historial de la creación firmándola con quien la provoca, y verificar con una prueba que la entrada existe también cuando no hay técnico
- [x] 5.5 Condicionar el paso del equipo a «en mantenimiento» a que el mantenimiento tenga técnico, y verificar con una prueba de la ruta
- [x] 5.6 Extraer a una función reutilizable la creación del mantenimiento a partir de una solicitud, **incluyendo el cálculo de la fecha, el reparto de técnico, el asiento de historial y el cambio de estado del equipo**, para que la vía automática y la manual no diverjan; verificar que siguen pasando las pruebas de 5.2 a 5.5 contra la función extraída
- [x] 5.7 Añadir la acción del administrador para crear el mantenimiento de una solicitud pendiente o en revisión, reutilizando esa función y dejando la solicitud aprobada; verificar con pruebas de la ruta: el caso normal con la solicitud quedando aprobada, la fecha contada desde hoy y no desde la solicitud, el caso sin técnicos disponibles, la reparación tras eliminar un mantenimiento anterior, el intento sobre una solicitud aprobada, rechazada o cancelada, y el intento desde un cliente
- [x] 5.8 Traducir el conflicto de unicidad del enlace al mismo mensaje explicable que la comprobación previa, para que dos peticiones simultáneas no devuelvan un error interno; verificar con una prueba que fuerce el conflicto

## 6. El mantenimiento sin técnico a lo largo de su vida

- [x] 6.1 Corregir la lectura del técnico anterior al reasignar para que no falle cuando no lo hay, y verificar con una prueba que asignar técnico a un mantenimiento huérfano responde correctamente
- [x] 6.2 Sacar el recálculo del estado del equipo de la condición de «ha cambiado el estado», para que asignar y retirar técnico lo disparen; verificar con pruebas los dos sentidos
- [x] 6.3 Hacer que el recuento de trabajo abierto que devuelve el equipo a activo cuente solo mantenimientos con técnico, y verificar con una prueba el caso de un huérfano abierto junto a uno que se completa
- [x] 6.4 Hacer que la vuelta atrás del estado del equipo parta del estado real en lugar de escribir «activo» a ciegas, y verificar con una prueba que un equipo dado de baja no resucita al cancelarse su mantenimiento
- [x] 6.5 Implementar la retirada del técnico en el servidor, distinguiendo el campo ausente (asignación automática, solo al crear) del vacío explícito (retirar, solo al actualizar); verificar con pruebas que una consulta posterior devuelve el mantenimiento sin técnico y que crear sin indicar técnico sigue repartiendo
- [x] 6.6 Ofrecer la retirada en el formulario de mantenimiento al editar, distinguible de la asignación automática, y comprobar que editar un mantenimiento sin técnico no deja el selector en un estado inválido
- [x] 6.7 Registrar en el historial la primera asignación y la retirada, dejando constancia de la ausencia de técnico en el extremo que corresponda; verificar con pruebas
- [x] 6.8 Añadir al listado de mantenimientos un filtro por «sin técnico asignado», en la consulta y en el selector de la pantalla, y verificar con una prueba de la ruta
- [x] 6.9 **[app]** Comprobar viendo la pantalla que un mantenimiento sin técnico se muestra completo y legible en el listado, en el detalle, en el panel y en los archivos exportados, y que se entiende que está a la espera

## 7. Avisos y criterio de fechas

- [x] 7.1 Cambiar el criterio de «atrasado» y «próximo» del servidor a día natural, alineado con el de la tabla, y verificar con una prueba de la ruta que un mantenimiento fechado hoy no sale atrasado a ninguna hora del día
- [x] 7.2 Añadir la categoría de aviso «sin técnico asignado» a la respuesta de alertas, con su recuento, su tarjeta, su botón de filtro y su enlace al mantenimiento; verificar con una prueba de la ruta que aparece, se cuenta y desaparece al asignar
- [x] 7.3 Acotar por rol la categoría nueva para que no llegue al cliente como incidencia suya ni al técnico como trabajo propio, y verificar con pruebas de la ruta para los tres roles
- [x] 7.4 **[app]** Comprobar viendo las dos pantallas que un mismo mantenimiento fechado hoy se presenta igual en la pantalla de alertas y en el listado de mantenimientos, y que la rejilla de tarjetas y el distintivo de la barra lateral encajan con una categoría más

## 8. Configuración operativa

- [x] 8.1 Crear la lectura de la configuración con valor por defecto cuando no existe la fila, y verificar con una prueba unitaria sobre una base sin configuración guardada
- [x] 8.2 Crear la ruta de configuración con acceso restringido al administrador y la validación del rango admitido; verificar con pruebas de la ruta los tres roles y los valores fuera de rango
- [x] 8.3 Crear la pantalla de configuración y resolver **las dos** entradas de menú comentadas —la de la barra lateral y la de la cabecera—, moviéndolas al listado que filtra por rol; verificar que no se ofrece a cliente ni a técnico por ninguna de las dos vías
- [x] 8.4 Usar el valor configurado al calcular la fecha del mantenimiento, y verificar con una prueba de la ruta que cambiar la configuración cambia la fecha de la siguiente solicitud
- [x] 8.5 **[app]** Comprobar de extremo a extremo: cambiar el valor en la pantalla, registrar una solicitud y ver la fecha resultante en el mantenimiento

## 9. Cancelación

- [x] 9.1 Añadir la validación del motivo obligatorio **sobre el esquema derivado, nunca sobre el base**, y verificar con una prueba que importar el módulo de validación no lanza y que cancelar sin motivo se rechaza
- [x] 9.2 Devolver un mensaje explicable cuando falta el motivo, en lugar del error genérico de validación, y verificar con una prueba de la ruta que el texto identifica el campo que falta
- [x] 9.3 Implementar la cancelación del cliente: comprobar el estado del mantenimiento, poner la solicitud en `CANCELADA` y el mantenimiento en cancelado dentro de una transacción, guardar motivo y autor, escribir la entrada de historial y recalcular el estado del equipo; verificar con pruebas de la ruta los casos programado, en proceso y completado
- [x] 9.4 Extraer a un sitio compartido la regla del estado del equipo para poder aplicarla desde la cancelación sin duplicarla, y verificar que ambas rutas producen el mismo resultado
- [x] 9.5 Exigir motivo también al técnico y al administrador al cancelar, guardando autor y entrada de historial en ambos casos; verificar con pruebas de la ruta para los dos roles
- [x] 9.6 Propagar la cancelación de un mantenimiento a su solicitud de origen, con el mismo motivo y autor, cancele quien cancele y por la vía que sea; verificar con pruebas que un mantenimiento sin origen no afecta a ninguna solicitud
- [x] 9.7 Dar al administrador una forma de cancelar que pida el motivo sin abrir el formulario de edición completo, y verificar con una prueba de la ruta que cancelar por esa vía no modifica descripción, fechas ni informe
- [x] 9.8 Traer a la consulta de solicitudes el mantenimiento enlazado —su identificador, su estado, su técnico, el motivo de cancelación y quién canceló—, añadiéndolo al tipo de la solicitud; verificar con una prueba de la ruta que llegan los cinco datos y que una solicitud sin mantenimiento se distingue de una que lo tiene
- [x] 9.9 Ocultar la opción de cancelar en la interfaz cuando el mantenimiento ya no lo admite, apoyándose en la función de 4.1, y añadir confirmación previa
- [x] 9.10 Presentar el estado `CANCELADA` con rótulo y distintivo propios, distinto del de «Rechazada», y añadirlo al filtro por estado de la pantalla
- [x] 9.11 Presentar el motivo identificando a su autor y retirar el rótulo «Respuesta del administrador» de lo que no escribió el administrador
- [x] 9.12 **[app]** Comprobar viendo la pantalla el ciclo completo desde la cuenta de un cliente: cancelar a tiempo con motivo, ver el estado y el autor, y comprobar que la opción no aparece cuando el técnico ya empezó

## 10. Enlace y consistencia

- [x] 10.1 Traer la solicitud de origen a la consulta del listado de mantenimientos —que es la que alimenta el diálogo de detalle— y mostrarla con enlace; verificar que un mantenimiento creado desde el formulario, sin partir de una solicitud, no muestra ningún origen
- [x] 10.2 Rechazar con un mensaje explicable el borrado de una solicitud con mantenimiento asociado, y verificar con una prueba de la ruta que la respuesta no es un error en crudo
- [x] 10.3 Recalcular el estado del equipo al eliminar un mantenimiento, y verificar con una prueba que el equipo no queda atascado
- [x] 10.4 Devolver a pendiente la solicitud de un mantenimiento que se elimina, y verificar con una prueba de la ruta que después se le puede crear uno nuevo
- [x] 10.5 Contar también las solicitudes en la comprobación previa al borrado de un equipo, y verificar con una prueba de la ruta que el equipo no se borra arrastrándolas
- [x] 10.6 Contar las solicitudes del cliente en la comprobación previa al borrado de un usuario, y verificar con una prueba de la ruta que se rechaza con explicación en lugar de fallar contra la base de datos

## 11. Retirada del flujo de aprobación

- [x] 11.1 Retirar del servidor las transiciones de estado de solicitud que el administrador ya no debe provocar, y verificar con una prueba de la ruta
- [x] 11.2 Retirar de la interfaz las acciones de aprobar, rechazar y marcar en revisión, el diálogo de revisión, el aviso de pendientes y la redirección al formulario de mantenimiento
- [x] 11.3 Retirar de la **pantalla** de mantenimientos la lectura de los parámetros de dirección `create`, `equipoId` y `descripcion`, junto con el prefijado que alimentan y la prop que pasan al formulario; verificar que una dirección con esos parámetros —que sobrevive en marcadores y en el historial del navegador— ya no abre ningún diálogo de creación
- [x] 11.4 Ofrecer al administrador la acción de crear el mantenimiento **solo sobre las solicitudes pendientes o en revisión**, nunca sobre las aprobadas, para no duplicar el trabajo de las anteriores al cambio, que tienen mantenimiento sin enlace; apoyarse en el dato que 9.8 ya trae
- [x] 11.5 **[app]** Comprobar viendo la pantalla que a un administrador no le queda ninguna acción de aprobación, que el filtro por estado sigue funcionando, y que sobre una solicitud anterior al cambio puede crear el mantenimiento o eliminarla

## 12. Correo

- [x] 12.1 Añadir al módulo de correo el aviso al cliente, con el detalle, el equipo, la fecha y el técnico o su ausencia, y **con un tope de tiempo explícito**; verificar con una prueba sobre el doble que se compone con los dos contenidos
- [x] 12.2 Enviarlo después de confirmar la transacción y dentro de su propio tratamiento de errores, **en las dos vías de creación**; verificar con pruebas que un fallo del envío deja la solicitud creada y responde éxito, y que lo mismo ocurre cuando el mantenimiento lo crea el administrador
- [x] 12.3 **[app]** Comprobar el envío real una sola vez contra una dirección propia, con los dos casos: con técnico y sin él

## 13. Informes

- [x] 13.1 Excluir los mantenimientos cancelados del indicador de fallas recurrentes, y verificar con una prueba de estadísticas los dos casos
- [x] 13.2 Verificar con la prueba de paridad existente que el archivo exportado excluye lo mismo que la pantalla

## 14. Cierre

- [x] 14.1 Ejecutar `pnpm test` y comprobar contra la referencia de 1.1 que no hay fallos nuevos
- [x] 14.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint` y comprobar contra la referencia de 1.1 que no hay errores nuevos
- [x] 14.3 **[app]** Recorrer el flujo completo con datos sembrados: solicitud con técnico, solicitud sin técnico, asignación posterior, retirada de técnico, cancelación con motivo por cada uno de los tres roles, borrado bloqueado, y el ciclo de reparación —eliminar el mantenimiento de una solicitud y volvérselo a crear desde la pantalla de solicitudes
- [x] 14.4 **[app]** Comparar el panel, las alertas y el listado de equipos con la foto de 1.2 y explicar cada diferencia; una diferencia sin explicación es un defecto, no un efecto esperado
