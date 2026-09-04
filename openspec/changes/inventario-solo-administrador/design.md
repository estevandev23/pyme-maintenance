## Context

Ver `proposal.md` — Why para la motivación y la evidencia.

Este es el cambio más pequeño de los cuatro y el que más fácil es dejar a medias,
porque casi todo él consiste en quitar. Dos observaciones del punto de partida
explican por qué conviene mirarlo con algo de cuidado:

- La protección del estado del equipo **ya existe** en la modificación y **falta**
  en la creación. No es que nadie hubiera pensado en ello: se pensó una vez y no se
  aplicó en los dos sitios. Eso es exactamente lo que vuelve a pasar cuando una
  regla de permisos se escribe verbo a verbo.
- No hay ninguna capacidad publicada sobre el inventario, y sin embargo cinco de
  las publicadas dependen de él. Esa es la razón de que un permiso contrario a lo
  decidido pudiera vivir meses sin que nada lo señalara.

## Goals / Non-Goals

**Goals:**

- Que la regla quede escrita una vez y valga para los tres verbos, en lugar de
  repetirse en cada uno con la posibilidad de divergir.
- Que la interfaz y el servidor digan lo mismo. Hoy coinciden en ofrecer de más;
  después deben coincidir en no ofrecerlo.

**Non-Goals:**

- Revisar el reparto de permisos de otras entidades. Se ha mirado el de equipos
  porque había una decisión explícita que lo contradecía.

## Decisions

### La regla se escribe como «quién puede», no como «quién no puede»

Las tres comprobaciones actuales están escritas en negativo: rechazan al técnico y
dejan pasar al resto. Pasan a estar escritas en positivo: admiten al administrador
y rechazan al resto.

*Alternativa descartada:* añadir el cliente a la lista de rechazados y dejar el
resto igual. Funciona hoy y falla en cuanto aparezca un rol nuevo, que entrará por
la puerta sin que nadie lo decida. La forma negativa es la que produjo el defecto
que se está corrigiendo: cuando se añadió el rol de cliente, heredó todo lo que no
estuviera expresamente prohibido.

### El estado del equipo nuevo se normaliza, no se rechaza

Al registrar un equipo declarado en mantenimiento, el equipo se registra con el
estado que le corresponde por no tener trabajo, en lugar de rechazar la operación
entera.

*Alternativa descartada:* rechazar con un error de validación. Es más estricto y
más fácil de probar, pero convierte en un fallo lo que para el administrador es un
descuido de un desplegable, y no aporta nada: el estado correcto es deducible sin
ambigüedad, porque un equipo recién creado no tiene ningún mantenimiento. El
sistema ya trata así el estado de mantenimiento en todas partes —lo calcula a
partir del trabajo abierto, no lo acepta como declaración—, y esta es la única
puerta por la que se aceptaba a ciegas.

*Alternativa descartada:* dejar que el administrador lo declare, por ser quien
manda. Rompería el invariante igual que lo rompía el cliente, y el invariante no es
una regla de permisos: es lo que hace que la pantalla de equipos signifique algo.

### La interfaz se ajusta a la vez, no después

Las condiciones que deciden qué se ofrece al cliente se corrigen en el mismo
cambio que los permisos del servidor.

*Alternativa descartada:* cerrar el servidor y dejar la interfaz para más adelante.
El cliente vería los botones, los pulsaría y recibiría un error. Un permiso bien
puesto que se presenta como una aplicación rota es peor que el permiso mal puesto,
porque genera avisos de fallo que no lo son.

## Risks / Trade-offs

**El cliente se queda bloqueado y no sabe por qué** → Alguien que registraba sus
equipos dejará de poder, sin explicación si nadie se la da. Mitigación: avisarlo
antes de desplegar. No se añade un mensaje en la aplicación explicando la nueva
política porque sería un texto que envejece mal y que casi nadie leerá; el aviso
por las vías habituales llega mejor.

**Queda un vacío operativo real** → Entre que el cliente tiene un equipo nuevo y
que el administrador lo registra, no puede pedir servicio sobre él. Es la
consecuencia aceptada de la decisión, no un efecto imprevisto. Si llega a
molestar, la respuesta es la vía de solicitud de alta que el proposal deja fuera
de alcance.

**Los tres verbos pueden quedar corregidos a distinto ritmo** → Es literalmente el
defecto que se está arreglando: la protección del estado existía en uno y faltaba
en otro. Mitigación: una prueba por verbo y por rol, incluido el técnico, que ya
estaba bien. Comprobar solo lo que se cambia deja sin red lo que ya funcionaba.

### Qué protege la suite y qué no

- **Protegido, con Prisma doblado para que corra siempre:** que cada rol pueda o no
  pueda registrar, modificar y eliminar; que el estado de mantenimiento no se acepte
  al registrar; y que el cliente conserve la consulta de su empresa y el registro de
  solicitudes. Son nueve combinaciones de verbo y rol y ninguna necesita base real.
  Las pruebas de estas rutas necesitan el docblock `@jest-environment node`. No
  deben ir en `src/__tests__/integracion/`: esas dos suites hacen `return` sin
  ejercitar nada cuando no encuentran la base y pasan en verde sin haber probado
  nada.
- **No protegido:** que la pantalla deje de ofrecer al cliente los botones. Se puede
  escribir una prueba de que no se renderizan, y conviene, pero la comprobación que
  de verdad cierra esta parte es entrar con sesión de cliente y mirar: la suite corre
  en jsdom y un botón puede seguir ahí, invisible por CSS que jsdom no compila, o
  desaparecido por un motivo distinto del que se pretendía.
- **Riesgo de falso verde:** una prueba que compruebe «el cliente recibe un error»
  pasa igual si el error es de permisos que si es de cualquier otra cosa. Conviene
  que afirme además que el equipo conserva sus datos, que es lo que de verdad
  importa.

## Migration Plan

No hay migración de datos ni cambios de esquema. Los equipos que el cliente creó
son equipos válidos y se quedan como están.

Conviene comprobar, antes de dar el cambio por cerrado, si algún equipo quedó
figurando en mantenimiento sin tener trabajo abierto con técnico. Serían los que
entraron por la puerta que este cambio cierra. No se repara automáticamente: se
mira cuántos hay y, si hay alguno, se corrige a mano.

Para revertir basta con deshacer. Nada de lo que el cambio hace deja datos que la
versión anterior no sepa leer.
