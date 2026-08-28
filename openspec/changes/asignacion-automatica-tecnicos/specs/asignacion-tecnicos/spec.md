## Purpose

Define cómo el sistema determina qué técnico es responsable de un mantenimiento:
el reparto automático por carga de trabajo dentro de la empresa dueña del equipo,
la reasignación manual por parte del administrador, y las condiciones que hacen
válida una asignación.

## ADDED Requirements

### Requirement: Definición de la carga de un técnico

El sistema SHALL medir la carga de un técnico con dos contadores observables:
la **carga abierta**, que cuenta los mantenimientos asignados a ese técnico en
estado `PROGRAMADO` o `EN_PROCESO`; y la **carga histórica**, que cuenta todos
los mantenimientos asignados a ese técnico en cualquier estado.

#### Scenario: Completar un mantenimiento libera carga abierta

- **WHEN** un mantenimiento asignado a un técnico pasa a estado `COMPLETADO`
- **THEN** la carga abierta de ese técnico disminuye en uno
- **AND** su carga histórica no cambia

#### Scenario: Cancelar un mantenimiento libera carga abierta

- **WHEN** un mantenimiento asignado a un técnico pasa a estado `CANCELADO`
- **THEN** la carga abierta de ese técnico disminuye en uno
- **AND** su carga histórica no cambia

### Requirement: Candidatos a recibir una asignación

El sistema SHALL considerar candidato a un mantenimiento únicamente a los
usuarios con rol `TECNICO`, marcados como activos, y pertenecientes a la misma
empresa que el equipo sobre el que se realiza el mantenimiento.

#### Scenario: Un técnico de otra empresa no es candidato

- **WHEN** se determina el conjunto de candidatos para un mantenimiento sobre un
  equipo de la empresa A
- **THEN** los técnicos asociados a una empresa distinta de A quedan excluidos

#### Scenario: Un técnico inactivo no es candidato

- **WHEN** se determina el conjunto de candidatos y uno de los técnicos de la
  empresa está marcado como inactivo
- **THEN** ese técnico queda excluido del conjunto

### Requirement: Asignación automática al técnico con menor carga

Cuando se crea un mantenimiento sin especificar técnico, el sistema SHALL
asignarlo automáticamente al candidato con menor carga abierta. Ante empate en
carga abierta, SHALL preferir al candidato con menor carga histórica. Si el
empate persiste, SHALL elegir uno de los candidatos empatados de forma aleatoria.

#### Scenario: Se elige al de menor carga abierta

- **WHEN** se crea un mantenimiento sin técnico y los candidatos tienen 2, 0 y 1
  mantenimientos abiertos respectivamente
- **THEN** el mantenimiento queda asignado al candidato con 0 abiertos

#### Scenario: Primera asignación con todos los candidatos en cero

- **WHEN** se crea un mantenimiento sin técnico y ningún candidato tiene
  mantenimientos abiertos ni históricos
- **THEN** el mantenimiento queda asignado a uno cualquiera de esos candidatos
- **AND** la elección no es predecible entre ejecuciones

#### Scenario: El empate en carga abierta se rompe por carga histórica

- **WHEN** se crea un mantenimiento sin técnico y dos candidatos tienen la misma
  carga abierta pero cargas históricas de 3 y 1
- **THEN** el mantenimiento queda asignado al candidato con carga histórica 1

#### Scenario: Nadie recibe un segundo trabajo antes que los demás el primero

- **WHEN** se crean mantenimientos sucesivos sin técnico para una empresa con
  tres candidatos que parten sin ningún mantenimiento
- **THEN** los tres primeros mantenimientos quedan asignados a candidatos
  distintos

### Requirement: La elección manual del administrador prevalece

Cuando el administrador especifica un técnico al crear un mantenimiento, el
sistema SHALL respetar esa elección y no aplicar el reparto automático.

#### Scenario: Se crea un mantenimiento con técnico indicado

- **WHEN** el administrador crea un mantenimiento indicando un técnico válido que
  no es el de menor carga
- **THEN** el mantenimiento queda asignado al técnico indicado

### Requirement: Validación de una asignación explícita

El sistema SHALL rechazar la creación o la actualización de un mantenimiento
cuando el técnico indicado no cumple las condiciones de candidato, y MUST
responder con un mensaje que identifique el motivo del rechazo.

#### Scenario: Técnico de otra empresa

- **WHEN** se indica un técnico que pertenece a una empresa distinta de la del
  equipo
- **THEN** la operación es rechazada
- **AND** la respuesta indica que el técnico no pertenece a la empresa del equipo

#### Scenario: Técnico inactivo

- **WHEN** se indica un técnico marcado como inactivo
- **THEN** la operación es rechazada
- **AND** la respuesta indica que el técnico no está activo

### Requirement: Empresa sin técnicos disponibles

Cuando se crea un mantenimiento sin técnico y la empresa del equipo no tiene
ningún candidato, el sistema SHALL rechazar la creación con un mensaje que
explique que la empresa no tiene técnicos activos.

#### Scenario: La empresa no tiene técnicos activos

- **WHEN** se crea un mantenimiento sin técnico para un equipo cuya empresa no
  tiene ningún técnico activo
- **THEN** el mantenimiento no se crea
- **AND** la respuesta explica que la empresa no tiene técnicos activos

### Requirement: Reasignación manual de un mantenimiento

El administrador SHALL poder cambiar el técnico de un mantenimiento existente, y
el sistema MUST persistir ese cambio. El sistema MUST NOT responder éxito cuando
el técnico enviado no llegó a guardarse.

#### Scenario: El cambio de técnico se persiste

- **WHEN** el administrador actualiza un mantenimiento indicando un técnico
  distinto y válido
- **THEN** el mantenimiento queda asignado al nuevo técnico
- **AND** una consulta posterior del mantenimiento devuelve el nuevo técnico

#### Scenario: La reasignación mueve la carga

- **WHEN** un mantenimiento abierto se reasigna del técnico A al técnico B
- **THEN** la carga abierta de A disminuye en uno
- **AND** la carga abierta de B aumenta en uno

#### Scenario: Reasignación a un técnico inválido

- **WHEN** el administrador intenta reasignar un mantenimiento a un técnico que
  no es candidato
- **THEN** el mantenimiento conserva su técnico anterior
- **AND** la respuesta indica el motivo del rechazo

### Requirement: Trazabilidad de la reasignación

Cuando cambia el técnico de un mantenimiento, el sistema SHALL registrar una
entrada en el historial del equipo que deje constancia del técnico anterior y del
nuevo.

#### Scenario: Queda registro de quién sustituye a quién

- **WHEN** un mantenimiento se reasigna del técnico A al técnico B
- **THEN** el historial del equipo incluye una entrada nueva que menciona a A
  como técnico anterior y a B como técnico nuevo

#### Scenario: Una actualización sin cambio de técnico no genera registro

- **WHEN** se actualiza un mantenimiento sin modificar el técnico asignado
- **THEN** no se agrega ninguna entrada de reasignación al historial
