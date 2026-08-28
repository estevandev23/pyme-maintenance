## Purpose

Define qué se puede cambiar de un mantenimiento ya creado y qué garantiza la
respuesta de la API al actualizarlo: en concreto, que el equipo sobre el que se
realiza un mantenimiento queda fijado al crearlo, y que un campo aceptado por la
validación nunca se descarta en silencio.

## ADDED Requirements

### Requirement: El equipo de un mantenimiento queda fijado al crearlo

El sistema SHALL rechazar la actualización de un mantenimiento cuando indique un
equipo distinto al que tiene asignado, y MUST responder con un mensaje que
explique que el equipo no puede cambiarse después de crear el mantenimiento.

#### Scenario: Se intenta mover el mantenimiento a otro equipo

- **WHEN** se actualiza un mantenimiento indicando un `equipoId` distinto al suyo
- **THEN** la actualización es rechazada
- **AND** el mantenimiento conserva su equipo
- **AND** la respuesta explica que el equipo no puede cambiarse

#### Scenario: Ningún otro campo se guarda en una actualización rechazada

- **WHEN** una actualización indica a la vez un equipo distinto y una descripción
  nueva
- **THEN** la actualización es rechazada
- **AND** el mantenimiento conserva también su descripción anterior

### Requirement: Reenviar el equipo actual no es un cambio

El sistema SHALL aceptar una actualización que incluya el `equipoId` que el
mantenimiento ya tiene, y MUST tratarla como una actualización normal de los
demás campos.

#### Scenario: El formulario guarda reenviando el equipo actual

- **WHEN** se actualiza un mantenimiento enviando su propio `equipoId` junto con
  una descripción nueva
- **THEN** la actualización se acepta
- **AND** la descripción queda guardada

#### Scenario: Una actualización que omite el equipo se acepta

- **WHEN** se actualiza un mantenimiento sin incluir el campo `equipoId`
- **THEN** la actualización se acepta
- **AND** el mantenimiento conserva su equipo

### Requirement: La actualización no descarta campos en silencio

El sistema MUST NOT responder éxito a una actualización cuando alguno de los
campos enviados y aceptados por la validación no llegó a aplicarse. Ante un campo
que no puede aplicarse, SHALL rechazar la operación indicando el motivo.

#### Scenario: Éxito significa que lo enviado quedó guardado

- **WHEN** una actualización de mantenimiento responde éxito
- **THEN** una consulta posterior devuelve los valores enviados en esa
  actualización
