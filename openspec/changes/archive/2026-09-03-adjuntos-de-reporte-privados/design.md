## Context

Ver `proposal.md` — Why para la motivación y la evidencia.

Tres hechos del punto de partida:

- La subida actual es una ruta genérica que no sabe a qué mantenimiento pertenece
  el archivo. No es un descuido de validación: es que en el momento de subir, el
  archivo todavía no pertenece a nada. El formulario sube primero y guarda la
  dirección después.
- `public/uploads/` no existe en el árbol. No hay archivos, no hay migración, y
  cualquier decisión que se tome ahora sale gratis.
- `Mantenimiento.reporteUrl` es un texto libre que hoy guarda una ruta pública.
  Nada impide que guarde otra distinta, y las pantallas que lo enlazan no
  distinguen una de otra.

## Goals / Non-Goals

**Goals:**

- Que la dirección del archivo deje de ser la única barrera. Hoy quien la conoce lo
  abre.
- Que la comprobación de alcance sea la misma que ya rige la lectura del
  mantenimiento, y no una segunda regla que pueda divergir de ella.
- Que las pantallas que enlazan el reporte no tengan que cambiar.

**Non-Goals:**

- Un sistema de adjuntos general. Este es el reporte de un mantenimiento, uno como
  mucho por mantenimiento.
- Analizar el contenido del PDF en busca de código malicioso.

## Decisions

### El archivo cuelga del mantenimiento, y por eso puede comprobarse

La subida y la descarga pasan a ser operaciones sobre un mantenimiento concreto,
identificado en la propia petición. Es lo que permite comprobar pertenencia: con
el mantenimiento a la vista se puede decidir si quien pide tiene alcance,
reutilizando la misma comprobación que la lectura y la edición ya aplican.

*Alternativa descartada:* mantener la ruta genérica y añadirle comprobaciones. No
hay nada que comprobar contra qué: en el momento de subir, el archivo no pertenece
a nada. Cualquier regla que se añadiera sería sobre el usuario, no sobre el
archivo, y no impediría que alguien subiera un archivo y lo colgara después de un
mantenimiento ajeno.

### Se guarda primero, se adjunta después

Como consecuencia de lo anterior, el reporte solo puede adjuntarse a un
mantenimiento que ya existe. En el formulario de creación el campo desaparece; en
el de edición se queda.

*Alternativa descartada:* subir a un área temporal atada a quien sube y vincular el
archivo al guardar el mantenimiento. Es lo que permitiría conservar el gesto único
al crear, pero introduce archivos que no pertenecen a nada durante un rato, y por
tanto un proceso de limpieza de los que nunca llegan a vincularse. Ese proceso hay
que escribirlo, programarlo y vigilarlo, y cuando falle lo hará en silencio
llenando el disco. Se descarta por lo que arrastra, no por lo que cuesta.

*Alternativa descartada:* enviar el archivo junto con el resto del formulario en
una sola petición. Evita el área temporal y conserva el gesto único, pero obliga a
convertir a multiparte las rutas de creación y edición del mantenimiento, que hoy
son JSON, y a que su validación conviva con la del archivo. Es más cambio en el
sitio de más riesgo del sistema a cambio de un gesto.

Para el técnico esta decisión no supone nada: cuando adjunta, el mantenimiento
siempre existe.

### El archivo se nombra por el mantenimiento

Un mantenimiento tiene como mucho un reporte, así que el nombre del archivo en
disco se deriva del identificador del mantenimiento. No se usa el nombre original.

Esto resuelve tres cosas de una vez: el nombre deja de ser adivinable a partir de
una marca de tiempo, deja de haber forma de que el nombre recibido influya en la
ruta de escritura, y sustituir un reporte sobrescribe el anterior sin dejar
huérfanos.

*Alternativa descartada:* un identificador opaco por archivo, guardado en el
mantenimiento. Es lo que haría falta si un mantenimiento pudiera tener varios
reportes. Con uno como mucho, añade una indirección que no compra nada.

### `reporteUrl` sigue guardando una dirección, y por eso las pantallas no cambian

El campo pasa a guardar la ruta de descarga del mantenimiento. Sigue siendo una
dirección que un enlace puede usar, así que el detalle, la tabla y el formulario
funcionan sin tocarse, y no hace falta migración de esquema.

*Alternativa descartada:* convertir el campo en un indicador de si hay reporte y
componer la dirección en cada pantalla. Es más limpio conceptualmente y obliga a
tocar las tres pantallas y a migrar el campo, a cambio de nada observable.

