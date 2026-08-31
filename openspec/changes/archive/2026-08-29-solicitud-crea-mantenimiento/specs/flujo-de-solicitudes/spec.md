## Purpose

Define qué ocurre desde que un cliente reporta un problema hasta que existe un
mantenimiento que lo atiende: la conversión inmediata de la solicitud en
mantenimiento, el vínculo entre ambos, quién puede cancelarlo y con qué
condiciones, y el aviso que recibe el cliente.

Las reglas sobre a qué técnico corresponde el mantenimiento y qué ocurre cuando
no hay ninguno viven en `asignacion-tecnicos`; las de qué se avisa y con qué
criterio de fechas, en `avisos-de-mantenimiento`.

## ADDED Requirements

### Requirement: La solicitud del cliente crea el mantenimiento

Cuando un cliente registra una solicitud de servicio, el sistema SHALL crear en
el mismo acto el mantenimiento correspondiente sobre el equipo indicado, sin
requerir ninguna intervención previa del administrador. El mantenimiento SHALL
ser de tipo correctivo y SHALL heredar la descripción escrita por el cliente.

La solicitud SHALL registrarse aunque no haya ningún técnico a quien asignar el
mantenimiento.

#### Scenario: Un cliente reporta un problema

- **WHEN** un cliente registra una solicitud sobre un equipo de su empresa
- **THEN** queda registrada la solicitud
- **AND** queda registrado un mantenimiento correctivo sobre ese equipo con la
  descripción de la solicitud
- **AND** la solicitud figura como aprobada

#### Scenario: No hay ningún técnico a quien asignarlo

- **WHEN** un cliente registra una solicitud sobre un equipo cuya empresa no
  tiene ningún técnico activo
- **THEN** la solicitud queda registrada
- **AND** queda registrado el mantenimiento
- **AND** el cliente recibe confirmación de que su solicitud se registró

#### Scenario: El administrador ya no aprueba solicitudes

- **WHEN** un administrador abre la pantalla de solicitudes
- **THEN** no se le ofrece aprobar, rechazar ni marcar en revisión ninguna
  solicitud
- **AND** no se le muestra ningún aviso de solicitudes pendientes por revisar

#### Scenario: Un técnico no accede a las solicitudes

- **WHEN** un técnico intenta consultar las solicitudes de servicio
- **THEN** el sistema le niega el acceso

### Requirement: El administrador crea el mantenimiento de una solicitud pendiente

El administrador SHALL poder crear el mantenimiento de una solicitud que esté
**pendiente o en revisión**, y el resultado SHALL ser indistinguible del que
produce la creación automática: mismo tipo, misma forma de calcular la fecha,
mismo reparto de técnico, mismo efecto sobre el estado del equipo, mismo asiento
de historial y mismo aviso al cliente. La solicitud SHALL quedar aprobada.

La acción SHALL ofrecerse únicamente sobre esos dos estados. Una solicitud
aprobada, rechazada o cancelada MUST NOT admitirla: en la aprobada el trabajo ya
existe, y en las otras dos alguien decidió que no había trabajo que hacer.

El sistema MUST impedir que una solicitud acabe con más de un mantenimiento,
incluso ante dos intentos simultáneos, y el rechazo MUST ser comprensible, no un
error en crudo.

#### Scenario: Una solicitud pendiente recibe su mantenimiento

- **WHEN** un administrador crea el mantenimiento de una solicitud pendiente
- **THEN** queda registrado un mantenimiento correctivo enlazado a esa solicitud
- **AND** la solicitud pasa a figurar como aprobada
- **AND** el mantenimiento se programa, se asigna, cambia el estado del equipo y
  deja asiento de historial con las mismas reglas que si lo hubiera creado el
  cliente

#### Scenario: La empresa sigue sin técnicos

- **WHEN** un administrador crea el mantenimiento de una solicitud pendiente
  sobre un equipo cuya empresa no tiene técnicos activos
- **THEN** el mantenimiento se crea sin técnico asignado
- **AND** el estado del equipo no cambia

#### Scenario: Se repara una solicitud a la que le eliminaron el mantenimiento

- **WHEN** un administrador elimina el mantenimiento de una solicitud y después
  le crea uno nuevo
- **THEN** la solicitud queda enlazada al mantenimiento nuevo

