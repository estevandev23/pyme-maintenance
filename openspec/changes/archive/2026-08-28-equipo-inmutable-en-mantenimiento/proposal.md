## Why

`PUT /api/mantenimientos/[id]` arma su objeto de actualización campo por campo y
nunca copia `equipoId`. La validación con Zod acepta el campo, la respuesta es
200, y el cambio se pierde: mover un mantenimiento a otro equipo es hoy un no-op
silencioso. Es el mismo defecto que `asignacion-automatica-tecnicos` reparó para
`tecnicoId`, y `equipoId` es el último campo aceptado por la validación que sigue
descartándose sin avisar.

Se decidió no construir el traslado, sino rechazarlo con un motivo. Mover un
mantenimiento entre equipos no lo ha pedido nadie, el formulario ya lo impide
—deshabilita los selectores de empresa y equipo al editar— y hacerlo de verdad
arrastraría sincronizar el estado de los dos equipos, decidir a qué equipo van
las entradas del historial, y revalidar el técnico, porque un técnico pertenece a
una sola empresa y mover el mantenimiento a un equipo de otra empresa rompería la
invariante que establece `asignacion-tecnicos`.

## What Changes

- `PUT /api/mantenimientos/[id]` rechaza con un mensaje explicable la
  actualización que trae un `equipoId` distinto al del mantenimiento.
- Reenviar el mismo `equipoId` sigue siendo válido y no altera nada. Es lo que
  hace hoy el formulario en cada guardado, así que la edición normal no cambia.
- Con esto, ningún campo que la validación acepta en ese endpoint se descarta ya
  en silencio.

Fuera de alcance (registrado a propósito, no se implementa aquí):

- **Permitir mover un mantenimiento a otro equipo.** Es la función que este
  cambio decide no construir. Si el cliente la pide, será un cambio propio con su
  propia decisión sobre si se permite cruzar de empresa.
- **`fechaRealizada` no se puede limpiar.** El mismo endpoint copia esa fecha con
  `if (validatedData.fechaRealizada)` en lugar de comparar contra `undefined`,
  así que enviar `null` para borrarla se descarta en silencio y la respuesta es
  200. Es el mismo patrón de defecto, detectado al revisar este, pero es un campo
  distinto con su propia decisión de producto: si borrar la fecha debe permitirse
  o no. Queda anotado aquí para no perderlo.

## Capabilities

### New Capabilities

- `edicion-mantenimiento`: qué se puede cambiar de un mantenimiento ya creado y
  qué garantiza la respuesta de la API — en particular, que un campo aceptado por
  la validación no se descarta sin avisar.

### Modified Capabilities

Ninguna. `asignacion-tecnicos` cubre la reasignación de técnico y no se toca.

## Impact

Código afectado:

- `src/app/api/mantenimientos/[id]/route.ts` — `PUT`: comprobar `equipoId` contra
  el del mantenimiento existente antes de actualizar, y rechazar si difiere.

Sin cambios en `prisma/schema.prisma`, en el formulario ni en los demás
endpoints. El formulario ya deshabilita el selector de equipo al editar
(`mantenimiento-form.tsx`), así que no necesita ajuste.

Datos existentes: no requieren migración. Ningún mantenimiento tiene hoy un
equipo incorrecto por esta causa, porque el cambio nunca llegó a guardarse.
