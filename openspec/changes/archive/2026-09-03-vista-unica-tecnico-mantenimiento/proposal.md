## Why

El técnico trabaja hoy en dos sitios. Ve el detalle del mantenimiento en una
pantalla y cambia el estado en otra, un diálogo donde solo caben «nuevo estado» y
«observaciones». En el momento de decidir qué estado poner no tiene delante ni el
equipo sobre el que trabaja ni lo que el cliente pidió, que es justo la
información que necesita para decidir.

Al mismo tiempo, todo mantenimiento nacido de una solicitud se guarda como
CORRECTIVO por decreto, y el técnico —la única persona que ve el equipo— no puede
corregirlo. La consecuencia no es cosmética: el desglose preventivo contra
correctivo de los informes no mide el tipo de trabajo realizado, mide quién abrió
el mantenimiento.

## What Changes

### La vista del técnico

- El técnico pasa a trabajar en una sola pantalla: los datos que necesita para
  decidir y el formulario con el que decide dejan de estar separados.
- La pantalla muestra, en lectura, el equipo sobre el que se trabaja, la empresa
  a la que pertenece y la descripción con la que el cliente pidió el servicio.
- El técnico asignado se muestra como dato, no como control: el técnico lo ve
  pero no puede reasignarlo. Repartir el trabajo sigue siendo del administrador y
  del reparto automático que `asignacion-tecnicos` define.
- El técnico puede adjuntar el reporte en PDF desde esa misma pantalla, junto al
  estado y las observaciones, sin pasar por el formulario del administrador.
- **BREAKING** La pantalla que el técnico usa a diario cambia de forma y de
  contenido. Quien ya la conoce va a notarlo desde el primer uso.

### La reclasificación del tipo

- El técnico puede corregir el tipo de un mantenimiento **mientras siga
  abierto**: un equipo que se calienta por suciedad es un preventivo aunque el
  cliente lo reportara como avería, y un preventivo que destapa un fallo grave es
  un correctivo.
- Un mantenimiento ya cerrado —completado o cancelado— conserva su tipo para
  siempre. Los informes ya emitidos no cambian bajo los pies de nadie.
- La condición se evalúa sobre el estado que el mantenimiento tenía al recibir la
  petición, no sobre el que va a quedar. Así el técnico puede reclasificar y
  cerrar en un solo guardado, que es cuando por fin sabe de qué tipo era el
  trabajo. Es el mismo criterio que la cancelación ya aplica hoy.
- Cada cambio de tipo queda registrado con quién lo hizo y desde qué valor. Un
  cambio que mueve un indicador de gestión no puede ser anónimo.

### Lo que el cambio deja igual

- El administrador conserva la edición completa que ya tiene. Este cambio abre
  una vía acotada para el técnico, no le quita nada a nadie.
- El cliente no gana ninguna capacidad nueva.

## Capabilities

### New Capabilities

Ninguna. El comportamiento cae dentro de una capacidad ya publicada.

### Modified Capabilities

- `edicion-mantenimiento`: hoy fija que la vía del técnico se limita a «el estado
  y las observaciones». Ese límite se amplía al tipo y al reporte adjunto, y se
  acota con la condición de que el mantenimiento siga abierto. Se añade además
  que el técnico no puede cambiar el técnico asignado, que hoy se cumple pero no
  está escrito.

## Impact

### Comportamiento observable

Quien más lo nota es el técnico: cambia la pantalla con la que trabaja todos los
días. El administrador y el cliente no ven ninguna diferencia.

El desglose preventivo contra correctivo de los informes empieza a moverse por
decisiones del técnico. Es el objetivo del cambio, pero conviene saberlo antes de
que alguien compare dos informes y no entienda la diferencia.

### Efecto sobre el indicador de fallas recurrentes

`reportes-estadisticas` cuenta como falla recurrente el equipo con dos o más
mantenimientos correctivos no cancelados. Reclasificar un correctivo a preventivo
descuenta uno de esos, y puede sacar al equipo de la lista.

No es un defecto que este cambio introduzca: es la consecuencia de que el dato
empiece a ser cierto. Se registra aquí porque el requisito de
`reportes-estadisticas` no cambia y, sin dejarlo dicho, parecería un efecto
inadvertido. La restricción de no reclasificar lo ya cerrado es lo que impide que
el pasado se reescriba; el presente sí se corrige, y debe hacerlo.