#### Scenario: Dos intentos simultáneos

- **WHEN** dos peticiones intentan a la vez crear el mantenimiento de la misma
  solicitud
- **THEN** solo se crea uno
- **AND** la segunda recibe una explicación de que esa solicitud ya tiene
  mantenimiento, no un error interno

#### Scenario: La acción no se ofrece cuando no procede

- **WHEN** un administrador consulta una solicitud aprobada, rechazada o
  cancelada
- **THEN** no se le ofrece crear el mantenimiento

#### Scenario: Solo el administrador dispone de la acción

- **WHEN** un cliente intenta crear el mantenimiento de una solicitud pendiente
- **THEN** el sistema le niega la operación

### Requirement: Eliminar el mantenimiento devuelve la solicitud a pendiente

Cuando se elimina un mantenimiento enlazado a una solicitud, esa solicitud SHALL
volver a estado pendiente, para que quede claro que espera trabajo y para que el
administrador pueda crearle uno nuevo.

#### Scenario: Se elimina el mantenimiento de una solicitud aprobada

- **WHEN** un administrador elimina el mantenimiento enlazado a una solicitud
  aprobada
- **THEN** la solicitud vuelve a figurar como pendiente
- **AND** se le ofrece crear un mantenimiento nuevo

### Requirement: Cancelar el mantenimiento cancela su solicitud

Cuando se cancela un mantenimiento enlazado a una solicitud, esa solicitud SHALL
quedar cancelada, con independencia de quién lo cancelara y de por qué vía.

#### Scenario: El técnico cancela el mantenimiento de una solicitud

- **WHEN** un técnico cancela un mantenimiento originado en una solicitud
- **THEN** la solicitud queda cancelada con el mismo motivo y autor

#### Scenario: El administrador cancela el mantenimiento de una solicitud

- **WHEN** un administrador cancela un mantenimiento originado en una solicitud
- **THEN** la solicitud queda cancelada con el mismo motivo y autor

#### Scenario: Cancelar un mantenimiento sin origen no afecta a ninguna solicitud

- **WHEN** se cancela un mantenimiento que no procede de ninguna solicitud
- **THEN** ninguna solicitud cambia de estado

### Requirement: Fecha del mantenimiento creado desde una solicitud

El mantenimiento creado desde una solicitud SHALL quedar programado para el día
que resulte de sumar los días de adelanto configurados **al día en que se crea el
mantenimiento**, tomando el comienzo de ese día como fecha programada.

La base del cálculo MUST ser el día de la creación del mantenimiento y no el de
la solicitud. En la creación automática ambos coinciden; en la creación manual
del administrador la solicitud puede ser muy anterior, y la fecha MUST NOT
quedar en el pasado por ello.

#### Scenario: La fecha respeta el adelanto configurado

- **WHEN** un cliente registra una solicitud y el adelanto configurado es de dos
  días
- **THEN** el mantenimiento queda programado para dentro de dos días

#### Scenario: La fecha no nace vencida

- **WHEN** se consulta un mantenimiento creado hoy desde una solicitud, en
  cualquier momento del mismo día
- **THEN** su fecha programada es posterior al día en curso

#### Scenario: Una solicitud antigua no produce una fecha pasada

- **WHEN** un administrador crea hoy el mantenimiento de una solicitud
  registrada hace meses
- **THEN** el mantenimiento queda programado contando desde hoy
- **AND** su fecha programada es posterior al día en curso

### Requirement: El mantenimiento lleva a la solicitud que lo originó

Un mantenimiento creado desde una solicitud SHALL conservar el vínculo con ella,
y desde el mantenimiento SHALL poder consultarse esa solicitud. Una solicitud
SHALL tener como mucho un mantenimiento asociado.

#### Scenario: Desde el mantenimiento se llega a la solicitud

- **WHEN** un usuario consulta el detalle de un mantenimiento originado en una
  solicitud
- **THEN** ve que procede de una solicitud
- **AND** puede consultar esa solicitud

#### Scenario: Un mantenimiento creado desde el formulario no tiene origen

- **WHEN** un administrador crea un mantenimiento desde el formulario de
  mantenimientos, sin partir de ninguna solicitud
- **THEN** ese mantenimiento no queda vinculado a ninguna solicitud

### Requirement: Una solicitud con mantenimiento no se puede eliminar

