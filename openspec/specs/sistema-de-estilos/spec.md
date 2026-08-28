# sistema-de-estilos Specification

## Purpose
Define las garantías de la capa de estilos del proyecto: dónde viven los tokens
de tema, que la versión de Tailwind instalada y la sintaxis escrita en el código
sean la misma, y que una clase de utilidad escrita en el código llegue realmente
al CSS compilado en lugar de desaparecer en silencio.

## Requirements

### Requirement: Origen único de los tokens de tema

Los colores, radios y animaciones del sistema de diseño SHALL definirse en un
único origen. Un token MUST NOT estar declarado en dos sitios que puedan
divergir.

#### Scenario: Un token se resuelve al mismo valor en toda la interfaz

- **WHEN** dos componentes distintos usan el mismo token de color
- **THEN** ambos resuelven al mismo valor
- **AND** cambiar el token en su origen afecta a los dos

#### Scenario: No queda configuración de tema huérfana

- **WHEN** se inspecciona la configuración del proyecto tras la migración
- **THEN** no existe un archivo de configuración de Tailwind que declare tokens
  en paralelo al origen vigente

### Requirement: Las clases escritas se emiten en el CSS compilado

Una clase de utilidad presente en el código de la aplicación SHALL producir la
regla correspondiente en el CSS compilado. El proyecto MUST disponer de una
comprobación automatizada que falle cuando el código usa sintaxis de utilidades
de una versión de Tailwind distinta de la instalada.

#### Scenario: Sintaxis de una versión distinta a la instalada

- **WHEN** el código contiene una clase con sintaxis que la versión instalada de
  Tailwind no reconoce
- **THEN** la comprobación del proyecto falla
- **AND** el mensaje identifica el archivo y la clase implicada

#### Scenario: El proyecto migrado pasa su propia comprobación

- **WHEN** se ejecuta la comprobación sobre el proyecto ya migrado
- **THEN** termina sin errores

#### Scenario: Una clase de utilidad produce estilo

- **WHEN** un componente aplica una clase de sombra o de contorno del sistema de
  diseño
- **THEN** el estilo resultante es distinto del que tendría sin esa clase

### Requirement: El selector de fechas se dimensiona de forma estable

El calendario SHALL renderizar sus celdas de día, su cabecera de mes y sus
controles de navegación con dimensiones definidas, sin depender de valores que la
versión instalada no sepa resolver.

#### Scenario: Las celdas del calendario tienen el mismo tamaño entre sí

- **WHEN** se abre el selector de fechas
- **THEN** todas las celdas de día comparten el mismo ancho y alto
- **AND** la fila de nombres de día queda alineada con la rejilla de días

#### Scenario: Los controles de navegación tienen tamaño propio

- **WHEN** se abre el selector de fechas
- **THEN** los botones de mes anterior y mes siguiente ocupan un área definida y
  no colapsan al tamaño de su contenido

### Requirement: Los cambios visuales de la migración son deliberados

La migración SHALL preservar la apariencia de la interfaz salvo en los puntos
declarados como consecuencia del cambio de versión. Todo elemento cuya apariencia
cambie MUST corresponder a un cambio declarado en la propuesta.

#### Scenario: Un borde sin color explícito no queda al azar

- **WHEN** un elemento aplica un ancho de borde sin declarar su color
- **THEN** el color del borde es el del sistema de diseño, no el heredado del
  texto

#### Scenario: Las sombras conservan su intensidad

- **WHEN** se comparan los elementos con sombra antes y después de la migración
- **THEN** cada uno conserva el nivel de sombra que tenía

### Requirement: La incorporación de componentes nuevos respeta la versión

La configuración que gobierna la instalación de componentes de interfaz SHALL
describir el proyecto real, de modo que un componente incorporado después de la
migración llegue en la sintaxis que el proyecto compila.

#### Scenario: La configuración describe el proyecto real

- **WHEN** se inspecciona la configuración de componentes de interfaz
- **THEN** la versión de Tailwind que declara coincide con la instalada
- **AND** la ruta de la hoja de estilos que declara existe en el repositorio

#### Scenario: Un componente incorporado después de la migración compila

- **WHEN** se incorpora un componente nuevo de la biblioteca de interfaz
- **THEN** sus clases se emiten en el CSS compilado
- **AND** la comprobación del proyecto sigue pasando
