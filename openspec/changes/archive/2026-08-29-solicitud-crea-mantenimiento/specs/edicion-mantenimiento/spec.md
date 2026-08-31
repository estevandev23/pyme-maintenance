## MODIFIED Requirements

### Requirement: La actualización no descarta campos en silencio

El sistema MUST NOT responder éxito a una actualización cuando alguno de los
campos enviados y aceptados por la validación no llegó a aplicarse. Ante un campo
que no puede aplicarse, SHALL rechazar la operación indicando el motivo.

Esto SHALL incluir el vaciado deliberado de un campo que admite quedar vacío:
retirar el técnico de un mantenimiento es una actualización como cualquier otra
y MUST guardarse, no ignorarse.

#### Scenario: Éxito significa que lo enviado quedó guardado

- **WHEN** una actualización de mantenimiento responde éxito
- **THEN** una consulta posterior devuelve los valores enviados en esa
  actualización

#### Scenario: Retirar el técnico no se ignora en silencio

- **WHEN** el administrador actualiza un mantenimiento retirando el técnico
  asignado
- **THEN** la respuesta no indica éxito con el técnico anterior aún guardado
- **AND** una consulta posterior devuelve el mantenimiento sin técnico

## ADDED Requirements

### Requirement: Solo el administrador modifica un mantenimiento

El sistema SHALL restringir al administrador la modificación completa de un
mantenimiento. Un cliente MUST NOT poder modificar el estado, las fechas, la
descripción ni el técnico de ningún mantenimiento, ni de su empresa ni de otra.

Esto MUST NOT afectar a las dos vías acotadas que otros roles sí conservan: el
técnico cambia el estado y las observaciones de los mantenimientos asignados a
él, y el cliente cancela su propia solicitud dentro de las condiciones que
`flujo-de-solicitudes` establece.

#### Scenario: Un cliente intenta modificar un mantenimiento

- **WHEN** un cliente intenta modificar un mantenimiento, sea de su empresa o de
  otra
- **THEN** el sistema le niega la operación

#### Scenario: El técnico conserva su vía acotada

- **WHEN** un técnico cambia el estado o las observaciones de un mantenimiento
  asignado a él
- **THEN** la operación se aplica

#### Scenario: La cancelación del cliente sigue disponible

- **WHEN** un cliente cancela su propia solicitud dentro de las condiciones
  admitidas
- **THEN** la cancelación se aplica

### Requirement: El estado del equipo refleja si hay trabajo con técnico

Un equipo SHALL figurar en mantenimiento cuando exista al menos un mantenimiento
abierto sobre él **con técnico asignado**, y SHALL dejar de figurar así cuando no
quede ninguno. Un mantenimiento abierto sin técnico asignado MUST NOT poner al
equipo en mantenimiento ni impedir que salga de ese estado.

#### Scenario: Se asigna técnico a un mantenimiento que no lo tenía

- **WHEN** el administrador asigna un técnico a un mantenimiento abierto que no
  lo tenía
- **THEN** el equipo pasa a figurar en mantenimiento
- **AND** ocurre aunque el estado del mantenimiento no haya cambiado

#### Scenario: Se retira el técnico del único trabajo abierto

- **WHEN** el administrador retira el técnico del único mantenimiento abierto de
  un equipo que figuraba en mantenimiento
- **THEN** el equipo deja de figurar en mantenimiento

#### Scenario: Un trabajo sin técnico no retiene al equipo

- **WHEN** se cierra el único mantenimiento con técnico de un equipo que además
  tiene un mantenimiento abierto sin técnico
- **THEN** el equipo deja de figurar en mantenimiento

#### Scenario: Dos trabajos con técnico, se cierra uno

- **WHEN** se cierra uno de los dos mantenimientos abiertos con técnico de un
  equipo
- **THEN** el equipo sigue figurando en mantenimiento

#### Scenario: Salir de mantenimiento no resucita un equipo retirado

- **WHEN** se cierra el último mantenimiento abierto de un equipo que estaba
  inactivo o dado de baja
- **THEN** el equipo conserva el estado que tenía
- **AND** no pasa a figurar como activo

#### Scenario: Eliminar un mantenimiento recalcula el estado del equipo

- **WHEN** un administrador elimina el único mantenimiento abierto con técnico
  de un equipo
- **THEN** el equipo deja de figurar en mantenimiento
