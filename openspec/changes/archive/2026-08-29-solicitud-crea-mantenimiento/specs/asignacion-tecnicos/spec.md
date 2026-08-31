> Nota de terminología para este delta: **«sin especificar técnico»** significa
> que quien crea el mantenimiento no indica ninguno y delega en el reparto
> automático. **«sin técnico asignado»** significa que el mantenimiento no tiene
> técnico, porque no había ninguno a quien asignárselo o porque se le retiró. El
> spec original usaba la primera expresión en ambos sentidos.

## MODIFIED Requirements

### Requirement: Definición de la carga de un técnico

El sistema SHALL medir la carga de un técnico con dos contadores observables:
la **carga abierta**, que cuenta los mantenimientos asignados a ese técnico en
estado `PROGRAMADO` o `EN_PROCESO`; y la **carga histórica**, que cuenta los
mantenimientos asignados a ese técnico en cualquier estado, **salvo los
cancelados por alguien distinto del propio técnico**.

Un mantenimiento cancelado por el cliente o por el administrador MUST NOT
contar en la carga histórica del técnico que lo tenía asignado: ese técnico
vuelve a competir por el siguiente reparto en las mismas condiciones en que
estaba. Un mantenimiento cancelado por el técnico asignado SHALL seguir
contando en su carga histórica.

#### Scenario: Completar un mantenimiento libera carga abierta

- **WHEN** un mantenimiento asignado a un técnico pasa a estado `COMPLETADO`
- **THEN** la carga abierta de ese técnico disminuye en uno
- **AND** su carga histórica no cambia

#### Scenario: Cancelar un mantenimiento libera carga abierta

- **WHEN** un mantenimiento asignado a un técnico pasa a estado `CANCELADO`
- **THEN** la carga abierta de ese técnico disminuye en uno

#### Scenario: Una cancelación ajena devuelve al técnico donde estaba

- **WHEN** el cliente o el administrador cancela un mantenimiento asignado a un
  técnico
- **THEN** la carga histórica de ese técnico disminuye en uno
- **AND** ese técnico vuelve a competir por el siguiente reparto en las mismas
  condiciones que antes de recibirlo

#### Scenario: Cancelar el trabajo propio no descuenta

- **WHEN** un técnico cancela un mantenimiento que tenía asignado
- **THEN** su carga histórica no cambia
- **AND** cancelarlo no lo convierte por sí solo en el destinatario del
  siguiente reparto

### Requirement: Asignación automática al técnico con menor carga

Cuando se crea un mantenimiento sin especificar técnico **y existe al menos un
candidato**, el sistema SHALL asignarlo automáticamente al candidato con menor
carga abierta. Ante empate en carga abierta, SHALL preferir al candidato con
menor carga histórica. Si el empate persiste, SHALL elegir uno de los candidatos
empatados de forma aleatoria.

Cuando no existe ningún candidato, el mantenimiento queda sin técnico asignado,
según el requisito «Empresa sin técnicos disponibles».

#### Scenario: Se elige al de menor carga abierta

- **WHEN** se crea un mantenimiento sin especificar técnico y los candidatos
  tienen 2, 0 y 1 mantenimientos abiertos respectivamente
- **THEN** el mantenimiento queda asignado al candidato con 0 abiertos

#### Scenario: Primera asignación con todos los candidatos en cero

- **WHEN** se crea un mantenimiento sin especificar técnico y ningún candidato
  tiene mantenimientos abiertos ni históricos
- **THEN** el mantenimiento queda asignado a uno cualquiera de esos candidatos
- **AND** la elección no es predecible entre ejecuciones

#### Scenario: El empate en carga abierta se rompe por carga histórica

- **WHEN** se crea un mantenimiento sin especificar técnico y dos candidatos
  tienen la misma carga abierta pero cargas históricas de 3 y 1
- **THEN** el mantenimiento queda asignado al candidato con carga histórica 1

#### Scenario: Nadie recibe un segundo trabajo antes que los demás el primero

- **WHEN** se crean mantenimientos sucesivos sin especificar técnico para una
  empresa con tres candidatos que parten sin ningún mantenimiento
- **THEN** los tres primeros mantenimientos quedan asignados a candidatos
  distintos

### Requirement: Empresa sin técnicos disponibles

Cuando se crea un mantenimiento sin especificar técnico y la empresa del equipo
no tiene ningún candidato, el sistema SHALL crear el mantenimiento sin técnico
asignado en lugar de rechazar la creación, y SHALL hacer visible que ese
mantenimiento está a la espera de técnico.

#### Scenario: La empresa no tiene técnicos activos

- **WHEN** se crea un mantenimiento sin especificar técnico para un equipo cuya
  empresa no tiene ningún técnico activo
- **THEN** el mantenimiento se crea sin técnico asignado
- **AND** queda visible para el administrador como pendiente de asignación

#### Scenario: Todos los técnicos de la empresa están inactivos

- **WHEN** se crea un mantenimiento sin especificar técnico para un equipo cuya
  empresa tiene técnicos, pero todos marcados como inactivos
- **THEN** el mantenimiento se crea sin técnico asignado

### Requirement: Reasignación manual de un mantenimiento

