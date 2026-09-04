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

### Requirement: Una exportación cubre todo lo que cumple los filtros

Al exportar un listado —equipos, mantenimientos o historial—, el archivo SHALL
contener todos los elementos que cumplen los filtros aplicados en ese momento. El
archivo MUST NOT limitarse a la página que se está viendo ni a ningún otro
subconjunto que la persona no haya pedido.

Cuando por cualquier motivo el archivo no pueda contener todo lo que cumple los
filtros, MUST decirlo en el propio archivo. Un informe recortado en silencio se
firma creyendo que está completo.

#### Scenario: Se exporta una lista de varias páginas

- **WHEN** el usuario exporta un listado cuyos resultados ocupan más de una página
- **THEN** el archivo contiene todos los elementos del listado
- **AND** no solo los de la página que estaba viendo

#### Scenario: La página en la que se estaba no cambia el resultado

- **WHEN** dos usuarios exportan el mismo listado con los mismos filtros, uno
  situado en la primera página y otro en la última
- **THEN** ambos obtienen el mismo contenido

#### Scenario: Los filtros de pantalla sí acotan el archivo

- **WHEN** el usuario aplica filtros a un listado y lo exporta
- **THEN** el archivo contiene todos los elementos que cumplen esos filtros
- **AND** no contiene los que quedaron fuera

#### Scenario: Una lista vacía produce un archivo que lo dice

- **WHEN** el usuario exporta un listado cuyos filtros no dejan ningún elemento
- **THEN** obtiene un archivo con su cabecera y sin filas
- **AND** el archivo indica que no hubo elementos, en lugar de parecer un archivo
  que falló

#### Scenario: La exportación en curso se anuncia

- **WHEN** el usuario pide una exportación que tarda en prepararse
- **THEN** la pantalla indica que está en curso hasta que el archivo llega
- **AND** se comprueba mirando la pantalla: el estado de espera es visible sin
  tener que adivinar si el clic tuvo efecto

### Requirement: El periodo acota por igual la pantalla y el archivo

Cuando una pantalla ofrezca acotar por periodo, el listado que muestra y el
archivo que exporta SHALL contener los mismos elementos para el mismo periodo. El
sistema MUST NOT presentar en pantalla un recuento y entregar en el archivo otro
distinto: aunque el archivo declare su alcance, esa diferencia se lee como una
pérdida de contenido.

El periodo aplicado SHALL estar visible junto al listado, también cuando sea el
que se aplica por defecto.

#### Scenario: El recuento de la pantalla y el del archivo coinciden

- **WHEN** el usuario exporta el listado de mantenimientos sin cambiar nada
- **THEN** el archivo contiene tantos elementos como el listado indica

#### Scenario: Cambiar el periodo mueve las dos cosas

- **WHEN** el usuario cambia el periodo en la pantalla de mantenimientos
- **THEN** el listado se recalcula sobre el periodo nuevo
- **AND** una exportación posterior recoge ese mismo periodo

#### Scenario: El periodo aplicado está a la vista

- **WHEN** el usuario abre la pantalla de mantenimientos sin elegir periodo
- **THEN** ve cuál es el periodo que se está aplicando
- **AND** se comprueba mirando la pantalla

### Requirement: Las exportaciones de mantenimientos se acotan por periodo

El sistema SHALL permitir acotar por un rango de fechas la exportación de
mantenimientos, y SHALL usar la misma fecha de referencia que el resto del
informe: la fecha realizada cuando existe, y la programada cuando el trabajo
todavía no se ha hecho.

El criterio MUST ser el mismo que aplica el panel. Un mismo mes MUST NOT arrojar
un recuento distinto según se consulte en pantalla o en el archivo.

#### Scenario: El rango acota lo exportado

- **WHEN** el usuario exporta los mantenimientos de un rango de fechas
- **THEN** el archivo contiene los mantenimientos cuya fecha de referencia cae en
  ese rango
- **AND** no contiene los que quedan fuera

#### Scenario: Un trabajo pendiente entra por su fecha programada

- **WHEN** el rango abarca el mes en el que está programado un mantenimiento que
  todavía no se ha realizado
- **THEN** ese mantenimiento aparece en el archivo

#### Scenario: Un trabajo realizado entra por su fecha realizada

- **WHEN** un mantenimiento se programó en marzo y se realizó en abril, y se
  exporta un rango que solo contiene abril
- **THEN** ese mantenimiento aparece en el archivo
- **AND** no aparece al exportar un rango que solo contiene marzo

