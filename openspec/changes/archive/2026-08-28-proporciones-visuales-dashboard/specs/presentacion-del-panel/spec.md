## Purpose

Define cómo se compone visualmente el panel de indicadores: qué jerarquía hay
entre las métricas, cómo responde la rejilla al espacio del que dispone, de qué
partes se compone una tarjeta de indicador y cómo se presenta la selección de
rango de fechas.

## ADDED Requirements

### Requirement: Jerarquía entre indicadores

El panel SHALL presentar sus indicadores en dos niveles. Los indicadores
destacados MUST distinguirse visualmente de los de contexto por tamaño y peso,
no únicamente por su posición.

#### Scenario: Los indicadores destacados pesan más

- **WHEN** una persona abre el panel
- **THEN** los indicadores de desviación respecto a lo programado, fallas
  recurrentes y completados del periodo se presentan con mayor prominencia
- **AND** el total de equipos, los pendientes y los equipos críticos se
  presentan de forma más compacta

#### Scenario: La jerarquía no depende solo de la posición

- **WHEN** se compara un indicador destacado con uno de contexto
- **THEN** se diferencian además por el tamaño de su cifra
- **AND** la diferencia se aprecia sin necesidad de leer los rótulos

### Requirement: La rejilla responde al espacio disponible

El número de columnas de indicadores SHALL decidirse por el ancho realmente
disponible para la rejilla, no por el ancho de la ventana. Ensanchar la ventana
MUST NOT reducir el espacio que le corresponde a cada tarjeta.

#### Scenario: Ensanchar la ventana nunca empeora el reparto

- **WHEN** la ventana se ensancha desde cualquier ancho hasta uno mayor
- **THEN** el espacio disponible para el contenido de cada tarjeta se mantiene o
  aumenta
- **AND** en ningún punto se reduce

#### Scenario: La barra lateral cuenta como espacio ocupado

- **WHEN** la barra lateral está visible
- **THEN** el reparto de columnas descuenta el ancho que ocupa

### Requirement: Anatomía de una tarjeta de indicador

Una tarjeta de indicador SHALL componerse de partes distinguibles: un rótulo,
una cifra, la unidad de esa cifra cuando la tenga, y un matiz que la
contextualice. La cifra y su unidad MUST recibir tratamientos tipográficos
distintos. Una tarjeta MUST NOT recibir una frase completa en el lugar
reservado a la cifra.

#### Scenario: Un indicador con unidad se presenta por partes

- **WHEN** un indicador vale 1.5 días de adelanto respecto a lo programado
- **THEN** la cifra 1.5 se presenta con el tratamiento de cifra
- **AND** la unidad y el matiz se presentan con un tratamiento menor, sin
  competir con ella

#### Scenario: Un indicador sin unidad se presenta solo con su cifra

- **WHEN** un indicador es un recuento simple, como el total de equipos
- **THEN** se presenta su cifra sin unidad
- **AND** la tarjeta no reserva espacio vacío por ello

### Requirement: Una tarjeta no deforma a las demás

Las tarjetas de una misma fila SHALL mantener la misma altura, y el contenido de
una tarjeta MUST NOT alterar la altura del resto. El sistema MUST NOT depender de
un alto mínimo fijo en el rótulo para conseguirlo.

#### Scenario: Un rótulo largo no estira la fila

- **WHEN** el rótulo de un indicador ocupa más líneas que el de sus vecinos
- **THEN** todas las tarjetas de la fila conservan la misma altura
- **AND** ninguna crece por encima de las demás

#### Scenario: Un matiz largo no estira la fila

- **WHEN** el texto que contextualiza un indicador es notablemente más largo que
  el de sus vecinos
- **THEN** la altura de la fila no cambia respecto a la que tendría sin él

### Requirement: Las cifras no desplazan lo que tienen al lado

Las cifras de los indicadores SHALL presentarse de modo que un cambio de valor no
desplace los elementos contiguos, y SHALL usar separador de millar cuando la
magnitud lo requiera.

#### Scenario: Cambiar de valor no mueve el diseño

- **WHEN** un indicador pasa de 9 a 10, o de 99 a 100
- **THEN** los elementos que lo rodean permanecen en la misma posición

#### Scenario: Una cifra grande se lee de un vistazo

- **WHEN** un indicador supera el millar
- **THEN** se presenta con separador de millar

### Requirement: La selección de rango se hace en un solo control

La selección del rango de fechas SHALL presentarse como un único control de
rango, en el que se elige inicio y fin sobre el mismo calendario y los días
comprendidos entre ambos quedan resaltados.

#### Scenario: Elegir un rango completo sin cambiar de control

- **WHEN** una persona abre el selector de rango y elige una fecha de inicio y
  una de fin
- **THEN** ambas se eligen sobre el mismo calendario
- **AND** los días comprendidos entre las dos quedan resaltados

#### Scenario: El periodo aplicado se lee sin abrir el selector

- **WHEN** hay un rango aplicado
- **THEN** el control muestra el periodo sin necesidad de desplegarlo

### Requirement: Escala tipográfica del panel

Los tamaños de texto del panel SHALL pertenecer a una escala modular declarada.
El panel MUST NOT saltar de un tamaño de cuerpo al de una cifra destacada sin
pasos intermedios disponibles para los niveles que hay entre ambos.

#### Scenario: Existen niveles intermedios

- **WHEN** se recorren los tamaños de texto del panel, de rótulo a cifra
  destacada
- **THEN** los niveles intermedios —unidad, matiz, cifra de contexto— tienen su
  propio tamaño dentro de la escala
