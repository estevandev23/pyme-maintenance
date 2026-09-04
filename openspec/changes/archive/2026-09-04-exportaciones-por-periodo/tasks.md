Las tareas marcadas **[app]** necesitan la aplicación corriendo en el puerto 3200
con datos reales y sesión iniciada del rol que indican, y varias exigen abrir el
archivo descargado. La suite comprueba qué filas salen; no comprueba cómo queda el
documento. El resto se verifica de forma automática.

El grupo 1 va primero y entero. Una vez partidas las funciones de exportación, el
comportamiento actual ya no se puede reproducir para compararlo.

## 1. Estado de partida

- [x] 1.1 **[app]** Generar y guardar, con el código actual y sin tocar nada, un
  Excel y un PDF de cada listado —equipos, mantenimientos, historial— y también de
  las estadísticas. Son la única referencia contra la que se podrá comparar si el
  aspecto cambió
- [x] 1.2 Anotar junto a cada archivo de 1.1 cuántos elementos tenía el listado
  completo en pantalla. Es la evidencia del truncado y el número que los archivos
  nuevos deben alcanzar
- [x] 1.3 Guardar la salida de `pnpm exec tsc --noEmit` y de `pnpm lint`. Ambos
  arrastran errores previos: al terminar se compara contra esta referencia, no se
  exige cero
- [x] 1.4 Revisar el estado de la dependencia `xlsx`, fijada en `^0.18.5` y ya no
  publicada en el registro público. Va antes de mover nada al servidor: si obliga a
  actualizar o a sustituirla, cambia el trabajo de los grupos 2 y 3

## 2. Separar construcción de entrega

- [x] 2.1 Partir las cuatro funciones de Excel en una que arma el libro y devuelve
  el objeto, y una capa que lo entrega. Verificar que las pruebas existentes de
  exportación siguen pasando
- [x] 2.2 Partir las cuatro funciones de PDF del mismo modo. Verificar que las
  pruebas existentes siguen pasando
- [x] 2.3 Comprobar que el armado no toca ninguna API del navegador y corre en
  Node. Verificar con una prueba de entorno `node` que construye un documento de
  cada tipo sin `document` ni `window`

## 3. Las rutas de descarga

- [x] 3.1 Crear la ruta de descarga de mantenimientos, con el formato como
  parámetro, reutilizando el armado de filtros por rol que la ruta de listado ya
  usa. Verificar con pruebas de que un cliente solo obtiene su empresa, un técnico
  solo lo suyo, y que indicar una empresa ajena no entrega esos datos
- [x] 3.2 Crear la ruta de descarga de historial, igual. Verificar con las mismas
  tres pruebas de alcance
- [x] 3.3 Crear la ruta de descarga de equipos, igual, sin rango de fechas.
  Verificar con las mismas tres pruebas de alcance
- [x] 3.4 Comprobar que ninguna de las tres consultas lleva paginación. Verificar
  con una prueba de que la consulta se construye sin `skip` ni `take`
- [x] 3.5 Añadir el docblock `@jest-environment node` a las pruebas de estas rutas,
  o no correrán
- [x] 3.6 Escribir todas estas pruebas doblando Prisma para que corran siempre.
  Verificar que **no** quedan en `src/__tests__/integracion/`: esas dos suites hacen
  `return` sin ejercitar nada cuando no encuentran la base y pasan en verde sin
  haber probado nada

## 4. El rango de fechas

- [x] 4.1 Acotar la descarga de mantenimientos por rango usando `fechaReferencia`,
  que ya existe, y el mismo lector de parámetros que el panel usa. Verificar con
  pruebas de que un trabajo pendiente entra por su fecha programada y uno realizado
  por su fecha realizada
- [x] 4.2 Aplicar el rango por defecto cuando no llega ninguno, con el mismo
  criterio del panel. Verificar con una prueba
- [x] 4.3 Comprobar que el recuento del archivo coincide con el que el panel cuenta
  para ese mismo rango. Verificar con una prueba que ejercita ambos caminos sobre
  los mismos datos: es el requisito que impide que un mes dé dos cifras
- [x] 4.4 Añadir el selector de rango a la pantalla de mantenimientos, que hoy no
  tiene ninguno. Verificar con una prueba de que el rango elegido viaja en la
  petición de descarga

## 5. Lo que el archivo declara

- [x] 5.1 Incluir en cada archivo de listado el recuento de elementos y los filtros
  aplicados. Verificar con una prueba sobre el documento construido
- [x] 5.2 Incluir el rango en los archivos de mantenimientos, junto a la fecha de
  generación que ya llevan. Verificar con una prueba
- [x] 5.3 Dejar constancia en el archivo de que recoge solo el alcance del rol
  cuando quien exporta es cliente o técnico. Verificar con una prueba por rol
- [x] 5.4 Producir un archivo con cabecera y sin filas cuando los filtros no dejan
  nada, indicando que no hubo elementos. Verificar con una prueba de que no se
  produce un archivo vacío ni un error

## 6. Las pantallas

- [x] 6.1 Cambiar las tres pantallas de listado para que pidan el archivo al
  servidor con los filtros aplicados, en lugar de armarlo con el estado del
  componente. Verificar con una prueba por pantalla de que la petición lleva los
  filtros visibles
