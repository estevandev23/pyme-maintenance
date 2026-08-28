## Context

Ver `proposal.md` — Why para la motivación.

Restricciones del estado actual que condicionan el enfoque:

- El `PUT` construye `updateData` campo a campo. Tras
  `asignacion-automatica-tecnicos`, que reparó `tecnicoId`, `equipoId` es el
  único campo que la validación acepta y el objeto de actualización nunca recibe.
- El formulario deshabilita los selectores de empresa y equipo al editar
  (`mantenimiento-form.tsx`), pero **sí envía** el `equipoId` actual en cada
  guardado, porque manda el formulario completo. Cualquier solución debe dejar
  pasar ese caso.
- Las entradas de `Historial` se anclan al equipo (`Historial.equipoId`) y el
  `PUT` las crea siempre contra `existingMantenimiento.equipoId`. Un traslado
  real obligaría a decidir qué pasa con el historial ya escrito.
- Un técnico pertenece a una sola empresa. Un traslado a un equipo de otra
  empresa dejaría al técnico asignado fuera del conjunto de candidatos que define
  `asignacion-tecnicos`.

## Goals / Non-Goals

**Goals:**

- Que una respuesta de éxito signifique que lo enviado quedó guardado.
- Que el rechazo diga qué pasó y qué hacer en su lugar, no un 400 genérico.
- No cambiar la edición normal, que hoy funciona y reenvía el equipo actual.

**Non-Goals:**

- Construir el traslado de un mantenimiento entre equipos.
- Tocar el formulario. Ya impide el caso; el servidor solo deja de mentir cuando
  alguien llama a la API directamente.

## Decisions

### Se compara contra el equipo guardado, no se prohíbe el campo

El rechazo se dispara cuando `equipoId` llega **y difiere** del que tiene el
mantenimiento. Su mera presencia no es un error.

Es la única opción compatible con el formulario, que envía el objeto completo en
cada guardado. Prohibir el campo dejaría la edición inservible.

### Se rechaza en lugar de trasladar

Alternativa considerada: implementar el traslado. Rechazada por desproporcionada
frente a la demanda —nadie la ha pedido y la UI la bloquea a propósito— y porque
arrastra tres decisiones abiertas: el estado de los dos equipos, el destino de
las entradas de historial ya escritas, y si se permite cruzar de empresa, que
invalidaría al técnico asignado.

Si el cliente la pide, el rechazo que se implementa aquí es el punto de partida
correcto: el traslado se convierte entonces en levantar una restricción explícita
y visible, no en descubrir que un campo llevaba tiempo perdiéndose.

### Quitar `equipoId` del esquema NO resuelve el problema

Alternativa considerada y descartada por incorrecta: eliminar `equipoId` de
`updateMantenimientoSchema` para que la validación no lo acepte. Zod descarta por
omisión las claves desconocidas en lugar de fallar, así que el campo seguiría
llegando, seguiría perdiéndose y la respuesta seguiría siendo 200. Reproduciría
exactamente el defecto que se quiere eliminar.

### La comprobación se extrae a una función pura

El guardia vive en una función que recibe el equipo enviado y el guardado y
decide, sin tocar Prisma ni la petición. Sigue el patrón que
`asignacion-automatica-tecnicos` estableció con `src/lib/asignacion-tecnicos.ts`:
el proyecto no tiene arnés de pruebas para rutas de API, así que la lógica
verificable se saca del handler para poder cubrirla con `npm test`.

## Risks / Trade-offs

- **Un cliente directo que hoy recibe 200 empezará a recibir 400.** Es el
  objetivo del cambio, pero es un cambio observable para quien llame a la API
  fuera del formulario. → Al volumen actual no se conocen esos clientes; la UI es
  el único consumidor. Mencionarlo al entregar.
- **El rechazo puede leerse como una regresión.** Quien probara a mover un
  mantenimiento y viera "guardado" pensará que la función existía y se rompió. →
  El mensaje debe decir que el equipo se fija al crear y sugerir la alternativa
  (cancelar el mantenimiento y crear uno nuevo sobre el equipo correcto).
- **`fechaRealizada` sigue con el mismo defecto de fondo.** Este cambio deja el
  endpoint honesto respecto a `equipoId`, no respecto a todo. → Queda registrado
  en el `proposal.md` como fuera de alcance para que no se dé por resuelto.

## Migration Plan

No hay migración de datos ni cambios de esquema. El despliegue es directo y el
retroceso consiste en revertir el código.

## Open Questions

Ninguna.
