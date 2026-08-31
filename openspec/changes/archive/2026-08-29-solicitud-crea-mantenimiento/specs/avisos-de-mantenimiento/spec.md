## Purpose

Define de qué avisa el sistema sobre el estado de los mantenimientos —lo que va
con retraso, lo que está a punto de vencer y lo que espera técnico—, con qué
criterio de fechas y quién ve cada aviso.

## ADDED Requirements

### Requirement: El retraso se mide por días naturales

El sistema SHALL decidir si un mantenimiento va con retraso comparando días
naturales, no instantes. Un mantenimiento programado para el día en curso MUST
NOT presentarse como atrasado en ningún momento de ese día, y SHALL presentarse
como próximo a vencer.

Este criterio SHALL ser el mismo en todas las pantallas que califican un
mantenimiento por su fecha. Dos pantallas MUST NOT dar calificaciones distintas
del mismo mantenimiento el mismo día.

#### Scenario: Un mantenimiento de hoy no está atrasado

- **WHEN** se consultan los avisos a cualquier hora del día para el que está
  programado un mantenimiento
- **THEN** ese mantenimiento no figura como atrasado
- **AND** figura como próximo a vencer

#### Scenario: Un mantenimiento de ayer está atrasado

- **WHEN** se consultan los avisos y un mantenimiento sigue abierto con fecha
  programada del día anterior
- **THEN** figura como atrasado por un día

#### Scenario: Las dos pantallas coinciden

- **WHEN** un usuario consulta un mismo mantenimiento en el listado de
  mantenimientos y en la pantalla de avisos, el mismo día
- **THEN** ambas lo califican igual
- **AND** esto solo se puede dar por bueno viendo las dos pantallas

### Requirement: Los mantenimientos sin técnico se avisan aparte

El sistema SHALL avisar de los mantenimientos abiertos que no tienen técnico
asignado, como categoría propia y distinta del retraso y de la proximidad. El
aviso SHALL permitir llegar al mantenimiento y SHALL dejar de emitirse en cuanto
se le asigne un técnico, sin ninguna acción de cierre.

#### Scenario: El administrador recibe el aviso

- **WHEN** un administrador consulta los avisos y existe un mantenimiento
  abierto sin técnico asignado
- **THEN** ve un aviso propio que indica que ese mantenimiento espera técnico
- **AND** puede llegar desde el aviso al mantenimiento

#### Scenario: El aviso se retira solo

- **WHEN** se asigna un técnico a un mantenimiento que no lo tenía
- **THEN** deja de emitirse el aviso de que espera técnico

#### Scenario: El técnico no recibe avisos de trabajo que no es suyo

- **WHEN** un técnico consulta sus avisos y existe un mantenimiento sin técnico
  en su empresa
- **THEN** ese mantenimiento no le genera ningún aviso

#### Scenario: El cliente no recibe el aviso de falta de técnico

- **WHEN** un cliente consulta sus avisos y un mantenimiento de su empresa
  espera técnico
- **THEN** no se le presenta como una incidencia que él deba resolver

### Requirement: Los recuentos acompañan a las categorías

Cuando el sistema presenta categorías de aviso con su recuento, SHALL
presentarlas todas, incluida la de mantenimientos sin técnico, y el indicador
global de avisos pendientes SHALL incluirla.

#### Scenario: La categoría nueva se cuenta

- **WHEN** existen mantenimientos sin técnico asignado
- **THEN** aparecen en el recuento de su categoría
- **AND** se suman al indicador global de avisos pendientes

#### Scenario: Se puede filtrar por la categoría nueva

- **WHEN** un administrador filtra los avisos por los que esperan técnico
- **THEN** ve solo esos

### Requirement: Un aviso desconocido no impide ver los demás

La presentación de avisos MUST tolerar una categoría que no reconozca, y SHALL
seguir mostrando el resto de avisos. La aparición de una categoría nueva en el
servidor MUST NOT dejar la pantalla en blanco.

#### Scenario: Llega una categoría no reconocida

- **WHEN** la pantalla de avisos recibe un aviso de una categoría que no conoce
- **THEN** muestra el resto de avisos con normalidad
- **AND** esto solo se puede dar por bueno viendo la pantalla