### Código afectado

- `src/components/mantenimientos/cambiar-estado-dialog.tsx` — es la pantalla que
  se rehace. Hoy tiene estado, observaciones y motivo de cancelación.
- `src/lib/validations/mantenimiento.ts` — `cambiarEstadoSchema` admite hoy tres
  campos. Debe admitir el tipo, y **seguir sin admitir** `tecnicoId`: es lo que hoy
  impide que el técnico se reasigne trabajo. El reporte **no** entra aquí:
  `adjuntos-de-reporte-privados` lo sacó de la actualización del mantenimiento y le
  dio ruta propia, así que la pantalla lo adjunta por esa vía y no por este esquema.
- `src/app/api/mantenimientos/[id]/route.ts` — la rama del técnico del `PUT`, que
  aplica los campos y escribe el asiento de historial.
- `src/app/api/mantenimientos/[id]/reporte` — no cambia. Ya comprueba que quien
  adjunta pueda editar el mantenimiento, lo que incluye al técnico con un trabajo
  suyo abierto. La pantalla solo tiene que usarla.
- `src/components/mantenimientos/mantenimientos-table.tsx` — entrega a la pantalla
  los datos de equipo, empresa y descripción que hoy no le pasa.

Sin cambios en `prisma/schema.prisma` y sin migración: `tipo`, `reporteUrl` y
`observaciones` ya existen, y el asiento cabe en `Historial`.

### Evidencia recogida antes de proponer

- `src/lib/crear-mantenimiento.server.ts:66` fija `tipo: "CORRECTIVO"` para todo
  mantenimiento nacido de una solicitud, con el comentario «Una solicitud es
  siempre un problema reportado». Es la razón de que el tipo no distinga hoy nada
  útil.
- `src/lib/estadisticas.ts:204` desglosa el gráfico mensual por ese mismo campo.
  Con el valor fijado en la creación, ese desglose separa «lo creó el
  administrador» de «lo pidió el cliente», no preventivo de correctivo.
- `src/app/api/mantenimientos/[id]/route.ts:187` demuestra que la vía del técnico
  ya existe y está bien acotada: comprueba que el mantenimiento es suyo y valida
  con un esquema propio y más estrecho que el del administrador. El cambio
  ensancha ese esquema, no abre uno nuevo.
- `src/app/api/mantenimientos/[id]/route.ts:209` es el precedente del criterio de
  «estado anterior»: la cancelación se detecta comparando el estado que llega con
  el que el mantenimiento ya tenía.
- El formulario del administrador (`mantenimiento-form.tsx`) ya tiene construidos
  el selector de tipo y la subida de PDF. El trabajo de este cambio es de
  permisos y de composición, no de piezas nuevas.

## Fuera de alcance

Registrado a propósito. No se implementa aquí:

- **Dónde se guardan los PDF adjuntos y quién puede abrirlos.** Se resolvió en
  `adjuntos-de-reporte-privados`, que entró antes que este por ese motivo: los
  reportes viven ya en un directorio privado y se entregan solo a quien tiene
  alcance sobre el mantenimiento. Este cambio da por hecha esa custodia y no la
  toca; lo que aporta es que el técnico llegue a ella desde su pantalla.
- **Que el técnico se reasigne trabajo.** El selector de técnico aparece en el
  boceto recibido, pero abrirlo dejaría sin efecto el reparto automático que
  `asignacion-tecnicos` define. Se muestra en lectura.
- **Reclasificar un mantenimiento ya cerrado.** Se descarta a propósito: haría que
  un informe emitido cambiara después de emitirse. Si más adelante hace falta
  corregir un cierre equivocado, es una operación del administrador con su propio
  registro, no una edición silenciosa del técnico.
- **Un tipo distinto de PREVENTIVO o CORRECTIVO.** Los dos valores actuales bastan
  para lo que el cambio persigue. Añadir un tercero es una decisión de negocio que
  nadie ha pedido.
- **Las marcas de tiempo del ciclo de vida.** Sigue sin poder medirse el tiempo
  real de resolución de un ticket. Este cambio no lo mejora ni lo empeora.
- **Quién puede crear equipos.** Se detectó al explorar que un cliente puede
  crearlos, contra lo decidido, pero es independiente de esta pantalla.
