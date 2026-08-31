## Purpose

Reúne los parámetros de operación que el administrador puede ajustar desde la
propia aplicación, sin tocar el despliegue, empezando por los días de adelanto
con que se programan los mantenimientos nacidos de una solicitud.

## ADDED Requirements

### Requirement: El administrador ajusta los días de adelanto

El sistema SHALL ofrecer al administrador una pantalla donde consultar y
modificar los días de adelanto con que se programa un mantenimiento creado desde
una solicitud. El valor guardado SHALL aplicarse a las solicitudes registradas a
partir de ese momento.

#### Scenario: El administrador cambia el valor

- **WHEN** un administrador guarda un valor nuevo de días de adelanto
- **THEN** el valor queda guardado
- **AND** la siguiente solicitud produce un mantenimiento programado con ese
  adelanto

#### Scenario: Los mantenimientos ya creados no se mueven

- **WHEN** un administrador cambia los días de adelanto
- **THEN** los mantenimientos ya existentes conservan su fecha programada

### Requirement: Los días de adelanto tienen un rango admitido

El sistema SHALL rechazar un valor de días de adelanto fuera del rango en el que
un mantenimiento resulta visible en los avisos: ni tan corto que nazca atrasado,
ni tan largo que no aparezca en ningún aviso hasta pasados varios días. El
rechazo MUST explicar el rango admitido.

#### Scenario: Valor demasiado corto

- **WHEN** un administrador intenta guardar un adelanto de cero días
- **THEN** el valor se rechaza
- **AND** la respuesta indica el rango admitido

#### Scenario: Valor demasiado largo

- **WHEN** un administrador intenta guardar un adelanto mayor que el rango
  admitido
- **THEN** el valor se rechaza
- **AND** la respuesta indica el rango admitido

### Requirement: Hay un valor aplicable aunque nadie haya configurado nada

El sistema SHALL disponer de un valor por defecto de días de adelanto, aplicable
desde la primera solicitud y sin que ningún administrador haya entrado a la
pantalla de configuración.

#### Scenario: Primera solicitud en una instalación recién puesta en marcha

- **WHEN** se registra la primera solicitud de una instalación en la que nadie ha
  guardado configuración alguna
- **THEN** el mantenimiento queda programado con el adelanto por defecto
- **AND** el registro de la solicitud no falla

### Requirement: La configuración es exclusiva del administrador

El sistema SHALL restringir al administrador tanto la consulta como la
modificación de la configuración operativa.

#### Scenario: Un cliente intenta acceder

- **WHEN** un cliente intenta consultar o modificar la configuración
- **THEN** el sistema le niega el acceso

#### Scenario: Un técnico intenta acceder

- **WHEN** un técnico intenta consultar o modificar la configuración
- **THEN** el sistema le niega el acceso

#### Scenario: La entrada no se ofrece a quien no puede usarla

- **WHEN** un cliente o un técnico recorre la navegación de la aplicación
- **THEN** no se le ofrece la entrada de configuración
