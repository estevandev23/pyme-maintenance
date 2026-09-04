## Why

Se decidió que la empresa de mantenimiento es quien registra los equipos, y que el
administrador es el único que puede darlos de alta. El sistema hace lo contrario:
un cliente crea equipos y los edita, y la interfaz se lo ofrece. El comentario que
encabeza esa comprobación lo dice en voz alta —«Solo admin y cliente pueden crear
equipos»— así que no es un descuido, es un modelo anterior que nadie retiró.

Al comprobarlo apareció además una consecuencia que nadie había mirado: el estado
del equipo llega sin filtrar al darlo de alta. Un cliente puede crear un equipo
directamente **en mantenimiento**, y ahí queda: figura ocupado sin que exista
ningún trabajo abierto que lo justifique. El sistema tiene el invariante de que un
equipo figura en mantenimiento si y solo si tiene trabajo abierto con técnico, y lo
mantiene con cuidado en cada cambio de estado de los mantenimientos. Esa vigilancia
se salta por completo si el equipo nace ya en ese estado.

## What Changes

### El inventario pasa al administrador

- **BREAKING** El cliente deja de poder dar de alta equipos. Hoy puede, y la
  interfaz le ofrece el botón.
- **BREAKING** El cliente deja de poder modificar equipos. Hoy puede cambiar el
  tipo, la marca, el modelo, el serial y la ubicación de los equipos de su empresa.
  Quien no da de alta un equipo tampoco cambia su identidad.
- El cliente conserva lo que hace con ellos: consultar los de su empresa y
  solicitar servicio sobre ellos. Ese es el uso que el sistema le pide.
- El técnico sigue sin tocar el inventario, como hasta ahora.
- La interfaz deja de ofrecer al cliente entradas que ya no puede usar, en lugar de
  ofrecerlas y fallar al pulsarlas.

### El alta no puede contradecir el invariante

- Un equipo recién dado de alta MUST NOT quedar figurando en mantenimiento: no
  tiene ningún trabajo abierto que lo justifique. Se aplica a quien lo dé de alta,
  administrador incluido.

### Cómo entra un equipo nuevo a partir de ahora

El cliente avisa por sus vías habituales y el administrador lo registra. No se
construye ninguna vía dentro de la aplicación para pedirlo: se consideró y se
descarta abajo.

## Capabilities

### New Capabilities

- `inventario-de-equipos`: quién da de alta, modifica y consulta los equipos, y qué
  estado puede tener un equipo recién registrado. Ninguna capacidad publicada cubre
  hoy la gestión del inventario; varias lo dan por supuesto.

### Modified Capabilities

Ninguna. `edicion-mantenimiento` fija el invariante del estado del equipo respecto
al trabajo abierto, y este cambio no lo altera: cierra una vía por la que se
incumplía.

## Impact

### Comportamiento observable

El cliente pierde dos botones que hoy tiene. Es el objetivo del cambio y hay que
avisarlo antes de desplegarlo: alguien que registraba sus propios equipos se
encontrará sin poder hacerlo y sin saber por qué.

Queda un vacío operativo asumido a propósito: un cliente con un equipo nuevo no
puede solicitar mantenimiento sobre él hasta que el administrador lo registre. Se
acepta porque la alternativa es una funcionalidad entera, y porque el volumen de
altas de una pyme no justifica construirla todavía.

### Código afectado

- `src/app/api/equipos/route.ts` — la creación admite hoy al cliente y le fuerza su
  empresa. Pasa a admitir solo al administrador, y el estado del equipo nuevo deja
  de aceptarse tal cual llega.
- `src/app/api/equipos/[id]/route.ts` — la modificación admite hoy al cliente y le
  descarta la empresa y el estado. Pasa a admitir solo al administrador. La
  eliminación ya era exclusiva suya y no cambia.
- `src/app/(dashboard)/equipos/page.tsx` — las condiciones que deciden qué se le
  ofrece al cliente incluyen hoy crear y editar.

Sin cambios en `prisma/schema.prisma` y sin migración de datos: los equipos que el
cliente creó siguen siendo equipos válidos.

### Evidencia recogida antes de proponer

- `src/app/api/equipos/route.ts:124` — el comentario dice «Solo admin y cliente
  pueden crear equipos» y la comprobación siguiente solo rechaza al técnico.
- `src/app/api/equipos/route.ts:133` — al cliente se le fuerza su propia empresa,
  lo que confirma que su creación era intencionada y no un hueco olvidado.
- `src/app/api/equipos/route.ts:116-140` — en la creación no se descarta el estado
  recibido para ningún rol. Es la vía por la que un equipo puede nacer en
  mantenimiento.
- `src/app/api/equipos/[id]/route.ts:132` — en la modificación **sí** se le
  descartan al cliente la empresa y el estado. La protección existe en un verbo y
  falta en el otro.
- `src/app/(dashboard)/equipos/page.tsx:218` y `:219` — la interfaz ofrece crear y
  editar al cliente, así que el permiso no era solo teórico.
- `src/app/api/equipos/[id]/route.ts:208` — la eliminación ya está restringida al
  administrador. Es el precedente de cómo queda el resto.
- No existe ninguna capacidad publicada sobre el inventario de equipos, aunque
  `flujo-de-solicitudes`, `asignacion-tecnicos`, `edicion-mantenimiento`,
  `presentacion-del-panel` y `reportes-estadisticas` dependen todas de él.

## Fuera de alcance

Registrado a propósito. No se implementa aquí:

- **Que el cliente pueda solicitar el alta de un equipo dentro de la aplicación.**
  Se consideró y se descarta: es una funcionalidad completa —pantalla, estados,
  aprobación, avisos—, no el cierre de un permiso, y mezclarla aquí convertiría un
  cambio de una tarde en otro proyecto. Si el vacío operativo llega a molestar, se
  propone entonces con lo aprendido de cuántas altas hay de verdad.
- **Revisar los equipos que el cliente creó.** Son equipos válidos y no se tocan.
  Si alguno quedó en un estado que no le corresponde, se corrige a mano; no se
  monta una reparación automática para un caso que nadie ha observado.
- **Que el técnico pueda registrar equipos que encuentra en sitio.** Nadie lo ha
  pedido y va contra la decisión que motiva el cambio.
- **El alta masiva de equipos por importación.** Es la funcionalidad que de verdad
  aliviaría al administrador si el volumen creciera, y no hay evidencia de que ese
  volumen exista.