#### Scenario: El recuento del archivo coincide con el del panel

- **WHEN** se comparan, para un mismo rango, los mantenimientos del archivo con
  los que el panel cuenta en ese periodo
- **THEN** ambos recuentos coinciden

#### Scenario: Sin rango elegido se aplica el mismo por defecto que el panel

- **WHEN** el usuario exporta mantenimientos sin haber elegido rango
- **THEN** se aplica el rango por defecto del informe
- **AND** el archivo indica cuál fue

### Requirement: El archivo exportado declara su alcance

El archivo exportado SHALL indicar el rango de fechas con el que fue generado y
la fecha de generación, de modo que sea interpretable fuera de la aplicación.

Cuando el archivo sea la exportación de un listado, SHALL indicar además cuántos
elementos contiene y qué filtros se le aplicaron. Un archivo que no declara lo que
recoge no se puede distinguir de uno que perdió parte del contenido por el camino.

Cuando el archivo recoja datos acotados por el rol de quien exporta, SHALL dejar
constancia de ese alcance, para que no se lea como el total del sistema.

#### Scenario: El rango viaja con el archivo

- **WHEN** el usuario exporta las estadísticas de un rango
- **THEN** el archivo indica la fecha de inicio y la de fin del periodo
- **AND** indica cuándo fue generado

#### Scenario: El listado exportado declara cuántos elementos lleva

- **WHEN** el usuario exporta un listado
- **THEN** el archivo indica cuántos elementos contiene
- **AND** indica qué filtros estaban aplicados al generarlo

#### Scenario: Un archivo acotado por rol lo dice

- **WHEN** un cliente o un técnico exporta un informe o un listado
- **THEN** el archivo deja constancia de que recoge únicamente el alcance que le
  corresponde
- **AND** no se presenta como el total del sistema

### Requirement: El alcance por rol se conserva en el informe

Los indicadores y la exportación SHALL respetar el alcance que corresponde al rol
del usuario: un cliente solo ve datos de su empresa y un técnico solo los
mantenimientos que tiene asignados. La selección de rango MUST NOT ampliar el
alcance de datos que el usuario puede ver.

Esto SHALL aplicarse por igual a las exportaciones de listados. Que el archivo se
prepare fuera de la pantalla MUST NOT ampliar lo que la persona puede obtener: el
alcance se decide por quién pide el archivo, nunca por lo que la petición diga
querer.

#### Scenario: Un cliente exporta solo lo suyo

- **WHEN** un usuario con rol cliente exporta las estadísticas
- **THEN** el archivo contiene únicamente datos de equipos de su empresa

#### Scenario: Un técnico exporta solo lo suyo

- **WHEN** un usuario con rol técnico exporta las estadísticas
- **THEN** el archivo contiene únicamente los mantenimientos que tiene asignados

#### Scenario: Ampliar el rango no amplía el alcance

- **WHEN** un cliente selecciona un rango que abarca todo el histórico
- **THEN** sigue viendo únicamente datos de su empresa

#### Scenario: Un cliente exporta un listado

- **WHEN** un usuario con rol cliente exporta el listado de mantenimientos, de
  equipos o de historial
- **THEN** el archivo contiene únicamente lo que corresponde a su empresa

#### Scenario: Un técnico exporta un listado

- **WHEN** un usuario con rol técnico exporta el listado de mantenimientos o de
  historial
- **THEN** el archivo contiene únicamente lo que tiene asignado

#### Scenario: Pedir el archivo de otro no lo entrega

- **WHEN** un cliente pide la exportación de un listado indicando una empresa que
  no es la suya
- **THEN** el sistema no le entrega datos de esa empresa

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

### Requirement: Un mantenimiento cancelado no cuenta como falla del equipo

El indicador de equipos con fallas recurrentes MUST NOT contar los
mantenimientos cancelados. Un mantenimiento que no llegó a realizarse no es
evidencia de que el equipo haya fallado.

La paridad entre lo mostrado y lo exportado ya está garantizada por su propio
requisito; este solo fija qué entra en el cálculo.

#### Scenario: Dos correctivos, uno cancelado

- **WHEN** un equipo acumula en el periodo dos mantenimientos correctivos y uno
  de ellos está cancelado
- **THEN** el equipo no figura entre los de fallas recurrentes

#### Scenario: Cancelar saca a un equipo de la lista

- **WHEN** un equipo figura entre los de fallas recurrentes y se cancela uno de
  los mantenimientos que lo llevaron ahí
- **THEN** el equipo deja de figurar en el indicador