### La entrega es descarga, no visualización dentro de la aplicación

El archivo se entrega con el tipo que el sistema determinó al aceptarlo, como
descarga, y con la cabecera que impide que el tipo se reinterprete. Un PDF puede
llevar contenido activo, y servirlo dentro del origen de la aplicación lo pondría a
ejecutarse con sus mismos permisos.

*Alternativa descartada:* servirlo en línea para que se vea en el navegador sin
descargarlo. Es más cómodo y es exactamente el escenario que conviene evitar
mientras no se analice lo que se sube.

### Si el despliegue cambia, esto es lo que hay que rehacer

La decisión de guardar en disco descansa en que el despliegue conserve el
directorio entre reinicios. Si eso deja de ser cierto —un alojamiento sin disco
persistente, o varias instancias sin disco compartido—, lo que cambia es dónde se
escribe y de dónde se lee, y nada más: la comprobación de alcance, el nombrado y la
entrega siguen valiendo igual. Conviene que la lectura y la escritura del archivo
queden en un solo sitio, para que ese cambio sea una sustitución y no una búsqueda.

## Risks / Trade-offs

**El directorio privado puede quedar dentro de lo que se publica** → Si se coloca
por descuido bajo la carpeta pública, el cambio no sirve de nada y todo lo demás
seguirá pareciendo correcto. Mitigación: comprobarlo explícitamente pidiendo el
archivo por su ruta estática y confirmando que no llega, en lugar de dar por hecho
que el directorio elegido no se publica.

**El disco se llena y nadie se entera** → Cada mantenimiento puede acumular hasta
el tamaño máximo admitido, y ya no hay proceso que borre nada salvo la eliminación
del mantenimiento. A la escala prevista no es un problema; a otra escala lo sería
sin avisar.

**La comprobación de alcance podría divergir de la del mantenimiento** → Si se
escribe una regla propia para el archivo, con el tiempo dejará de coincidir con
quién puede ver el mantenimiento, y la diferencia no se verá en pantalla.
Mitigación: derivar el alcance de la misma consulta que ya decide si alguien puede
leer el mantenimiento, no de una copia de sus condiciones.

**Un reporte huérfano de la ruta antigua** → Si alguna instalación en uso tiene
mantenimientos con reporte apuntando a `/uploads/...`, esos enlaces quedan rotos.
En este árbol no hay ninguno, pero conviene comprobarlo en la base antes de dar el
cambio por cerrado en lugar de suponerlo.

### Qué protege la suite y qué no

- **Protegido, con Prisma doblado para que corra siempre:** que sin sesión no se
  entregue, que cada rol obtenga o no obtenga el archivo según su alcance, que
  adjuntar a un mantenimiento ajeno se rechace, que un archivo que no es PDF se
  rechace, y que el nombre recibido no influya en dónde se escribe. Son
  afirmaciones sobre decisiones del servidor y ninguna necesita base real. Las
  pruebas de estas rutas necesitan el docblock `@jest-environment node`. No deben
  ir en `src/__tests__/integracion/`: esas dos suites hacen `return` sin ejercitar
  nada cuando no encuentran la base y pasan en verde sin haber probado nada.
- **No protegido, y es la comprobación que de verdad cierra el cambio:** que el
  directorio elegido no se sirva como recurso estático. Ninguna prueba de la suite
  lo cubre; hay que pedir el archivo por su ruta estática con la aplicación
  corriendo y confirmar que no llega. Una suite entera en verde es compatible con
  que el directorio siga publicándose.
- **No protegido:** que el PDF descargado se abra bien. Se comprueba abriéndolo.

## Migration Plan

No hay migración de archivos: `public/uploads/` no existe en el árbol.

Sí conviene comprobar en la base si hay mantenimientos con `reporteUrl` apuntando a
la ruta antigua. Si los hay, apuntan a archivos inexistentes y lo honesto es
vaciar el campo, no dejar un enlace que falla al abrirse.

El cambio se puede revertir mientras no se haya adjuntado nada por la vía nueva. En
cuanto haya reportes en el directorio privado, revertir los deja inaccesibles: la
versión anterior solo sabe leer de la carpeta pública. No es pérdida de datos, pero
hay que saberlo antes de revertir y no después.

Este cambio debería entrar **antes** que
`vista-unica-tecnico-mantenimiento`, que multiplica el uso de los adjuntos.