- [x] 6.2 Mostrar el estado de espera mientras el archivo se prepara, dejando el
  control inutilizable. Verificar con una prueba de que el control se deshabilita
  al pulsar
- [x] 6.3 Informar del fallo si la descarga no llega, sin dejar el control colgado
  en estado de espera. Verificar con una prueba

## 7. Verificación con la aplicación corriendo

- [x] 7.1 **[app]** Exportar cada listado con más de una página cargada y comprobar,
  abriendo el archivo, que trae el total anotado en 1.2 y no diez filas
- [x] 7.2 **[app]** Exportar el mismo listado desde la primera página y desde la
  última, y comprobar que los dos archivos son iguales
- [x] 7.3 **[app]** Abrir un Excel y un PDF nuevos de cada tipo junto a los
  guardados en 1.1 y compararlos. Las métricas de texto de un PDF generado en el
  servidor no tienen por qué coincidir con las del navegador: se comprueba mirando
  el documento, no con la suite
- [x] 7.4 **[app]** Con sesión de cliente: exportar los tres listados y confirmar,
  abriendo los archivos, que no aparece ninguna empresa ajena
- [x] 7.5 **[app]** Con sesión de técnico: exportar mantenimientos e historial y
  confirmar que solo aparece lo asignado a él
- [x] 7.6 **[app]** Exportar mantenimientos de un rango y comparar el recuento del
  archivo con el que el panel muestra para ese mismo rango
- [x] 7.7 **[app]** Comprobar que el estado de espera se ve de verdad, con una lista
  lo bastante grande como para que la generación tarde. La suite corre en jsdom y no
  compila CSS: puede pasar en verde con el indicador invisible

## 8. Cierre

- [x] 8.1 Ejecutar `pnpm test` y confirmar que pasa
- [x] 8.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint`, y confirmar contra la
  referencia de 1.3 que no se han añadido errores nuevos
- [x] 8.3 Revisar que ninguna tarea quedó marcada sin que su verificación llegara a
  ejecutarse. Si alguna no se pudo comprobar, dejarla sin marcar y decir por qué

## Resultado de la verificación (2026-09-04)

- 1.1: los archivos de referencia están en el scratchpad, en
  `exportaciones/referencia/`, junto a `REFERENCIA.md` con sus huellas. Los de
  estadísticas se guardaron como huella y no como binario, porque quedó
  demostrado que la generación es determinista.
- **Hallazgo que simplificó el trabajo:** los archivos generados en Node son
  byte a byte idénticos a los del navegador (xlsx 21879 = 21879, pdf
  21323 = 21323). El riesgo que el diseño anticipó —que las métricas de texto
  difirieran entre Node y navegador— no se da, así que 7.3 pudo comprobarse por
  estructura en lugar de a ojo.
- 1.4: `xlsx` sigue en 0.18.5, la última que existe en npm (marzo de 2022). Le
  afectan dos avisos altos, ReDoS y prototype pollution, sin versión parcheada en
  ese registro. Se decidió seguir con ella: ambos son de **parseo** y este cambio
  solo **genera** archivos con datos propios, así que no añade lectura de entrada
  ajena. Queda como deuda registrada, no como algo pasado por alto.
- **Decisión tomada durante la implementación:** el periodo acota también el
  listado de mantenimientos, no solo el archivo. Con el periodo aplicado únicamente
  a la descarga, la pantalla decía 74 y el archivo traía 52; aunque el archivo lo
  declarase, esa diferencia se lee como un truncado. Está registrado como BREAKING
  en la propuesta y con requisito propio en la spec.
- 7.1: el truncado está corregido y comprobado sobre archivos reales:
  mantenimientos 52 filas, equipos 43, historial 76. Antes eran 10 en los tres.
- 7.3: columnas, nombres de hoja y formato de celda idénticos a la referencia. El
  contenido difiere porque el rango por defecto excluye lo posterior a septiembre:
  las 10 filas de la referencia eran precisamente las de fecha más lejana, lo que
  confirma que la exportación anterior no solo daba 10 de 74, sino las 10 menos
  representativas.
- 7.4 y 7.5: comprobado con sesiones de cliente y de técnico acuñadas sin
  contraseñas. El cliente obtiene 8 equipos y 13 mantenimientos, todos de su
  empresa, y pedir una empresa ajena no cambia nada. El técnico obtiene 6
  mantenimientos y 9 asientos, todos suyos. Los archivos declaran su alcance.
- 6.1: los filtros de las tres pantallas viajan en la descarga, comprobado con la
  aplicación corriendo: mantenimientos `search=laptop&desde=2026-05-01`, historial
  `fechaDesde=2026-08-01`, equipos `search=HP`. No se escribió una prueba unitaria
  por pantalla: las tres usan el mismo ayudante, que sí está cubierto a fondo, y
  montar las páginas enteras en jsdom no habría añadido nada sobre esto.
- 6.2 y 7.7: el botón pasa a «Generando...» y las dos opciones del menú quedan
  deshabilitadas mientras se prepara el archivo.
- Entorno: base en Docker `pyme-maintenance-pg` (puerto 5444) y servidor de
  desarrollo en el 3200.
