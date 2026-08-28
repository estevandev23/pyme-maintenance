# reportes-estadisticas Specification

## Purpose
Define qué indicadores expone el panel de estadísticas, cómo se acotan por rango
de fechas y por rol del usuario, y qué garantías tiene el archivo exportado
respecto a lo que la persona está viendo en pantalla.

## Requirements

### Requirement: Rango de fechas del informe

El panel de estadísticas SHALL permitir seleccionar un rango de fechas, y todos
sus indicadores SHALL calcularse únicamente sobre los mantenimientos
comprendidos en ese rango. Cuando el usuario no ha elegido rango, el sistema
SHALL aplicar un rango por defecto y mostrarlo de forma explícita, de modo que
nunca se presenten cifras sin indicar a qué periodo corresponden.

#### Scenario: Cambiar el rango recalcula los indicadores

- **WHEN** el usuario selecciona un rango distinto al que está aplicado
- **THEN** todos los indicadores del panel se recalculan sobre el rango nuevo

#### Scenario: El periodo aplicado siempre está a la vista

- **WHEN** el usuario abre el panel sin haber elegido rango
- **THEN** se aplica el rango por defecto
- **AND** el panel muestra qué periodo está representando

#### Scenario: Rango invertido

- **WHEN** el usuario selecciona una fecha de inicio posterior a la de fin
- **THEN** el sistema rechaza el rango e informa el motivo
- **AND** los indicadores conservan el último rango válido

### Requirement: Fecha de referencia única

Todos los indicadores SHALL acotarse por una misma fecha de referencia por
mantenimiento: la fecha realizada cuando existe, y la fecha programada cuando
todavía no se ha realizado. Ningún indicador del panel MUST usar un criterio de
fecha distinto del resto.

#### Scenario: Un trabajo realizado cuenta en el mes en que se realizó

- **WHEN** un mantenimiento se programó en marzo y se realizó en abril
- **THEN** cuenta dentro del rango que contiene abril
- **AND** no cuenta dentro de un rango que solo contiene marzo

#### Scenario: Un trabajo pendiente cuenta en el mes en que está programado

- **WHEN** un mantenimiento está programado en mayo y aún no se ha realizado
- **THEN** cuenta dentro del rango que contiene mayo

### Requirement: Desglose mensual del periodo

El informe SHALL presentar un desglose con un punto por cada mes comprendido en
el rango, incluidos los meses sin actividad, y SHALL acompañarlo del total del
periodo. El total SHALL ser igual a la suma de los meses del desglose.

#### Scenario: Un mes sin actividad aparece en cero

- **WHEN** el rango abarca un mes en el que no hubo ningún mantenimiento
- **THEN** ese mes aparece en el desglose con valor cero
- **AND** no se omite de la serie

#### Scenario: El total cuadra con el desglose

- **WHEN** se consulta el informe de un rango de varios meses
- **THEN** el total del periodo es igual a la suma de los valores mensuales

### Requirement: Paridad entre lo mostrado y lo exportado

Todo indicador visible en el panel SHALL estar presente en la exportación a
Excel y en la exportación a PDF, con el mismo valor que muestra la pantalla y
para el mismo rango aplicado. La exportación MUST NOT omitir indicadores
visibles ni perder desgloses que la pantalla sí presenta.

#### Scenario: Los indicadores destacados se exportan

- **WHEN** el usuario exporta las estadísticas
- **THEN** el archivo incluye el total de equipos, el total de mantenimientos,
  los mantenimientos completados del periodo, los equipos críticos, los
  mantenimientos pendientes, la desviación respecto a la fecha programada y el
  recuento de fallas recurrentes

#### Scenario: El detalle de fallas recurrentes se exporta

- **WHEN** la pantalla lista los equipos con fallas recurrentes y su cantidad
- **THEN** el archivo exportado incluye esa misma lista con el equipo, su empresa
  y la cantidad de fallas

#### Scenario: El desglose mensual conserva la separación por tipo

- **WHEN** la pantalla presenta el desglose mensual separando preventivos de
  correctivos
- **THEN** el archivo exportado conserva esa separación
- **AND** no reduce el mes a una sola cifra agregada

#### Scenario: Los valores coinciden con la pantalla

- **WHEN** se comparan los valores del archivo exportado con los del panel para
  el mismo rango
- **THEN** cada indicador tiene el mismo valor en ambos

### Requirement: El archivo exportado declara su alcance

El archivo exportado SHALL indicar el rango de fechas con el que fue generado y
la fecha de generación, de modo que sea interpretable fuera de la aplicación.

#### Scenario: El rango viaja con el archivo

- **WHEN** el usuario exporta las estadísticas de un rango
- **THEN** el archivo indica la fecha de inicio y la de fin del periodo
- **AND** indica cuándo fue generado

### Requirement: El alcance por rol se conserva en el informe

Los indicadores y la exportación SHALL respetar el alcance que corresponde al rol
del usuario: un cliente solo ve datos de su empresa y un técnico solo los
mantenimientos que tiene asignados. La selección de rango MUST NOT ampliar el
alcance de datos que el usuario puede ver.

#### Scenario: Un cliente exporta solo lo suyo

- **WHEN** un usuario con rol cliente exporta las estadísticas
- **THEN** el archivo contiene únicamente datos de equipos de su empresa

#### Scenario: Un técnico exporta solo lo suyo

- **WHEN** un usuario con rol técnico exporta las estadísticas
- **THEN** el archivo contiene únicamente los mantenimientos que tiene asignados

#### Scenario: Ampliar el rango no amplía el alcance

- **WHEN** un cliente selecciona un rango que abarca todo el histórico
- **THEN** sigue viendo únicamente datos de su empresa

### Requirement: El indicador de desviación se presenta por lo que mide

El indicador calculado como la diferencia entre la fecha realizada y la fecha
programada SHALL presentarse como desviación respecto a la fecha programada,
tanto en pantalla como en el archivo exportado, y MUST NOT presentarse como
tiempo de resolución de una solicitud.

#### Scenario: Un trabajo adelantado produce desviación negativa

- **WHEN** los mantenimientos del periodo se realizaron antes de su fecha
  programada
- **THEN** el indicador toma un valor negativo
- **AND** se presenta como adelanto respecto a lo programado, no como un tiempo
  de resolución

#### Scenario: El rótulo no promete lo que no mide

- **WHEN** el usuario consulta el indicador en pantalla o en el archivo exportado
- **THEN** el rótulo lo identifica como desviación respecto a la fecha programada
