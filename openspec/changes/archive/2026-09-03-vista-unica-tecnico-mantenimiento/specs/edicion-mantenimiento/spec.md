## ADDED Requirements

### Requirement: El técnico decide con el equipo y la petición a la vista

Cuando el técnico va a registrar el avance de un mantenimiento asignado a él, el
sistema SHALL presentarle en el mismo sitio los datos que necesita para decidir y
los campos con los que decide. MUST estar a la vista, sin navegar a otra pantalla,
el equipo sobre el que se trabaja, la empresa a la que pertenece y la descripción
con la que se pidió el servicio.

Estos datos se presentan para ser leídos. El sistema MUST NOT ofrecer al técnico
modificarlos.

#### Scenario: El técnico ve sobre qué trabaja al registrar el avance

- **WHEN** un técnico abre el registro de avance de un mantenimiento suyo
- **THEN** ve el equipo, la empresa y la descripción con la que se pidió el
  servicio, junto a los campos que va a rellenar
- **AND** se comprueba mirando la pantalla: los datos y el formulario están
  visibles a la vez, sin cambiar de pestaña ni de vista

#### Scenario: Los datos de contexto no son editables

- **WHEN** un técnico consulta el equipo, la empresa o la descripción del cliente
  en esa pantalla
- **THEN** puede leerlos
- **AND** no se le ofrece ningún control para cambiarlos

#### Scenario: Un mantenimiento sin técnico asignado

- **WHEN** el mantenimiento que se consulta no tiene técnico asignado
- **THEN** la pantalla lo indica como tal
- **AND** no presenta un hueco vacío ni un dato inventado

### Requirement: El técnico corrige el tipo mientras el trabajo sigue abierto

El sistema SHALL permitir al técnico cambiar el tipo de un mantenimiento asignado
a él entre preventivo y correctivo, siempre que el mantenimiento esté abierto.

La condición SHALL evaluarse sobre el estado que el mantenimiento tenía antes de
la operación, no sobre el que queda después. Un técnico que cierra el trabajo y
corrige su tipo en la misma operación MUST ver aplicadas ambas cosas: es el
momento en que sabe de qué tipo era el trabajo, y obligarle a guardar dos veces
haría que la corrección se perdiera cada vez que se le olvidara la primera.

#### Scenario: El técnico reclasifica un trabajo en curso

- **WHEN** un técnico cambia a preventivo el tipo de un mantenimiento suyo que
  está en proceso
- **THEN** el cambio queda guardado
- **AND** una consulta posterior devuelve el tipo nuevo

#### Scenario: Reclasificar y cerrar en la misma operación

- **WHEN** un técnico registra a la vez que el mantenimiento queda completado y
  que su tipo es preventivo, partiendo de un mantenimiento en proceso
- **THEN** se aplican los dos cambios
- **AND** el mantenimiento queda completado y con el tipo nuevo

#### Scenario: Un trabajo ya completado conserva su tipo

- **WHEN** un técnico intenta cambiar el tipo de un mantenimiento que ya estaba
  completado antes de la operación
- **THEN** el sistema rechaza el cambio
- **AND** el mantenimiento conserva el tipo que tenía
- **AND** la respuesta explica que un mantenimiento cerrado no se reclasifica

#### Scenario: Un trabajo ya cancelado conserva su tipo

- **WHEN** un técnico intenta cambiar el tipo de un mantenimiento que ya estaba
  cancelado antes de la operación
- **THEN** el sistema rechaza el cambio
- **AND** el mantenimiento conserva el tipo que tenía

#### Scenario: La pantalla no ofrece lo que el sistema va a rechazar

- **WHEN** un técnico consulta un mantenimiento suyo ya cerrado
- **THEN** ve el tipo que tiene
- **AND** no se le ofrece el control para cambiarlo

#### Scenario: El administrador conserva su edición completa

- **WHEN** un administrador cambia el tipo de un mantenimiento, esté abierto o
  cerrado
- **THEN** el cambio se aplica
- **AND** la restricción de no reclasificar lo cerrado no le alcanza

#### Scenario: Un cliente no reclasifica nada

- **WHEN** un cliente intenta cambiar el tipo de un mantenimiento, sea de su
  empresa o de otra
- **THEN** el sistema le niega la operación

### Requirement: El cambio de tipo queda registrado

Un cambio de tipo SHALL dejar constancia de quién lo hizo y de qué valor tenía
antes. El tipo alimenta indicadores de gestión, y un cambio que los mueve MUST NOT
ser anónimo ni indistinguible del valor original.