El administrador SHALL poder cambiar el técnico de un mantenimiento existente,
asignar un técnico a un mantenimiento sin técnico asignado, y retirar el técnico
de un mantenimiento dejándolo sin técnico asignado. El sistema MUST persistir
cada uno de esos cambios. El sistema MUST NOT responder éxito cuando el técnico
enviado, o su retirada, no llegó a guardarse.

Retirar el técnico SHALL ser una acción distinguible de no indicar ninguno: no
indicar técnico al crear delega en el reparto automático, mientras que retirarlo
en una actualización deja el mantenimiento sin técnico asignado.

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

#### Scenario: Se asigna técnico a un mantenimiento que no lo tenía

- **WHEN** el administrador asigna un técnico válido a un mantenimiento sin
  técnico asignado
- **THEN** el mantenimiento queda asignado a ese técnico
- **AND** la operación no falla por no existir un técnico anterior
- **AND** la carga abierta del técnico aumenta en uno

#### Scenario: Se retira el técnico de un mantenimiento

- **WHEN** el administrador retira el técnico de un mantenimiento
- **THEN** el mantenimiento queda sin técnico asignado
- **AND** una consulta posterior lo devuelve sin técnico
- **AND** la carga abierta del técnico anterior disminuye en uno

#### Scenario: La retirada está disponible en la interfaz

- **WHEN** el administrador edita un mantenimiento con técnico asignado
- **THEN** se le ofrece dejarlo sin técnico asignado, de forma distinguible de
  la asignación automática

### Requirement: Trazabilidad de la reasignación

Cuando cambia el técnico de un mantenimiento, el sistema SHALL registrar una
entrada en el historial del equipo que deje constancia del técnico anterior y
del nuevo. Cuando no exista técnico anterior o no exista técnico nuevo, la
entrada SHALL dejar constancia de esa ausencia en lugar de omitirse.

#### Scenario: Queda registro de quién sustituye a quién

- **WHEN** un mantenimiento se reasigna del técnico A al técnico B
- **THEN** el historial del equipo incluye una entrada nueva que menciona a A
  como técnico anterior y a B como técnico nuevo

#### Scenario: Una actualización sin cambio de técnico no genera registro

- **WHEN** se actualiza un mantenimiento sin modificar el técnico asignado
- **THEN** no se agrega ninguna entrada de reasignación al historial

#### Scenario: Queda registro de la primera asignación

- **WHEN** se asigna un técnico a un mantenimiento que no tenía ninguno
- **THEN** el historial del equipo incluye una entrada que deja constancia de
  que antes no había técnico asignado

#### Scenario: Queda registro de la retirada

- **WHEN** se retira el técnico de un mantenimiento
- **THEN** el historial del equipo incluye una entrada que deja constancia de
  que el mantenimiento queda sin técnico asignado

## ADDED Requirements

### Requirement: Un mantenimiento sin técnico asignado es un estado válido y localizable

El sistema SHALL admitir mantenimientos sin técnico asignado como estado normal
del sistema, no como error. El administrador SHALL poder acotar el listado de
mantenimientos a los que no tienen técnico. Un mantenimiento sin técnico
asignado MUST NOT aparecer en el trabajo de ningún técnico.

#### Scenario: El administrador acota el listado a los que esperan técnico

- **WHEN** un administrador filtra los mantenimientos por los que no tienen
  técnico asignado
- **THEN** ve solo esos

#### Scenario: Un técnico no ve trabajo que no es suyo

- **WHEN** un técnico consulta sus mantenimientos y existe uno sin técnico
  asignado en su empresa
- **THEN** ese mantenimiento no aparece entre los suyos

#### Scenario: El cliente ve su mantenimiento aunque no tenga técnico

- **WHEN** un cliente consulta los mantenimientos de su empresa y uno de ellos
  no tiene técnico asignado
- **THEN** el mantenimiento aparece en el listado indicando que aún no tiene
  técnico

#### Scenario: Cualquier pantalla que muestre un mantenimiento tolera la ausencia de técnico

- **WHEN** un usuario de cualquier rol consulta un listado, un detalle o un
  informe exportado que incluya un mantenimiento sin técnico asignado
- **THEN** el contenido se muestra completo e indica que aún no hay técnico
- **AND** esto solo se puede dar por bueno viendo cada pantalla y abriendo cada
  archivo, porque el fallo que evita es de presentación

### Requirement: Al hacer opcional el técnico no se pierde el bloqueo de borrado

El sistema SHALL seguir rechazando la eliminación de un usuario que tenga
mantenimientos o historial asociados, indicando el motivo. Convertir el técnico
de un mantenimiento en un dato opcional MUST NOT abrir la puerta a que borrar un
usuario deje sus mantenimientos sin técnico en silencio.

Este requisito recoge una garantía que el sistema ya ofrece, para que el cambio
de opcionalidad no la retire sin que nadie lo advierta.

#### Scenario: Se intenta eliminar un técnico con trabajo asignado

- **WHEN** un administrador intenta eliminar un técnico que tiene mantenimientos
  asignados
- **THEN** el técnico no se elimina
- **AND** la respuesta indica que tiene mantenimientos asignados

#### Scenario: Se intenta eliminar un usuario con historial

- **WHEN** un administrador intenta eliminar un usuario que tiene entradas de
  historial a su nombre, aunque no tenga mantenimientos asignados
- **THEN** el usuario no se elimina
- **AND** la respuesta indica el motivo
