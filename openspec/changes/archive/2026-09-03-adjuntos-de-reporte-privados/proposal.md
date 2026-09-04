## Why

El reporte en PDF de un mantenimiento se guarda hoy en la carpeta pública de la
aplicación y se enlaza por su ruta directa. Esa ruta no comprueba a quién
pertenece el archivo: basta una sesión cualquiera —la de un cliente de otra
empresa, la de un técnico que no tiene nada que ver con el trabajo— para que el
informe se entregue entero. La dirección no es difícil de adivinar —lleva una
marca de tiempo y el nombre original del archivo— y además viaja dentro de las
respuestas de la aplicación, así que no hace falta adivinarla.

La subida tampoco comprueba nada más allá de que exista sesión: no mira el rol, ni
a qué mantenimiento pertenece el archivo, ni si quien sube tiene algo que ver con
él. Y no comprueba que el archivo sea realmente un PDF: se fía del tipo que declara
el navegador, que lo pone quien envía.

A eso se suma que esa carpeta se sirve desde la compilación. Escribir en ella
mientras la aplicación corre funciona en desarrollo y no sobrevive a un
despliegue: los archivos subidos desaparecen en la siguiente publicación.

Hoy lo tapa que la función apenas se usa. Deja de taparlo en cuanto el técnico
adjunte un reporte en cada cierre, que es justo lo que
`vista-unica-tecnico-mantenimiento` va a pedirle. Este cambio debería entrar antes
que aquel.

## What Changes

### Dónde viven los archivos

- Los reportes salen de la carpeta pública y pasan a un directorio privado del
  servidor, que ninguna ruta estática expone.
- El archivo de un mantenimiento se nombra por el propio mantenimiento, no por lo
  que el archivo original se llamara. Un mantenimiento tiene como mucho un reporte.

### Quién puede subir

- Adjuntar un reporte SHALL exigir que el mantenimiento ya exista y que quien sube
  pueda editarlo: el administrador siempre, y el técnico cuando es suyo y sigue
  abierto. Cualquier otro caso se rechaza.
- **BREAKING** El reporte deja de poder adjuntarse mientras se crea un
  mantenimiento nuevo. Se guarda primero y se adjunta después, sobre el
  mantenimiento ya existente. Afecta al formulario de creación del administrador.
- El archivo se comprueba por su contenido, no por lo que diga el navegador.

### Quién puede descargar

- El reporte se descarga por una ruta que exige sesión y aplica el mismo alcance
  que la lectura del mantenimiento: quien puede ver el mantenimiento puede abrir su
  reporte, y nadie más. No cambia quién lo ve hoy en la interfaz; cambia que ahora
  se comprueba.
- El archivo se entrega para guardarse, no para ejecutarse dentro de la aplicación.

### Lo que se limpia

- Eliminar un mantenimiento SHALL llevarse su reporte. Hoy quedaría en el disco sin
  nada que lo referencie.

## Capabilities

### New Capabilities

- `adjuntos-de-reporte`: quién puede adjuntar el reporte de un mantenimiento, quién
  puede abrirlo, qué se admite como archivo y qué garantías tiene su custodia.

### Modified Capabilities

Ninguna. `edicion-mantenimiento` describe qué campos se pueden cambiar y no entra
en cómo se custodia el archivo.

## Impact

### Comportamiento observable

Para quien usa la aplicación, casi nada cambia: el enlace al reporte sigue en el
mismo sitio y lo sigue viendo la misma gente. Lo que cambia es que ahora hay que
tener sesión y alcance para que se abra.

Lo que sí se nota es que el administrador ya no puede adjuntar el reporte en el
mismo gesto con el que crea un mantenimiento. Es el precio de exigir que el archivo
tenga dueño desde el primer momento.

### Migración

**No hay nada que migrar, y es el motivo de hacerlo ahora.** `public/uploads/` no
existe en el repositorio: nunca se ha subido un archivo por esta vía. El coste de
cambiar dónde viven es cero hoy y sube con cada PDF que alguien adjunte.

Queda por comprobar si alguna instalación en uso tiene mantenimientos con reporte
apuntando a la ruta antigua. Si los hay, apuntan a archivos que ya no existen.

### Código afectado

- `src/app/api/upload/route.ts` — la ruta genérica de subida desaparece. Su
  sustituta cuelga del mantenimiento al que pertenece el archivo, que es lo que le
  permite comprobar pertenencia.
- Una ruta nueva de descarga, con la misma comprobación de alcance que la lectura
  del mantenimiento ya aplica.
- `src/components/mantenimientos/mantenimiento-form.tsx` — el campo de reporte pasa
  a ofrecerse solo al editar.
- La eliminación de un mantenimiento, para que se lleve el archivo.
- `.gitignore` — la regla de `public/uploads/` queda sin objeto.

Sin cambios en `prisma/schema.prisma`: `reporteUrl` sigue guardando una dirección,
solo que ahora la de una ruta que comprueba quién pregunta. Las pantallas que hoy
enlazan el reporte no necesitan tocarse.

### Evidencia recogida antes de proponer

- `src/app/api/upload/route.ts:14` — la única comprobación es que exista sesión.
  No mira rol, ni empresa, ni a qué mantenimiento pertenece el archivo.
- `src/app/api/upload/route.ts:28` — el tipo se valida con `file.type`, que es lo
  que declara quien envía, no lo que el archivo contiene.
- `src/app/api/upload/route.ts:47` y `:58` — el destino es
  `public/uploads/reportes/` y la dirección devuelta es `/uploads/reportes/...`,
  servida como recurso estático. Comprobado sobre la aplicación corriendo: el
  `matcher` del middleware alcanza esa ruta, así que sin sesión redirige a
  `/login`; con cualquier sesión —incluida la de un cliente de otra empresa— el
  archivo se entrega completo, con `200` y `application/pdf`. Lo que falta no es
  autenticación, es alcance.
- `src/app/api/upload/route.ts:43` — el nombre es la marca de tiempo más el nombre
  original del archivo.
- `public/uploads/` no existe en el árbol; `.gitignore:34` la contempla pero nunca
  llegó a usarse.
- `src/components/mantenimientos/mantenimiento-detail.tsx:268` enlaza el reporte
  sin comprobación propia: el alcance depende por completo de que la dirección no
  se conozca.

## Fuera de alcance

Registrado a propósito. No se implementa aquí:

- **Almacenamiento externo.** Se consideró y se descarta para este cambio: el
  despliegue previsto conserva el disco entre reinicios, y una carpeta privada
  resuelve el problema sin credenciales ni servicios de terceros. Si el despliegue
  cambiara a uno sin disco persistente, esta decisión hay que rehacerla, y el
  diseño deja dicho por dónde.
- **Más de un reporte por mantenimiento.** Un mantenimiento tiene como mucho uno,
  que es lo que el modelo ya permite. Admitir varios es otra funcionalidad.
- **Adjuntos que no sean el reporte** —fotos del equipo, presupuestos—. Nadie los
  ha pedido.
- **Un antivirus sobre lo que se sube.** Se comprueba que el archivo sea realmente
  un PDF y que no exceda el tamaño; analizar su contenido en busca de código
  malicioso es otra cosa, exige un servicio aparte y no está justificado a esta
  escala. Entregarlo para guardar y no para abrirse dentro de la aplicación es lo
  que acota el riesgo aquí.
- **Restringir al cliente la lectura del reporte.** Se decidió mantener quién lo ve
  hoy: administrador, técnico asignado y cliente de la empresa del equipo.