#### Scenario: Queda rastro de quién reclasificó y desde qué valor

- **WHEN** un técnico cambia el tipo de un mantenimiento suyo
- **THEN** el historial del equipo recoge el cambio, con el técnico que lo hizo y
  el valor anterior

#### Scenario: Guardar sin tocar el tipo no deja un asiento de reclasificación

- **WHEN** un técnico guarda un cambio de estado enviando el mismo tipo que el
  mantenimiento ya tenía
- **THEN** no se registra ninguna reclasificación

### Requirement: El técnico no reasigna el trabajo

El sistema SHALL mostrar al técnico quién tiene asignado el mantenimiento y MUST
NOT permitirle cambiarlo, ni desde la pantalla ni por ninguna otra vía. Repartir
el trabajo corresponde al administrador y al reparto automático.

#### Scenario: El técnico ve el asignado pero no puede cambiarlo

- **WHEN** un técnico consulta un mantenimiento suyo
- **THEN** ve quién lo tiene asignado
- **AND** no se le ofrece ningún control para cambiar esa asignación

#### Scenario: Una petición que intenta reasignar no surte efecto

- **WHEN** un técnico intenta asignar a otra persona un mantenimiento suyo
  saltándose la pantalla
- **THEN** la asignación no cambia

### Requirement: El técnico adjunta el reporte donde registra el avance

El sistema SHALL permitir al técnico adjuntar el reporte del trabajo en la misma
pantalla donde registra el estado y las observaciones, y SHALL informar de los
formatos y el tamaño admitidos antes de que lo intente.

#### Scenario: El técnico adjunta el reporte al cerrar el trabajo

- **WHEN** un técnico completa un mantenimiento suyo adjuntando el reporte
- **THEN** el mantenimiento queda completado y con el reporte asociado
- **AND** el reporte queda disponible para quien consulte el mantenimiento

#### Scenario: Las condiciones del adjunto se anuncian por adelantado

- **WHEN** un técnico llega al campo del reporte
- **THEN** la pantalla indica qué formato y qué tamaño máximo se admiten
- **AND** lo hace antes de que elija el archivo

#### Scenario: Un archivo que no cumple se rechaza con motivo

- **WHEN** un técnico intenta adjuntar un archivo que no cumple el formato o el
  tamaño admitidos
- **THEN** el sistema lo rechaza
- **AND** explica cuál de las dos condiciones no se cumple

#### Scenario: El avance se registra sin adjuntar nada

- **WHEN** un técnico registra el avance sin adjuntar reporte
- **THEN** la operación se acepta
- **AND** el mantenimiento conserva el reporte que tuviera, si tenía alguno

## MODIFIED Requirements

### Requirement: Solo el administrador modifica un mantenimiento

El sistema SHALL restringir al administrador la modificación completa de un
mantenimiento. Un cliente MUST NOT poder modificar el estado, las fechas, la
descripción ni el técnico de ningún mantenimiento, ni de su empresa ni de otra.

Esto MUST NOT afectar a las dos vías acotadas que otros roles sí conservan: el
técnico registra el avance de los mantenimientos asignados a él —estado,
observaciones, reporte adjunto y, mientras el trabajo siga abierto, el tipo—, y
el cliente cancela su propia solicitud dentro de las condiciones que
`flujo-de-solicitudes` establece.

La vía del técnico es acotada por lo que incluye, no por lo que la pantalla le
ofrezca: cuanto queda fuera de esa lista —las fechas, la descripción del cliente,
el equipo y el técnico asignado— MUST seguir siendo inalcanzable para él aunque
lo intente saltándose la pantalla.

#### Scenario: Un cliente intenta modificar un mantenimiento

- **WHEN** un cliente intenta modificar un mantenimiento, sea de su empresa o de
  otra
- **THEN** el sistema le niega la operación

#### Scenario: El técnico conserva su vía acotada

- **WHEN** un técnico cambia el estado, las observaciones, el reporte adjunto o
  el tipo de un mantenimiento abierto asignado a él
- **THEN** la operación se aplica

#### Scenario: La vía del técnico no llega más allá de lo enumerado

- **WHEN** un técnico intenta cambiar la fecha programada, la descripción o el
  equipo de un mantenimiento suyo
- **THEN** el mantenimiento conserva esos valores

#### Scenario: La cancelación del cliente sigue disponible

- **WHEN** un cliente cancela su propia solicitud dentro de las condiciones
  admitidas
- **THEN** la cancelación se aplica