El sistema SHALL impedir la eliminación de una solicitud que tenga un
mantenimiento asociado, y MUST explicar que primero hay que eliminar ese
mantenimiento. La explicación MUST ser comprensible, no un error en crudo.

#### Scenario: Se intenta eliminar una solicitud con mantenimiento

- **WHEN** un administrador intenta eliminar una solicitud que tiene un
  mantenimiento asociado
- **THEN** la solicitud no se elimina
- **AND** la respuesta explica que primero debe eliminarse el mantenimiento

#### Scenario: Eliminado el mantenimiento, la solicitud se puede eliminar

- **WHEN** un administrador elimina el mantenimiento asociado a una solicitud y
  después elimina la solicitud
- **THEN** la solicitud se elimina

### Requirement: Eliminar algo que arrastra solicitudes se avisa antes

El sistema SHALL rechazar con una explicación la eliminación de un equipo o de
un cliente que tenga solicitudes asociadas, en lugar de arrastrarlas en silencio
o de fallar con un error en crudo.

#### Scenario: Se intenta eliminar un equipo con solicitudes

- **WHEN** un administrador intenta eliminar un equipo que tiene solicitudes
  asociadas
- **THEN** el equipo no se elimina
- **AND** la respuesta indica que tiene solicitudes asociadas

#### Scenario: Se intenta eliminar un cliente con solicitudes

- **WHEN** un administrador intenta eliminar un cliente que ha registrado
  solicitudes
- **THEN** el cliente no se elimina
- **AND** la respuesta indica el motivo, sin presentar un error interno

### Requirement: El cliente puede cancelar mientras no haya empezado el trabajo

Un cliente SHALL poder cancelar su propia solicitud mientras el mantenimiento
asociado siga programado y no haya empezado. Una vez el mantenimiento está en
proceso, completado o ya cancelado, el sistema SHALL rechazar la cancelación
explicando el motivo.

#### Scenario: El cliente cancela a tiempo

- **WHEN** un cliente cancela su solicitud y el mantenimiento asociado sigue
  programado
- **THEN** la solicitud queda cancelada
- **AND** el mantenimiento asociado queda cancelado

#### Scenario: El técnico ya empezó

- **WHEN** un cliente intenta cancelar su solicitud y el mantenimiento asociado
  está en proceso
- **THEN** la solicitud no cambia
- **AND** la respuesta explica que el trabajo ya ha empezado

#### Scenario: La opción no se ofrece cuando no procede

- **WHEN** un cliente consulta una solicitud cuyo mantenimiento ya está en
  proceso, completado o cancelado
- **THEN** no se le ofrece la opción de cancelar

#### Scenario: Un cliente no cancela solicitudes ajenas

- **WHEN** un cliente intenta cancelar una solicitud que no es suya
- **THEN** el sistema le niega la operación

#### Scenario: Cancelar pide confirmación

- **WHEN** un cliente elige cancelar su solicitud
- **THEN** el sistema le pide confirmación antes de aplicarla

### Requirement: Una solicitud cancelada se distingue de una rechazada

El estado de una solicitud cancelada SHALL indicar que fue cancelada, y MUST NOT
confundirse con el rechazo por parte del administrador. El sistema SHALL
registrar quién canceló y SHALL presentar la cancelación identificando a su
autor.

#### Scenario: El cliente ve su propia cancelación

- **WHEN** un cliente consulta una solicitud que canceló él
- **THEN** ve que figura como cancelada, no como rechazada
- **AND** ve el motivo que escribió
- **AND** el motivo no aparece rotulado como respuesta del administrador

#### Scenario: El administrador distingue ambos casos

- **WHEN** un administrador consulta el listado de solicitudes
- **THEN** distingue las canceladas de las rechazadas
- **AND** en cada cancelada ve quién la canceló y con qué motivo

#### Scenario: El cliente ve el motivo de una cancelación ajena

- **WHEN** un cliente consulta una solicitud suya que canceló el administrador o
  el técnico
- **THEN** ve que fue cancelada y quién la canceló
- **AND** ve el motivo que se escribió

### Requirement: Cancelar exige un motivo escrito

Quien cancele un mantenimiento SHALL escribir un motivo, sea cliente, técnico o
administrador. El sistema SHALL rechazar la cancelación sin motivo, y MUST
indicar que el motivo es obligatorio en lugar de un error genérico de
validación.

