## Context

Ver `proposal.md` — Why para la motivación y la evidencia.

Dos hechos del código de partida hacen que este cambio sea más pequeño de lo que
parece:

- La atadura al navegador de las ocho funciones de exportación es **la última
  línea de cada una**: `doc.save(...)` en PDF y `XLSX.writeFile(...)` en Excel.
  Todo lo anterior —cabeceras, tablas, totales, pies de página— es construcción del
  documento y corre igual en Node.
- El criterio de fecha que las exportaciones de mantenimientos necesitan ya está
  implementado y probado: `fechaReferencia` en `src/lib/estadisticas.ts` devuelve
  la realizada si existe y la programada si no. No hay que decidirlo otra vez, hay
  que reutilizarlo.

Lo que no existe es una vía para pedir un archivo al servidor: hoy toda la
exportación ocurre en el navegador con datos que la pantalla ya tenía.

## Goals / Non-Goals

**Goals:**

- Que el archivo no pueda volver a quedarse corto en silencio. Que quede corto es
  un fallo posible; que no se note es el defecto que se está corrigiendo.
- Conservar el aspecto de los archivos actuales. Este cambio corrige qué contienen,
  no cómo se ven.
- Que el alcance por rol se aplique en un solo sitio y no una vez por listado.

**Non-Goals:**

- Rediseñar los informes.
- Sustituir la librería de Excel o la de PDF.

## Decisions

### Partir cada función en construir y entregar

Cada una de las ocho funciones se parte en dos: una que arma el documento y
devuelve el objeto, y una capa fina que lo entrega. En el servidor la entrega es
`doc.output(...)` y `XLSX.write(..., { type: "buffer" })` con las cabeceras de
descarga.

*Alternativa descartada:* reescribir las exportaciones desde cero con una librería
que sirva en ambos lados. Cambiaría el aspecto de todos los archivos, que es
justo lo que nadie pidió, y convertiría un cambio acotado en una migración.

*Alternativa descartada:* dejar la generación en el navegador y limitarse a pedir
todos los datos sin paginar. Arregla el truncado con menos trabajo, pero traer
quinientos registros al navegador para volcarlos en un archivo carga la memoria del
cliente sin motivo, y deja el alcance por rol dependiendo de que la pantalla pida
lo correcto. Se descarta por lo segundo más que por lo primero.

### El alcance por rol se resuelve en la construcción de la consulta, no en la ruta

Las rutas de descarga reutilizan el mismo armado de filtros que las rutas de
listado ya usan para acotar por rol.

*Alternativa descartada:* que cada ruta de descarga aplique el alcance por su
cuenta. Serían tres implementaciones del mismo filtro de seguridad, y la
divergencia entre ellas no se vería en pantalla: un cliente exportaría de más y
nadie lo notaría hasta que abriera el archivo. El proyecto ya tiene el precedente
de una rama de API que atendía a dos roles sin comprobar la propiedad y que la
interfaz tapaba.

### Una ruta de descarga por listado, con el formato como parámetro

Tres rutas —mantenimientos, historial, equipos— y el formato como parámetro de
cada una, en lugar de seis rutas.

*Alternativa descartada:* una única ruta genérica que reciba qué listado exportar.
Tendría que ramificar por tipo para elegir columnas, filtros y alcance, y acabaría
siendo las tres rutas metidas en un `switch` con el añadido de que el alcance por
rol dependería de un parámetro de la petición.

### El rango se resuelve con lo que ya existe

Los parámetros del rango se interpretan con el mismo lector que el panel usa, que
ya cubre el rango por defecto cuando no llega ninguno, el completado cuando llega
solo uno y el rechazo del rango invertido.

*Alternativa descartada:* interpretar las fechas en cada ruta de descarga. Es donde
aparecerían las discrepancias de un día entre el panel y el archivo, que son las
más difíciles de ver y las que hacen que dos cifras del mismo mes no cuadren.

### Equipos se arregla del truncado y se queda sin rango

*Alternativa descartada:* acotar equipos por su fecha de alta para que las tres
pantallas se comporten igual. La simetría no vale una respuesta a una pregunta que
nadie hace: quien exporta equipos quiere el inventario, no los equipos dados de
alta en marzo.

## Risks / Trade-offs

**El archivo grande tarda, y quien no vea que tarda volverá a pulsar** → Cada clic
extra es una generación completa en el servidor. Mitigación: el estado de espera
visible es requisito de spec, no un detalle de interfaz, y el control queda
inutilizable mientras dure.

**Mover `xlsx` al servidor cambia el contexto en el que se ejecuta** → Hoy procesa
datos en el navegador de quien exporta; después lo hará en la infraestructura, con
la versión `^0.18.5` que ya no se publica en el registro público. Mitigación:
revisar el estado de la dependencia como primera tarea, antes de mover nada. Si
obliga a actualizar o a sustituirla, es mejor saberlo antes de haber partido las
ocho funciones.

**El aspecto de los archivos puede cambiar sin querer al partir las funciones** →
Las fuentes y las métricas de texto de un PDF generado en Node no tienen por qué
coincidir con las del navegador. Mitigación: guardar un archivo de cada tipo
generado con el código actual **antes** de tocar nada, y comparar contra él al
terminar. Después del cambio ya no se puede reproducir el original.

### Qué protege la suite y qué no

- **Protegido, con Prisma doblado para que corra siempre:** que la consulta de
  exportación no lleve paginación, que el rango filtre por la fecha de referencia
  y no por otra, que el alcance por rol se aplique, y que una empresa ajena en la
  petición de un cliente no entregue datos. Son afirmaciones sobre qué filas
  salen, y no necesitan base de datos real. No deben ir en
  `src/__tests__/integracion/`: esas dos suites hacen `return` sin ejercitar nada
  cuando no encuentran la base, y pasan en verde sin haber probado nada.
- **Protegido con reservas:** que el archivo lleve todas las filas. Se puede
  comprobar sobre el objeto construido antes de serializarlo. Lo que la prueba no
  cubre es que el archivo real se abra bien en Excel.
- **No protegido:** el aspecto del PDF y el del Excel. Hay pruebas de las
  funciones de exportación, pero comprueban que se llaman con los datos correctos,
  no cómo queda el documento. La comparación contra los archivos guardados de
  referencia es manual y hay que hacerla abriéndolos.
- **No protegido:** que el estado de espera se vea. La suite corre en jsdom, que no
  compila CSS. Se verifica mirándolo, con una lista lo bastante grande como para
  que la generación tarde.

## Migration Plan

No hay migración de datos ni cambios de esquema.

El orden importa: **guardar primero** un Excel y un PDF de cada listado generados
con el código actual, para tener contra qué comparar. Una vez partidas las
funciones, el comportamiento anterior ya no se puede reproducir sin volver atrás.

Para revertir basta con deshacer: las pantallas vuelven a armar el archivo en el
navegador y las rutas de descarga quedan sin uso. Ningún archivo ya descargado
depende de que las rutas sigan existiendo.

Conviene avisar a quien use los informes de que los archivos van a crecer. La
primera lectura de un Excel que pasa de diez filas a quinientas es que algo se
rompió, y es lo contrario.
