## Purpose

Fija quién puede adjuntar el reporte de un mantenimiento, quién puede abrirlo, qué
se admite como archivo y qué garantías tiene su custodia, de modo que un informe
técnico no sea legible por quien no tiene nada que ver con el trabajo ni con la
empresa a la que pertenece el equipo.

## ADDED Requirements

### Requirement: El reporte solo es accesible con sesión y alcance

El sistema SHALL exigir sesión iniciada para entregar el reporte de un
mantenimiento, y SHALL aplicar el mismo alcance que rige la lectura de ese
mantenimiento: quien puede consultarlo puede abrir su reporte, y nadie más.

El archivo MUST NOT quedar accesible por ninguna vía que no compruebe quién
pregunta. Conocer su dirección MUST NOT bastar para obtenerlo.

#### Scenario: Sin sesión no se entrega

- **WHEN** alguien sin sesión iniciada pide el reporte de un mantenimiento
- **THEN** el sistema no entrega el archivo

#### Scenario: Un administrador abre cualquier reporte

- **WHEN** un administrador pide el reporte de un mantenimiento
- **THEN** el sistema se lo entrega

#### Scenario: Un técnico abre el reporte de un trabajo suyo

- **WHEN** un técnico pide el reporte de un mantenimiento asignado a él
- **THEN** el sistema se lo entrega

#### Scenario: Un técnico no abre el reporte de un trabajo ajeno

- **WHEN** un técnico pide el reporte de un mantenimiento que no tiene asignado
- **THEN** el sistema no entrega el archivo

#### Scenario: Un cliente abre el reporte de un equipo de su empresa

- **WHEN** un cliente pide el reporte de un mantenimiento de un equipo de su
  empresa
- **THEN** el sistema se lo entrega

#### Scenario: Un cliente no abre el reporte de otra empresa

- **WHEN** un cliente pide el reporte de un mantenimiento de un equipo que no es de
  su empresa
- **THEN** el sistema no entrega el archivo

#### Scenario: La dirección del archivo no es la llave

- **WHEN** alguien que no tiene alcance sobre un mantenimiento pide su reporte
  usando la dirección exacta
- **THEN** el sistema no entrega el archivo
- **AND** la respuesta no revela si el reporte existe

### Requirement: Adjuntar exige poder editar el mantenimiento

El sistema SHALL aceptar un reporte únicamente para un mantenimiento que ya existe
y de quien puede editarlo: el administrador en cualquier caso, y el técnico cuando
el mantenimiento le está asignado y sigue abierto.

El archivo SHALL quedar asociado a ese mantenimiento desde el momento en que se
acepta. El sistema MUST NOT admitir archivos que no pertenezcan todavía a nada.

#### Scenario: El administrador adjunta un reporte

- **WHEN** un administrador adjunta un reporte a un mantenimiento existente
- **THEN** el archivo queda asociado a ese mantenimiento

#### Scenario: El técnico adjunta a un trabajo suyo y abierto

- **WHEN** un técnico adjunta un reporte a un mantenimiento suyo que sigue abierto
- **THEN** el archivo queda asociado a ese mantenimiento

#### Scenario: El técnico no adjunta a un trabajo ajeno

- **WHEN** un técnico intenta adjuntar un reporte a un mantenimiento que no tiene
  asignado
- **THEN** el sistema lo rechaza
- **AND** el archivo no se guarda

#### Scenario: Un cliente no adjunta reportes

- **WHEN** un cliente intenta adjuntar un reporte a un mantenimiento, sea de su
  empresa o de otra
- **THEN** el sistema lo rechaza

#### Scenario: No se adjunta a lo que no existe

- **WHEN** alguien intenta adjuntar un reporte indicando un mantenimiento
  inexistente
- **THEN** el sistema lo rechaza
- **AND** el archivo no se guarda

#### Scenario: Al crear un mantenimiento no se adjunta

- **WHEN** un administrador crea un mantenimiento nuevo
- **THEN** la pantalla no le ofrece adjuntar el reporte en ese momento
- **AND** se lo ofrece al editarlo, una vez creado

### Requirement: El archivo se admite por lo que es, no por lo que dice ser

El sistema SHALL comprobar que el archivo recibido es realmente un PDF, examinando
su contenido y no únicamente el tipo declarado por quien lo envía. SHALL rechazar
también el que exceda el tamaño máximo admitido.

El rechazo MUST explicar cuál de las dos condiciones no se cumple.

#### Scenario: Un archivo que no es PDF se rechaza

- **WHEN** se adjunta un archivo que declara ser PDF pero cuyo contenido no lo es
- **THEN** el sistema lo rechaza
- **AND** el archivo no se guarda

#### Scenario: Un archivo demasiado grande se rechaza

- **WHEN** se adjunta un PDF que excede el tamaño máximo admitido
- **THEN** el sistema lo rechaza
- **AND** la respuesta indica que el motivo es el tamaño

#### Scenario: Las condiciones se anuncian antes de intentarlo

- **WHEN** alguien llega al campo de adjuntar reporte
- **THEN** la pantalla indica el formato y el tamaño máximo admitidos
- **AND** lo hace antes de que elija el archivo

### Requirement: El reporte se entrega para guardarse

El sistema SHALL entregar el reporte como un archivo destinado a guardarse, y MUST
NOT servirlo de forma que su contenido pueda ejecutarse en el contexto de la
aplicación. El tipo con el que se entrega SHALL ser el que el sistema determinó al
aceptarlo, nunca uno propuesto por quien lo pide.

#### Scenario: El reporte llega como archivo

- **WHEN** alguien con alcance abre el reporte de un mantenimiento
- **THEN** lo recibe como archivo PDF para guardar
- **AND** no se interpreta como contenido de la aplicación

#### Scenario: El nombre original no decide nada

- **WHEN** se adjunta un archivo cuyo nombre original contiene caracteres que
  podrían señalar a otra ubicación
- **THEN** el sistema lo guarda igualmente bajo el nombre que él decide
- **AND** el nombre recibido no influye en dónde se guarda

### Requirement: El reporte no sobrevive a su mantenimiento

Cuando un mantenimiento deja de existir, su reporte SHALL dejar de existir también.
El sistema MUST NOT conservar archivos que ya no pertenecen a nada.

#### Scenario: Eliminar el mantenimiento se lleva el reporte

- **WHEN** un administrador elimina un mantenimiento que tenía reporte
- **THEN** el reporte deja de estar disponible

#### Scenario: Sustituir el reporte no deja el anterior

- **WHEN** se adjunta un reporte a un mantenimiento que ya tenía otro
- **THEN** queda asociado el nuevo
- **AND** el anterior deja de estar disponible

### Requirement: Un reporte ausente se distingue de un fallo

El sistema SHALL responder de forma distinguible cuando el mantenimiento no tiene
reporte y cuando la petición no puede atenderse por otro motivo, de modo que la
pantalla no presente como error lo que solo es la ausencia de un archivo.

#### Scenario: Un mantenimiento sin reporte

- **WHEN** alguien con alcance pide el reporte de un mantenimiento que no tiene
  ninguno
- **THEN** la respuesta indica que no hay reporte
- **AND** no se presenta como un fallo del sistema

#### Scenario: La pantalla no ofrece abrir lo que no existe

- **WHEN** alguien consulta un mantenimiento sin reporte
- **THEN** no se le ofrece el enlace para abrirlo
