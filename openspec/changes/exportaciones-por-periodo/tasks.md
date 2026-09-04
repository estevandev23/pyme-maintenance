Las tareas marcadas **[app]** necesitan la aplicación corriendo en el puerto 3200
con datos reales y sesión iniciada del rol que indican, y varias exigen abrir el
archivo descargado. La suite comprueba qué filas salen; no comprueba cómo queda el
documento. El resto se verifica de forma automática.

El grupo 1 va primero y entero. Una vez partidas las funciones de exportación, el
comportamiento actual ya no se puede reproducir para compararlo.

## 1. Estado de partida

- [ ] 1.1 **[app]** Generar y guardar, con el código actual y sin tocar nada, un
  Excel y un PDF de cada listado —equipos, mantenimientos, historial— y también de
  las estadísticas. Son la única referencia contra la que se podrá comparar si el
  aspecto cambió
- [ ] 1.2 Anotar junto a cada archivo de 1.1 cuántos elementos tenía el listado
  completo en pantalla. Es la evidencia del truncado y el número que los archivos
  nuevos deben alcanzar
- [ ] 1.3 Guardar la salida de `pnpm exec tsc --noEmit` y de `pnpm lint`. Ambos
  arrastran errores previos: al terminar se compara contra esta referencia, no se
  exige cero
- [ ] 1.4 Revisar el estado de la dependencia `xlsx`, fijada en `^0.18.5` y ya no
  publicada en el registro público. Va antes de mover nada al servidor: si obliga a
  actualizar o a sustituirla, cambia el trabajo de los grupos 2 y 3

## 2. Separar construcción de entrega

- [ ] 2.1 Partir las cuatro funciones de Excel en una que arma el libro y devuelve
  el objeto, y una capa que lo entrega. Verificar que las pruebas existentes de
  exportación siguen pasando
- [ ] 2.2 Partir las cuatro funciones de PDF del mismo modo. Verificar que las
  pruebas existentes siguen pasando
- [ ] 2.3 Comprobar que el armado no toca ninguna API del navegador y corre en
  Node. Verificar con una prueba de entorno `node` que construye un documento de
  cada tipo sin `document` ni `window`

## 3. Las rutas de descarga

- [ ] 3.1 Crear la ruta de descarga de mantenimientos, con el formato como
  parámetro, reutilizando el armado de filtros por rol que la ruta de listado ya
  usa. Verificar con pruebas de que un cliente solo obtiene su empresa, un técnico
  solo lo suyo, y que indicar una empresa ajena no entrega esos datos
- [ ] 3.2 Crear la ruta de descarga de historial, igual. Verificar con las mismas
  tres pruebas de alcance
- [ ] 3.3 Crear la ruta de descarga de equipos, igual, sin rango de fechas.
  Verificar con las mismas tres pruebas de alcance
- [ ] 3.4 Comprobar que ninguna de las tres consultas lleva paginación. Verificar
  con una prueba de que la consulta se construye sin `skip` ni `take`
- [ ] 3.5 Añadir el docblock `@jest-environment node` a las pruebas de estas rutas,
  o no correrán
- [ ] 3.6 Escribir todas estas pruebas doblando Prisma para que corran siempre.
  Verificar que **no** quedan en `src/__tests__/integracion/`: esas dos suites hacen
  `return` sin ejercitar nada cuando no encuentran la base y pasan en verde sin
  haber probado nada

## 4. El rango de fechas

- [ ] 4.1 Acotar la descarga de mantenimientos por rango usando `fechaReferencia`,
  que ya existe, y el mismo lector de parámetros que el panel usa. Verificar con
  pruebas de que un trabajo pendiente entra por su fecha programada y uno realizado
  por su fecha realizada
- [ ] 4.2 Aplicar el rango por defecto cuando no llega ninguno, con el mismo
  criterio del panel. Verificar con una prueba
- [ ] 4.3 Comprobar que el recuento del archivo coincide con el que el panel cuenta
  para ese mismo rango. Verificar con una prueba que ejercita ambos caminos sobre
  los mismos datos: es el requisito que impide que un mes dé dos cifras
- [ ] 4.4 Añadir el selector de rango a la pantalla de mantenimientos, que hoy no
  tiene ninguno. Verificar con una prueba de que el rango elegido viaja en la
  petición de descarga

## 5. Lo que el archivo declara

- [ ] 5.1 Incluir en cada archivo de listado el recuento de elementos y los filtros
  aplicados. Verificar con una prueba sobre el documento construido
- [ ] 5.2 Incluir el rango en los archivos de mantenimientos, junto a la fecha de
  generación que ya llevan. Verificar con una prueba
- [ ] 5.3 Dejar constancia en el archivo de que recoge solo el alcance del rol
  cuando quien exporta es cliente o técnico. Verificar con una prueba por rol
- [ ] 5.4 Producir un archivo con cabecera y sin filas cuando los filtros no dejan
  nada, indicando que no hubo elementos. Verificar con una prueba de que no se
  produce un archivo vacío ni un error

## 6. Las pantallas

- [ ] 6.1 Cambiar las tres pantallas de listado para que pidan el archivo al
  servidor con los filtros aplicados, en lugar de armarlo con el estado del
  componente. Verificar con una prueba por pantalla de que la petición lleva los
  filtros visibles
- [ ] 6.2 Mostrar el estado de espera mientras el archivo se prepara, dejando el
  control inutilizable. Verificar con una prueba de que el control se deshabilita
  al pulsar
- [ ] 6.3 Informar del fallo si la descarga no llega, sin dejar el control colgado
  en estado de espera. Verificar con una prueba

## 7. Verificación con la aplicación corriendo

- [ ] 7.1 **[app]** Exportar cada listado con más de una página cargada y comprobar,
  abriendo el archivo, que trae el total anotado en 1.2 y no diez filas
- [ ] 7.2 **[app]** Exportar el mismo listado desde la primera página y desde la
  última, y comprobar que los dos archivos son iguales
- [ ] 7.3 **[app]** Abrir un Excel y un PDF nuevos de cada tipo junto a los
  guardados en 1.1 y compararlos. Las métricas de texto de un PDF generado en el
  servidor no tienen por qué coincidir con las del navegador: se comprueba mirando
  el documento, no con la suite
- [ ] 7.4 **[app]** Con sesión de cliente: exportar los tres listados y confirmar,
  abriendo los archivos, que no aparece ninguna empresa ajena
- [ ] 7.5 **[app]** Con sesión de técnico: exportar mantenimientos e historial y
  confirmar que solo aparece lo asignado a él
- [ ] 7.6 **[app]** Exportar mantenimientos de un rango y comparar el recuento del
  archivo con el que el panel muestra para ese mismo rango
- [ ] 7.7 **[app]** Comprobar que el estado de espera se ve de verdad, con una lista
  lo bastante grande como para que la generación tarde. La suite corre en jsdom y no
  compila CSS: puede pasar en verde con el indicador invisible

## 8. Cierre

- [ ] 8.1 Ejecutar `pnpm test` y confirmar que pasa
- [ ] 8.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint`, y confirmar contra la
  referencia de 1.3 que no se han añadido errores nuevos
- [ ] 8.3 Revisar que ninguna tarea quedó marcada sin que su verificación llegara a
  ejecutarse. Si alguna no se pudo comprobar, dejarla sin marcar y decir por qué
