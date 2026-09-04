## Purpose

Fija quién registra, modifica y consulta los equipos sobre los que gira todo el
sistema, y qué estado puede tener un equipo recién dado de alta, de modo que el
inventario sea responsabilidad de la empresa de mantenimiento y no de cada cliente.

## ADDED Requirements

### Requirement: Solo el administrador da de alta un equipo

El sistema SHALL restringir al administrador el registro de equipos nuevos. Ningún
otro rol MUST poder crearlos, ni para su propia empresa ni para otra.

#### Scenario: El administrador registra un equipo

- **WHEN** un administrador da de alta un equipo
- **THEN** el equipo queda registrado

#### Scenario: Un cliente intenta registrar un equipo

- **WHEN** un cliente intenta dar de alta un equipo, sea para su empresa o para
  otra
- **THEN** el sistema le niega la operación
- **AND** el equipo no queda registrado

#### Scenario: Un técnico intenta registrar un equipo

- **WHEN** un técnico intenta dar de alta un equipo
- **THEN** el sistema le niega la operación

### Requirement: Solo el administrador modifica un equipo

El sistema SHALL restringir al administrador la modificación de un equipo, incluida
su ubicación. Un cliente MUST NOT poder cambiar ningún dato de ningún equipo, ni de
su empresa ni de otra.

La eliminación de un equipo SHALL seguir siendo exclusiva del administrador.

#### Scenario: El administrador modifica un equipo

- **WHEN** un administrador cambia los datos de un equipo
- **THEN** el cambio queda guardado

#### Scenario: Un cliente intenta modificar un equipo de su empresa

- **WHEN** un cliente intenta cambiar el tipo, la marca, el modelo, el serial o la
  ubicación de un equipo de su empresa
- **THEN** el sistema le niega la operación
- **AND** el equipo conserva sus datos

#### Scenario: Un cliente intenta modificar un equipo de otra empresa

- **WHEN** un cliente intenta cambiar los datos de un equipo que no es de su
  empresa
- **THEN** el sistema le niega la operación

#### Scenario: Un técnico intenta modificar un equipo

- **WHEN** un técnico intenta cambiar los datos de un equipo
- **THEN** el sistema le niega la operación

### Requirement: El cliente consulta sus equipos y solicita servicio sobre ellos

El sistema SHALL permitir al cliente consultar los equipos de su empresa y pedir
servicio sobre ellos. Retirarle el registro y la modificación MUST NOT afectar a
ninguna de esas dos cosas.

#### Scenario: El cliente consulta el inventario de su empresa

- **WHEN** un cliente consulta los equipos
- **THEN** ve los de su empresa
- **AND** no ve los de otras empresas

#### Scenario: El cliente sigue pudiendo solicitar servicio

- **WHEN** un cliente registra una solicitud sobre un equipo de su empresa
- **THEN** la solicitud se registra igual que antes

### Requirement: La interfaz no ofrece lo que el rol no puede usar

El sistema MUST NOT ofrecer a un cliente ni a un técnico las entradas para
registrar, modificar o eliminar equipos. Ofrecer una acción que después se rechaza
convierte una regla de permisos en un fallo aparente de la aplicación.

#### Scenario: Un cliente recorre la pantalla de equipos

- **WHEN** un cliente consulta la pantalla de equipos
- **THEN** no se le ofrece registrar un equipo nuevo
- **AND** no se le ofrece modificar ni eliminar ninguno
- **AND** se comprueba mirando la pantalla, no solo la respuesta del servidor

#### Scenario: Un técnico recorre la pantalla de equipos

- **WHEN** un técnico consulta la pantalla de equipos
- **THEN** no se le ofrece registrar, modificar ni eliminar ninguno

#### Scenario: El administrador conserva sus entradas

- **WHEN** un administrador consulta la pantalla de equipos
- **THEN** se le ofrecen registrar, modificar y eliminar

### Requirement: Un equipo recién registrado no figura en mantenimiento

Un equipo recién dado de alta MUST NOT quedar figurando en mantenimiento. No tiene
ningún trabajo abierto que lo justifique, y el estado de mantenimiento de un equipo
lo determina el trabajo que tiene, no lo que se declare al registrarlo.

Esto SHALL aplicarse sea quien sea quien lo registre, administrador incluido.

#### Scenario: Se intenta registrar un equipo ya en mantenimiento

- **WHEN** un administrador da de alta un equipo declarándolo en mantenimiento
- **THEN** el equipo no queda figurando en mantenimiento

#### Scenario: Un equipo recién registrado admite sus demás estados

- **WHEN** un administrador da de alta un equipo declarándolo activo, inactivo o
  dado de baja
- **THEN** el equipo queda registrado con ese estado

#### Scenario: El equipo pasa a mantenimiento cuando le corresponde

- **WHEN** un equipo recién registrado recibe un mantenimiento abierto con técnico
  asignado
- **THEN** entonces sí figura en mantenimiento