#### Scenario: El cliente cancela sin escribir el motivo

- **WHEN** un cliente intenta cancelar su solicitud sin escribir un motivo
- **THEN** la cancelación se rechaza
- **AND** la respuesta indica que el motivo es obligatorio

#### Scenario: El administrador cancela con motivo

- **WHEN** un administrador cancela un mantenimiento escribiendo el motivo
- **THEN** el mantenimiento queda cancelado con ese motivo registrado
- **AND** la cancelación no modifica la descripción, las fechas ni el informe
  del mantenimiento

#### Scenario: El técnico cancela con motivo

- **WHEN** un técnico cancela un mantenimiento asignado a él escribiendo el
  motivo
- **THEN** el mantenimiento queda cancelado con ese motivo registrado

#### Scenario: El motivo no se pierde al cambiar de estado

- **WHEN** se registra un motivo de cancelación y después alguien actualiza el
  mantenimiento sin escribir observaciones
- **THEN** el motivo de cancelación se conserva

#### Scenario: La cancelación deja rastro en el historial

- **WHEN** se cancela un mantenimiento por cualquiera de las vías disponibles
- **THEN** el historial del equipo recoge la cancelación

### Requirement: El cliente recibe aviso por correo cuando su solicitud obtiene mantenimiento

Cuando una solicitud obtiene su mantenimiento, por cualquiera de las dos vías, el
sistema SHALL enviar al cliente un correo con el detalle de lo solicitado, el
equipo afectado y la fecha programada del mantenimiento. Cuando haya técnico
asignado, el correo SHALL indicar quién atenderá el mantenimiento; cuando no lo
haya, SHALL advertir que aún no hay técnico asignado.

#### Scenario: Hay técnico asignado

- **WHEN** se registra una solicitud y el mantenimiento recibe técnico
- **THEN** el cliente recibe un correo que indica qué técnico lo atenderá

#### Scenario: No hay técnico asignado

- **WHEN** se registra una solicitud sobre un equipo cuya empresa no tiene
  técnicos activos
- **THEN** el cliente recibe un correo que advierte de que aún no hay técnico
  asignado

#### Scenario: El mantenimiento lo crea el administrador

- **WHEN** el administrador crea el mantenimiento de una solicitud pendiente
- **THEN** el cliente recibe el mismo correo que si lo hubiera creado el sistema
  al registrarla

### Requirement: El aviso por correo no condiciona lo ya registrado

El sistema MUST conservar la solicitud y su mantenimiento con independencia de
que el correo llegue a enviarse, por cualquiera de las dos vías de creación. Un
fallo en el envío MUST NOT deshacer nada de lo registrado ni presentarse como un
fallo de la operación.

#### Scenario: El correo no se puede enviar al registrar la solicitud

- **WHEN** un cliente registra una solicitud y el envío del correo falla
- **THEN** la solicitud y su mantenimiento quedan registrados
- **AND** el cliente recibe confirmación de que su solicitud se registró
- **AND** el fallo del envío queda registrado para su diagnóstico

#### Scenario: El correo no se puede enviar al crearlo el administrador

- **WHEN** el administrador crea el mantenimiento de una solicitud y el envío
  del correo falla
- **THEN** el mantenimiento queda creado y la solicitud aprobada
- **AND** el administrador recibe confirmación de que la operación se completó

#### Scenario: El envío no retiene la respuesta

- **WHEN** el servicio de correo tarda en responder
- **THEN** la operación no espera indefinidamente por él

### Requirement: Una solicitud solo alcanza a los equipos de la empresa del cliente

El sistema SHALL rechazar una solicitud sobre un equipo que no pertenezca a la
empresa del cliente que la registra, incluso cuando ese cliente no tenga ninguna
empresa asignada.

#### Scenario: Cliente sin empresa asignada

- **WHEN** un cliente que no tiene empresa asignada intenta registrar una
  solicitud sobre cualquier equipo
- **THEN** la solicitud se rechaza
- **AND** no se crea ningún mantenimiento

#### Scenario: Equipo de otra empresa

- **WHEN** un cliente intenta registrar una solicitud sobre un equipo de otra
  empresa
- **THEN** la solicitud se rechaza
