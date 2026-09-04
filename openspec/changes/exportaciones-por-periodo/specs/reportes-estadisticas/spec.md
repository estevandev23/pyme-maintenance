## ADDED Requirements

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

## MODIFIED Requirements

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
