## Why

Hoy el administrador elige el técnico a mano en cada mantenimiento, sin ninguna
visibilidad de cuánta carga tiene ya cada uno, lo que produce un reparto desigual
dentro de las empresas con varios técnicos. Se acordó con el cliente repartir
automáticamente al técnico con menos carga, dejando la reasignación manual como
válvula de escape — pero esa válvula está rota: el endpoint de actualización
descarta el técnico enviado sin avisar, así que hoy reasignar es un no-op
silencioso.

## What Changes

- El sistema asigna automáticamente el técnico al crear un mantenimiento cuando
  el administrador no envía uno: elige entre los técnicos activos de la empresa
  dueña del equipo, el de menor carga, con desempate aleatorio.
- `tecnicoId` pasa de obligatorio a opcional al crear un mantenimiento. Si el
  administrador lo envía, su elección manda sobre el reparto automático.
- Se repara la reasignación manual: cambiar el técnico de un mantenimiento
  existente pasa a persistirse (hoy la API responde éxito y no guarda el cambio).
- La reasignación queda registrada en el historial del equipo, igual que hoy se
  registran los cambios de estado.
- El servidor valida que el técnico asignado esté activo y pertenezca a la
  empresa del equipo, tanto al crear como al reasignar. Hoy esa regla solo la
  aplica el formulario.
- Los técnicos inactivos dejan de aparecer como candidatos.
- Crear un mantenimiento para una empresa sin técnicos activos devuelve un error
  explicable en lugar de fallar de forma opaca.

Fuera de alcance (registrado a propósito, no se implementa aquí):

- Agenda, horarios o vacaciones por técnico. "Disponibilidad" se resuelve como
  carga de trabajo, no como calendario, por decisión del cliente.
- Que el cliente elija técnico al abrir su solicitud: descartado por el cliente.
- Especialización por técnico: descartada por el cliente.
- Restringir `GET /api/usuarios?role=TECNICO` a administradores. Ese endpoint
  quedó abierto a cualquier usuario autenticado para que el cliente pudiera ver
  técnicos; al descartarse esa función deja de tener motivo, pero endurecerlo es
  un cambio de permisos aparte.

## Capabilities

### New Capabilities

- `asignacion-tecnicos`: cómo se elige el técnico responsable de un
  mantenimiento — reparto automático por carga dentro de la empresa,
  reasignación manual por parte del administrador, y las reglas de validez de
  una asignación.

### Modified Capabilities

Ninguna. El proyecto todavía no tiene specs publicadas en `openspec/specs/`;
esta es la primera capacidad que se documenta.

## Impact

Código afectado:

- `src/app/api/mantenimientos/route.ts` — `POST`: selección automática cuando no
  llega `tecnicoId`, validación de empresa y de técnico activo.
- `src/app/api/mantenimientos/[id]/route.ts` — `PUT`: persistir `tecnicoId`
  (hoy nunca se copia a `updateData`), validar el nuevo técnico y registrar la
  reasignación en el historial.
- `src/lib/validations/mantenimiento.ts` — `tecnicoId` deja de ser obligatorio en
  `mantenimientoSchema`.
- `src/app/api/usuarios/route.ts` — el listado de técnicos debe poder excluir
  inactivos.
- `src/components/mantenimientos/mantenimiento-form.tsx` — el campo de técnico
  admite quedar vacío para delegar en el reparto automático.

Sin cambios en `prisma/schema.prisma`: el modelo actual ya cubre el caso, porque
un técnico pertenece a una sola empresa y `Mantenimiento` ya llega a la empresa
a través de `Equipo`.

Datos existentes: no requieren migración. Los mantenimientos ya creados
conservan su técnico y cuentan como carga histórica desde el primer reparto.
