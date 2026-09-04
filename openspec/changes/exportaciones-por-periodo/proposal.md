## Why

Se pidió un selector de periodo para los informes, porque «las exportaciones botan
todo el historial sin filtro». Al ir a comprobarlo apareció lo contrario, y es
peor: las exportaciones de listados no botan todo el historial, botan **la página
que se está viendo**. Diez filas.

Las tres pantallas de listado —equipos, mantenimientos e historial— paginan contra
el servidor de diez en diez y construyen el archivo con lo que tienen cargado, que
es solo esa página. Con quinientos mantenimientos en la base, «Exportar a Excel»
produce un archivo de diez filas que en ninguna parte dice que sean diez de
quinientos.

Un informe incompleto que se presenta como completo es peor que un informe que
falta: el que falta se nota, y este se firma.

El periodo, que es lo que se pidió, sigue haciendo falta. Pero montarlo encima de
esto no arreglaría nada: se exportarían las diez primeras filas *del periodo*.

## What Changes

### Lo que se corrige

- Las exportaciones dejan de depender de lo que la pantalla tiene cargado. El
  archivo cubre todo lo que cumple los filtros aplicados, no la página visible.
- **BREAKING** Un archivo exportado de una lista con más de diez elementos pasa a
  tener un contenido distinto —el completo—. Quien haya guardado exportaciones
  anteriores verá que no cuadran con las nuevas.

### Lo que se añade

- Las exportaciones de mantenimientos aceptan un rango de fechas, con el mismo
  criterio de fecha que el panel de estadísticas ya usa: la fecha realizada cuando
  existe, y la programada cuando el trabajo aún no se ha hecho.
- El archivo exportado declara el periodo con el que se generó y cuántos elementos
  contiene, de modo que un archivo truncado por cualquier motivo futuro se note al
  abrirlo.
- El historial ya tiene selector de fechas en pantalla; lo que gana es que la
  exportación respete ese filtro entero en lugar de su primera página.

### Dónde se genera

- Los archivos pasan a generarse en el servidor y a descargarse desde allí, en
  lugar de armarse en el navegador con los datos que la pantalla ya tenía.
- El alcance por rol se aplica donde ya se aplica hoy para todo lo demás: un
  cliente solo obtiene datos de su empresa y un técnico solo los mantenimientos
  que tiene asignados, sin que el rango pueda ampliar ese alcance.

## Capabilities

### New Capabilities

Ninguna. `reportes-estadisticas` ya cubre los informes; lo que cambia es su
alcance.

### Modified Capabilities

- `reportes-estadisticas`: hoy describe únicamente el panel de estadísticas y su
  exportación. Sus garantías —que lo exportado coincida con lo mostrado, que el
  archivo declare su alcance, y que el rol acote los datos— se extienden a las
  exportaciones de listados, que hoy no están cubiertas por ningún requisito. Se
  añade además que un archivo MUST NOT quedarse en la página visible, que es el
  defecto concreto que motiva el cambio.

## Impact

### Comportamiento observable

Los archivos exportados de listados cambian de tamaño de golpe. Es la corrección
buscada, pero conviene anunciarla: alguien que exporte lo mismo que exportó la
semana pasada va a obtener un archivo muy distinto, y la primera lectura será que
algo se rompió.

Las exportaciones grandes dejan de ser instantáneas. Armar quinientas filas en el
servidor y descargarlas tarda más que volcar las diez que el navegador ya tenía en
memoria.

### Código afectado

- `src/app/(dashboard)/mantenimientos/page.tsx`, `historial/page.tsx` y
  `equipos/page.tsx` — las tres arman hoy el archivo con el estado del componente,
  que es la página cargada. Pasan a pedir el archivo al servidor con los filtros
  aplicados.
- `src/lib/excel-export.ts` y `src/lib/pdf-export.ts` — cada función termina en
  `doc.save(...)` o `XLSX.writeFile(...)`, que solo existen en el navegador. Se
  separa el armado del documento, que es aritmética pura y corre igual en el
  servidor, de la entrega, que cambia según dónde se ejecute. El aspecto de los
  archivos actuales se conserva.
- Rutas nuevas de descarga bajo la API, una por listado, que apliquen el alcance
  por rol y devuelvan el archivo.
- `src/lib/estadisticas.ts` — no cambia: `fechaReferencia` ya implementa el
  criterio de fecha que las exportaciones de mantenimientos adoptan. Se reutiliza.

Sin cambios en `prisma/schema.prisma` y sin migración.

### Dependencias

`xlsx` está fijado en `^0.18.5`, una versión que ya no se publica en el registro
público. Hoy se ejecuta en el navegador de quien exporta; al mover la generación al
servidor pasaría a procesar datos en la infraestructura, que es un contexto
distinto. Conviene revisar su estado antes de moverlo. No bloquea el cambio, pero
este es el momento en que mirarlo cuesta menos.

### Evidencia recogida antes de proponer

Comprobado en las tres pantallas de listado, con el mismo patrón en las tres:

- `src/app/(dashboard)/mantenimientos/page.tsx:90` fija `itemsPerPage = 10`, la
  línea 172 lo manda como `limit` a la API, y la 177 guarda en el estado solo
  `result.data`, que es esa página. Las líneas 304 y 326 construyen los archivos
  Excel y PDF recorriendo ese mismo estado.
- `src/app/(dashboard)/historial/page.tsx` repite el patrón: `itemsPerPage = 10` en
  la línea 129, y las exportaciones de las líneas 237 y 253 recorren la página
  cargada. Esta pantalla **sí** tiene ya el selector de fechas, en la línea 414, y
  lo manda a la API: el filtro funciona, lo que no funciona es la exportación.
- `src/app/(dashboard)/equipos/page.tsx` hace lo mismo, con paginación de servidor
  en las líneas 105 y 106.
- El panel de estadísticas es la única exportación sana, y lo es porque sus
  indicadores llegan agregados del servidor y no pasan por ninguna paginación.
- `src/lib/pdf-export.ts` y `src/lib/excel-export.ts` — la única atadura al
  navegador es la última línea de cada una de las ocho funciones. Todo lo demás es
  construcción del documento.

## Fuera de alcance

Registrado a propósito. No se implementa aquí:

- **Un selector de periodo para equipos.** Un equipo no tiene fecha propia sobre la
  que acotar: existe o no existe. Acotarlo por su fecha de alta respondería a una
  pregunta que nadie ha hecho. Su exportación se arregla en lo del truncado, que sí
  le afecta, y se queda sin rango.
- **Un criterio de fecha configurable por quien exporta.** Se consideró ofrecer
  elegir entre fecha programada y fecha realizada, y se descarta: dos informes del
  mismo mes generados con criterios distintos no se pueden comparar, y nadie
  recordaría cuál se usó. Un solo criterio, el mismo que el panel.
- **Una pantalla de informes nueva.** Se extienden las exportaciones donde ya
  están.
- **Exportar en segundo plano con aviso al terminar.** Si el volumen crece hasta
  que la descarga directa moleste, hará falta; hoy no hay evidencia de que ese
  volumen exista, y montarlo ahora es infraestructura por adelantado.
- **El tiempo real de resolución de un ticket.** Sigue sin poder medirse por falta
  de marcas de tiempo del ciclo de vida, tal como `reportes-estadisticas` ya
  registra. Este cambio no lo mejora.
