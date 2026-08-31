## Context

Ver `proposal.md` para la motivación. Lo que condiciona el diseño:

- El reparto automático de técnicos ya existe y está probado. Devuelve el
  candidato de menor carga abierta y desempata por carga histórica; si no hay
  candidatos, hoy lanza un error que aborta la creación.
- El estado del equipo se decide hoy en dos sitios, ambos en las rutas de
  mantenimientos: la creación lo pone en `EN_MANTENIMIENTO` sin condiciones, y
  el cambio de estado lo devuelve a `ACTIVO` si no quedan otros mantenimientos
  abiertos. Ese recuento no distingue mantenimientos con técnico de los que no
  lo tienen, porque hasta ahora no podían existir.
- La pantalla de alertas se calcula al vuelo: no hay alertas almacenadas. El
  modelo `Alerta` existe en el esquema y no lo usa ninguna línea del código de
  la aplicación; la única referencia viva está en la limpieza previa del script
  de siembra, que este cambio también toca.
- No hay ninguna comprobación de rol en el middleware. El rol se hace cumplir
  dentro de cada manejador, uno por uno, y la barra lateral solo oculta
  entradas.
- No existe ninguna tabla de transiciones válidas para el estado de un
  mantenimiento.
- El repositorio tiene una sola migración, la inicial, y ningún script de
  Prisma en `package.json`.

## Goals / Non-Goals

**Goals:**

- Que el mantenimiento exista desde el instante de la solicitud, con técnico o
  sin él, sin que un fallo accesorio deshaga la petición del cliente.
- Que «el equipo está en mantenimiento» signifique exactamente «existe un
  mantenimiento abierto con técnico asignado», sin excepciones.
- Que la ausencia de técnico sea visible para quien puede resolverla, y que
  deje de serlo sola cuando se resuelva.
- Que las reglas nuevas —quién puede cancelar, cuándo, qué cuenta como carga—
  vivan en funciones puras reutilizables, no repetidas entre interfaz y
  servidor.

**Non-Goals:**

- No se construye un sistema de notificaciones. El correo de este cambio es un
  envío suelto en un único evento.
- No se introduce una máquina de estados del mantenimiento.
- No se toca el modelo `Alerta`. Las alertas siguen siendo derivadas.
- No se generaliza el mecanismo de configuración más allá del primer valor,
  aunque se elige una forma que admita los siguientes.

## Decisions

### 1. El mantenimiento se crea dentro de la ruta de solicitudes

La creación vive en el manejador de creación de solicitudes, en una transacción
que abarca solicitud, mantenimiento, historial y, cuando corresponda, el estado
del equipo.

**Alternativa descartada: que el cliente llame a la ruta de mantenimientos.**
Obligaría a abrir a `CLIENTE` una ruta que hoy es solo de administrador y que
acepta el mantenimiento entero, incluido el técnico. El cliente podría elegir
quién le atiende. Además el mensaje actual de esa ruta —«los clientes deben usar
solicitudes de servicio»— dejaría de ser cierto.

**Alternativa descartada: un proceso en segundo plano que convierta las
solicitudes.** Añade un componente que el proyecto no tiene y deja una ventana
en la que la solicitud existe y el mantenimiento no, que es justo el estado
intermedio que el cambio quiere eliminar.

### 2. La fecha programada se adelanta X días y se normaliza a medianoche; el criterio de «atrasado» del servidor pasa a día natural

La fecha se guarda como la medianoche local del día objetivo. En paralelo, la
comparación de alertas deja de usar el instante actual y pasa a comparar días
naturales, que es lo que ya hace la tabla de mantenimientos.

Sin esa segunda mitad, el cambio no funciona: con la comparación por instante, un
mantenimiento fechado a medianoche de su día objetivo figura como atrasado
durante todo el día en que debe hacerse.

**Alternativa descartada: conservar la hora de creación.** Sobrevive 24 horas con
X=1, pero deja el criterio de atrasado dependiendo de la hora a la que el cliente
escribió, y mantiene la contradicción con la tabla.

**Alternativa descartada: fijar la fecha al final del día.** Saca el registro de
«atrasado», pero el cálculo de días restantes redondea hacia arriba y el aviso
diría «programado en 1 día» para algo que es de hoy.

**Alternativa descartada: dejar el criterio del servidor como está y elegir X
para esquivarlo.** Es lo que produce el rango útil estrecho. Arreglar la
comparación es más barato que convivir con dos definiciones de «atrasado».

### 3. X vive en un modelo de configuración de fila única con columnas tipadas, acotada por validación

Un modelo nuevo con una sola fila y una columna por parámetro, más una pantalla
de administrador. La lectura devuelve valores por defecto cuando la fila no
existe, porque no hay ningún mecanismo de siembra que la cree.

**Alternativa descartada: variable de entorno.** No la puede cambiar el
administrador; hay que editar un archivo y reiniciar. Además obliga a fijar un
valor por defecto en código de todos modos, con lo que el valor de negocio pasa
de estar en un sitio a estar en dos.

**Alternativa descartada: un campo en `Empresa`.** Es lo más barato —una línea en
la ruta, ningún archivo nuevo— pero convierte X en un compromiso por cliente en
lugar de una política de la empresa que presta el servicio, y no sirve para
ninguno de los otros valores que están quemados en el código.

**Alternativa descartada: clave/valor genérico.** No aporta tipos, obliga a
parsear y validar en cada lectura, y deja la validación del rango lejos del
punto donde se usa. Ahorra una migración por valor nuevo, que es un coste
pequeño frente a eso.

X se acota en la validación al rango que la ventana de «próximos a vencer»
soporta. Fuera de ese rango el mantenimiento nace atrasado o nace invisible, y
ninguna de las dos cosas es una elección legítima del administrador.

### 4. El enlace va del mantenimiento a la solicitud, con borrado restringido

`Mantenimiento` gana la referencia a su solicitud, única y opcional, con acción
de borrado restrictiva.

Tres cosas de una: el mantenimiento sabe llegar a su origen, dos mantenimientos
no pueden colgar de la misma solicitud, y la base de datos misma impide borrar
una solicitud con mantenimiento vivo aunque el manejador se olvide de mirarlo.
Aun así el manejador comprueba antes y responde con un conflicto explicable, para
que el usuario no reciba un error en crudo.

Hay que extender esa comprobación a dos borrados vecinos que hoy no miran las
solicitudes. Ninguna de las tres rutas de borrado —empresa, equipo, usuario—
cuenta `SolicitudServicio`: la de equipos cuenta mantenimientos e historial, así
que un equipo con solicitudes y sin mantenimientos se borra arrastrándolas en
cascada; y la de usuarios cuenta lo mismo, así que borrar un **cliente** con
solicitudes pasa la comprobación y revienta contra la clave foránea, devolviendo
el error genérico que esta decisión dice querer evitar. Ese segundo caso ya
ocurre hoy, antes del cambio.

**Alternativa descartada: la referencia en la solicitud.** Deja la unicidad sin
garantizar y obliga a consultar en sentido contrario para lo que más se va a
pedir, que es «de dónde salió este mantenimiento».

**Alternativa descartada: acción de borrado `SetNull` o `NoAction`.** Ninguna
impide el borrado, que es justo lo que se pide. La combinación de restricción con
la cascada del equipo se cierra por la comprobación anterior; el script de
siembra, que sí borra sin pasar por las rutas, se ordena para no toparse con
ella.

### 5. Al hacer opcional el técnico, la acción de borrado se declara a mano

Prisma elige la acción de borrado según si el campo es obligatorio. Al pasar a
opcional, la cambiaría por su cuenta de restrictiva a poner a nulo, y borrar un
técnico dejaría sus mantenimientos huérfanos en silencio. Se declara la acción de
forma explícita para que el comportamiento no dependa de la opcionalidad del
campo.

Esto está verificado contra la migración inicial del repositorio: el único campo
opcional sin acción declarada del esquema es el que relaciona un usuario con su
empresa, y salió con la acción de poner a nulo.

### 6. La entrada de historial de la creación se firma con quien la provocó

`Historial` exige un usuario y hoy la entrada de creación se firma con el técnico
asignado. Sin técnico no hay a quién apuntar, y aunque lo hubiera, en el flujo
nuevo quien crea el mantenimiento es el cliente.

Se firma con el usuario que provoca el asiento, que es el patrón que ya usan las
dos ramas de actualización del mantenimiento. La columna se llama «técnico» y
guardará el identificador de un cliente; a cambio no se toca el esquema del
historial ni el filtro por rol.

**Alternativa descartada: no crear la entrada cuando no hay técnico.** Dejaría
sin rastro precisamente el caso que más falta hace seguir.

**Alternativa descartada: hacer opcional el usuario del historial.** Arrastra el
filtro del técnico, la pantalla y las exportaciones, para un solo asiento.

Consecuencia asumida y anotada: la entrada de creación no aparecerá en el
historial filtrado del técnico que sí hace el trabajo, porque ese filtro compara
contra el firmante.

### 7. El estado del equipo se decide por «existe trabajo abierto con técnico»

La transición a `EN_MANTENIMIENTO` deja de colgar del momento de creación y pasa
a depender de que el mantenimiento tenga técnico. Se dispara tanto al crear con
técnico como al asignárselo después a uno huérfano.

Eso obliga a dos ajustes en la ruta de actualización:

- El recuento de «otros mantenimientos abiertos» que decide si el equipo vuelve a
  estar activo pasa a contar solo los que tienen técnico. Sin ese filtro, un
  mantenimiento huérfano abierto dejaría atascado en `EN_MANTENIMIENTO` al
  equipo que sí se atendió, que es el efecto contrario al buscado.
- La llamada que recalcula el estado del equipo está hoy dentro de la condición
  de «ha cambiado el estado del mantenimiento». Asignar un técnico no cambia el
  estado, así que hay que sacarla de ahí.

La vuelta atrás sigue escribiendo `ACTIVO` sin leer el estado previo, lo que
resucita equipos inactivos o dados de baja. Se corrige aquí porque la
cancelación pasa a ser una acción cotidiana del cliente y el efecto deja de ser
anecdótico.

### 8. Las reglas nuevas van en funciones puras, con el molde que ya existe

La condición de si se puede cancelar y la de qué cuenta como carga se escriben
como funciones puras en la carpeta de bibliotecas, consumidas por la interfaz y
por la ruta. El proyecto ya tiene ese patrón resuelto y probado para la regla de
que el equipo de un mantenimiento no se puede cambiar.

**Alternativa descartada: repetir la condición en la interfaz y en el servidor.**
Es lo que se hace hoy con la condición de cancelar, y con el cambio la constante
tendría que estar escrita en tres sitios, porque además hace falta en la ruta de
mantenimientos.

Para que la interfaz pueda aplicar la regla y presentar lo que los requisitos
piden, la consulta de solicitudes tiene que traer del mantenimiento enlazado: su
estado, su técnico, el motivo de cancelación y quién canceló. Hoy no trae ninguno
de los cuatro, y el tipo de la solicitud no tiene ningún campo de mantenimiento.

Lo mismo vale para el detalle del mantenimiento, que se pinta con el objeto que
ya está en el listado y no con una consulta por identificador: el origen de la
solicitud tiene que venir en la consulta del listado, o el detalle no lo verá.

### 9. El motivo de cancelación es un campo nuevo, acompañado de quién canceló

Ninguno de los campos existentes sirve. El de respuesta de la solicitud se
presenta como respuesta del administrador y ya lo escribe el servidor en nombre
del cliente; el de observaciones del mantenimiento se borra cada vez que alguien
cambia el estado con el campo vacío, porque el diálogo envía un valor nulo y el
servidor solo comprueba la ausencia. Guardar ahí un dato obligatorio sería
garantizar que se pierde.

Se guarda además quién canceló, para decidir si la cancelación descuenta carga
histórica y para poder identificar al autor en pantalla.

La solicitud pasa además a un estado `CANCELADA` propio. Sin él, una cancelación
del cliente seguiría guardándose como `RECHAZADA` y presentándose con el rótulo
«Rechazada», que es el del rechazo administrativo: el estado diría lo contrario
de lo ocurrido. El campo de autor resuelve el «quién», pero no el rótulo que el
cliente lee.

**Alternativa descartada: reutilizar `RECHAZADA` y distinguir por el autor.** Es
más barata —ni migración del enum ni revisión de distintivos y filtros— pero deja
al cliente viendo «Rechazada» sobre algo que canceló él, que es justo el defecto
que este cambio venía a corregir. Las filas ya guardadas como `RECHAZADA` se
quedan como están: son rechazos reales del administrador.

**Alternativa descartada: dejar el motivo en el historial.** El historial no
distingue destinatarios: el cliente lo lee entero y lo exporta. Un motivo del
administrador puede ser interno. El historial se conserva como rastro —y la
cancelación por la vía de solicitudes tiene que crear su asiento, porque hoy solo
lo crea la vía de mantenimientos—, pero el dato consultable vive en el
mantenimiento.

**El motivo es visible para el cliente en todos los casos**, incluida la
cancelación decidida por el administrador o por el técnico. Quien cancela sabe
que el cliente lo leerá, igual que sabía que leería la respuesta a su solicitud.
La alternativa —un motivo interno que el cliente no ve— exigiría dos campos y una
decisión por cancelación, y deja al cliente con una cancelación sin explicación,
que es peor que un motivo escueto.

### 10. El campo obligatorio condicional se refina sobre el esquema derivado

La validación de «motivo obligatorio solo al cancelar» se aplica al esquema
derivado, nunca al base.

No es una preferencia de estilo. Aplicar la conversión a campos opcionales sobre
un objeto que lleva refinamientos lanza una excepción, y el esquema derivado es
una constante de nivel superior: la excepción salta al evaluar el módulo, así que
caerían sus tres importadores con valor —las dos rutas de mantenimientos, en
todos sus verbos y no solo al validar una cancelación, y el formulario de
mantenimiento, que lo usa para resolver la validación del formulario—.
Comprobado ejecutándolo contra la versión instalada.

El repositorio ya contiene la prueba de que esto se sabía: el esquema de
actualización de usuarios está escrito a mano campo por campo en lugar de
derivarse, teniendo el original un refinamiento idéntico.

Además, los manejadores aplastan los errores de validación a un mensaje genérico,
así que el mensaje del refinamiento no llegaría al usuario. La comprobación del
motivo devuelve su propio conflicto explicable, como ya se hace con la regla del
equipo fijo.

### 11. El correo se envía fuera de la transacción y no puede hacer fallar la petición

El envío ocurre después de confirmar la transacción, dentro de su propio
tratamiento de errores, y con un tope de tiempo explícito.

Dentro de la transacción es inviable: el presupuesto de tiempo por defecto es de
cinco segundos y el envío no tiene un tope corto —los valores por defecto de la
biblioteca permiten esperar minutos—, así que un retraso de la red desharía la
solicitud, el mantenimiento y el cambio de estado del equipo por no haber podido
mandar un aviso. Además la transacción retendría una conexión durante todo el
envío.

**Alternativa descartada: el patrón de recuperación de contraseña.** Escribe en
la base y luego, si el envío falla, responde error. Trasladado aquí, el cliente
vería «error al crear la solicitud» con la solicitud y el mantenimiento ya
creados, y volvería a intentarlo duplicando el ticket.

**Alternativa descartada: el patrón del formulario de contacto.** Ahí el correo
es la operación entera y no hay nada escrito, así que responder error es
correcto. Aquí el correo es un efecto de una escritura ya confirmada.

Es el primer envío de este tipo del proyecto, así que el patrón se deja escrito
en las especificaciones en lugar de darlo por sabido.

### 12. La cancelación descuenta carga histórica solo si no la hizo el técnico

La carga histórica deja de contar los mantenimientos cancelados, salvo cuando
quien canceló fue el técnico asignado.

El motivo es concreto: el desempate del reparto elige el conjunto de candidatos
que igualan al mejor en ambos contadores y sortea entre ellos. En un sistema con
trabajo hecho, todos tienen carga histórica; quien vuelve a cero es el mínimo
estricto y el conjunto es de uno, así que no hay sorteo. Descontar siempre
convertiría cancelar el trabajo propio en la forma de garantizarse el siguiente.

**Alternativa descartada: descontar siempre.** Es lo más simple y lo que se pidió
en primera instancia, pero abre ese camino y además hace que un cliente que
cancela por no estar conforme con un técnico vuelva a ese mismo técnico al
solicitar de nuevo.

**Alternativa descartada: no descontar nunca.** Es el comportamiento actual y
cierra el camino, pero penaliza al técnico en los desempates por un trabajo que
no llegó a hacer.

El filtro se aplica al acumular los contadores, no en la consulta. La consulta la
comparte la ruta de usuarios, y —lo decisivo— el doble de Prisma de la suite solo
interpreta el filtro por identificador de técnico e ignora el resto, así que
filtrar en la consulta dejaría la exclusión sin ejercitar por las pruebas.

### 13. Se cierra la edición completa de mantenimientos para el cliente

La rama de actualización que hoy atiende a administrador y cliente por igual pasa
a exigir rol de administrador.

Sin eso, la regla de cuándo se puede cancelar es evitable: basta llamar a la ruta
de mantenimientos en lugar de a la de solicitudes. Hoy esa rama no comprueba ni
propiedad ni empresa, así que un cliente puede modificar el estado, las fechas y
el técnico de cualquier mantenimiento del sistema conociendo su identificador.

La cancelación del cliente no pasa por ahí: pasa por la ruta de solicitudes, que
sí comprueba propiedad.

### 14. La alerta de «sin técnico» es derivada, como las demás

Se añade una categoría a la respuesta de alertas, calculada por consulta igual
que las tres existentes. Desaparece sola cuando se asigna un técnico, sin ningún
estado que mantener sincronizado.

**Alternativa descartada: usar el modelo `Alerta` del esquema.** Está sin usar
desde que existe. Resucitarlo obliga a decidir quién marca la alerta resuelta y
abre la posibilidad de que el estado almacenado y la realidad se separen.

La pantalla de alertas indexa la configuración de tipos sin comprobar que la
clave exista, así que una categoría desconocida tumba la lista entera. El
despliegue tiene que llevar juntas la ruta y la pantalla, o la pantalla tiene que
tolerar tipos que no conoce. Se elige lo segundo.

### 15. La creación manual reutiliza el camino automático, sin formulario

La acción del administrador sobre una solicitud sin mantenimiento ejecuta
exactamente la misma creación que dispara el cliente: tipo correctivo,
descripción heredada, fecha con el adelanto configurado y reparto automático de
técnico. Un solo gesto, sin formulario intermedio.

**La puerta es el estado de la solicitud, no la ausencia de enlace.** La acción
se ofrece solo sobre solicitudes pendientes o en revisión. Mirar únicamente el
enlace sería un error grave con los datos heredados: bajo el flujo anterior,
aprobar dejaba la solicitud en `APROBADA` y el mantenimiento se creaba **sin
ninguna referencia a ella**, porque el campo no existía. Toda solicitud aprobada
antes del despliegue tiene por tanto su mantenimiento real y ningún enlace, así
que parecería huérfana: la acción se le ofrecería y el administrador crearía un
segundo mantenimiento sobre el mismo equipo, con su reparto y su correo. Es el
defecto de duplicados que este cambio elimina, reintroducido por la puerta de
atrás.

Con el estado como puerta no hay ambigüedad: pendiente y en revisión son estados
que el flujo anterior abandonaba en cuanto creaba el mantenimiento, así que
ninguna solicitud en ellos tiene trabajo hecho.

Para que el caso de reparación siga siendo alcanzable, **eliminar un
mantenimiento devuelve su solicitud a pendiente**. Sin eso, una solicitud a la
que se le borra el mantenimiento quedaría aprobada, sin enlace y sin acción:
indistinguible de una heredada, y sin salida.

Sobre la unicidad: la restricción del enlace sigue siendo la red frente a dos
peticiones simultáneas que superen ambas la comprobación de estado. Pero el
conflicto tiene que traducirse al mismo mensaje explicable, no caer en el manejo
genérico y devolver un error interno sobre una operación que sí se completó.

**La fecha se cuenta desde el día de la creación del mantenimiento, no desde el
de la solicitud.** En la vía automática coinciden; en la manual, no. Contar desde
la solicitud haría nacer vencido justo al caso que esta acción existe para
resolver, y el correo anunciaría al cliente una fecha ya pasada.

**La solicitud queda aprobada.** La función compartida crea el mantenimiento; la
transición de la solicitud es del llamador, porque en la vía automática la
solicitud nace ya aprobada en la misma inserción y en la manual hay que
actualizar una fila existente.

**Alternativa descartada: recuperar el formulario precargado del flujo
anterior.** Es el camino que este cambio está eliminando, con su redirección por
parámetros de dirección y su prefijado. Resucitarlo para un caso residual
devolvería el defecto de los duplicados y dejaría dos formas distintas de crear
el mismo mantenimiento según de dónde venga.

**Alternativa descartada: dejar que el administrador elija técnico y fecha en
esa acción.** Haría que un mantenimiento nacido de una solicitud tuviera reglas
distintas según quién apretó el botón. Si quiere otro técnico, reasigna después,
que ya es una operación existente.

**Alternativa descartada: convertir las solicitudes antiguas en la migración.**
Crearía trabajo que nadie pidió cuando se registraron, con una fecha calculada
con un adelanto que no existía entonces, y repartiría técnicos de golpe.

El correo al cliente se envía también por esta vía, con las mismas garantías que
en la creación automática. Desde el cliente el hecho es el mismo —su solicitud ya
tiene mantenimiento— y no tiene por qué enterarse de qué camino lo creó.

Consecuencia asumida: **las solicitudes aprobadas antes del despliegue no
recibirán nunca el enlace a su mantenimiento**. Seguirán mostrando su historial
como hasta ahora, pero desde ellas no se podrá saltar al mantenimiento ni la
regla de borrado las protegerá. Reconstruir esos enlaces exigiría emparejar por
equipo y descripción, que es una heurística capaz de enlazar el mantenimiento
equivocado cuando un equipo acumula varias solicitudes parecidas. Se prefiere no
enlazar a enlazar mal.

### 16. Retirar el técnico es una acción distinta de no indicar ninguno

El formulario de mantenimiento ya tiene una opción que significa «no mando
técnico», y sirve para pedir el reparto automático: al enviar, el campo viaja
ausente. Con el técnico opcional, «ausente» pasa a ser ambiguo, porque también
podría significar «déjalo sin técnico».

Se separan los dos significados: el campo ausente sigue queriendo decir «decide
tú» y solo se admite al crear; un valor vacío enviado explícitamente quiere decir
«retíralo» y solo se admite al actualizar. La opción de retirada aparece en el
formulario únicamente al editar, donde la de asignación automática no se ofrece.

**Alternativa descartada: reutilizar la opción de asignación automática también
al editar.** Sería la de menos trabajo, pero convierte una acción destructiva en
la misma que pide ayuda al sistema, y no hay forma de distinguirlas en el cuerpo
de la petición.

**Alternativa descartada: no ofrecer la retirada en la interfaz y dejarla solo en
la API.** Deja sin salida el caso que la motiva —un técnico que se da de baja o
se marca inactivo— para quien no puede llamar a la API.

## Risks / Trade-offs

- **Un mantenimiento sin técnico rompe cuatro archivos de interfaz.** El listado
  de mantenimientos, su detalle, la tabla de próximos del panel y los dos
  manejadores de exportación leen el nombre del técnico sin contemplar su
  ausencia. Las tres primeras las alcanza también un cliente, porque ni
  «Mantenimientos» ni el panel están restringidos por rol en la navegación: el
  cliente crearía la solicitud, recibiría el correo diciendo que aún no hay
  técnico, entraría a mirarlo y se le caería la pantalla. → Se corrigen los
  cuatro antes de permitir que el campo sea nulo, y se ordenan así en las tareas.
- **El compilador no avisará de esas roturas.** Los tipos de la interfaz están
  escritos a mano y declaran el técnico obligatorio; los componentes no derivan
  sus tipos del esquema, así que regenerar el cliente de la base de datos no
  hace aparecer ningún error. → Los contratos escritos a mano se hacen opcionales
  **antes** de tocar las pantallas, para que la comprobación de tipos señale
  cada lectura rota en lugar de callarse.
- **La suite no protege casi nada de este cambio.** No existe ninguna prueba de
  las rutas de solicitudes ni de la regla del estado del equipo. Del cambio de
  estado de un mantenimiento hay una sola prueba, limitada a la vía del técnico.
  Las dos suites de integración afirman sobre el equipo *asociado* pero no sobre
  su estado, que es lo que este cambio necesita; y si no encuentran base de
  datos, **pasan en verde sin ejercitar nada** en lugar de omitirse. Una suite
  verde no será evidencia de que este cambio funciona.
- **La primera prueba del flujo nuevo enviaría correos reales.** El arranque de
  pruebas carga el entorno real, que tiene credenciales de correo válidas, y los
  dominios de los datos sembrados son registrables y algunos están registrados
  por terceros: el contenido incluiría la descripción escrita por el cliente, el
  número de serie del equipo y el nombre del técnico. → El doble del módulo de
  correo se escribe **antes** que la primera prueba que importe la ruta, y así
  queda ordenado en las tareas.
- **La comprobación de tipos no avisará hasta regenerar el cliente de Prisma.**
  Mientras no se regenere, el proyecto compila contra el cliente antiguo y
  ninguna de las roturas por técnico nulo aparece.
- **El primer valor configurable en producción no existirá.** No hay semilla ni
  script que cree la fila, así que la lectura tiene que resolver el valor por
  defecto por sí sola.
- **La ventana de cancelación la cierra un clic del técnico.** Marcar «en
  proceso» no tiene ningún coste ni comprobación, así que el derecho del cliente
  depende de un gesto ajeno. Queda fuera de alcance por decisión explícita, y
  anotado aquí para que no se descubra como sorpresa.
- **El script de siembra no sirve para verificar a ojo.** Sortea el estado de los
  equipos antes de crear sus mantenimientos, así que hay equipos en
  mantenimiento sin trabajo abierto y al revés. Comprobar mirando la pantalla
  dará falsos positivos y falsos negativos en ambos sentidos mientras no se
  ajuste.

## Migration Plan

1. Migración de esquema: técnico opcional con la acción de borrado declarada,
   enlace a la solicitud, motivo y autor de la cancelación, y el modelo de
   configuración. Es la primera migración incremental del repositorio; no hay
   precedente ni automatismo, así que se ejecuta a mano junto con la
   regeneración del cliente.
2. Los datos existentes son compatibles sin conversión: todos los mantenimientos
   actuales tienen técnico, ninguno tiene solicitud enlazada y ninguno está
   cancelado con motivo. Los campos nuevos quedan vacíos, que es un estado
   válido.
3. Ninguna solicitud existente tiene mantenimiento enlazado, así que la
   restricción de borrado no afecta a ninguna. Las **aprobadas** conservan su
   estado y su mantenimiento, que existe pero sin enlace: no se les ofrece la
   acción de creación, precisamente para no duplicar trabajo que ya está hecho.
   Las **pendientes o en revisión** tampoco se convierten en la migración: el
   administrador les crea el mantenimiento una por una, o las elimina. Conviene
   contar unas y otras antes de desplegar: las abiertas miden el trabajo manual
   del primer día, y las aprobadas, cuántos mantenimientos se quedan sin poder
   señalar su origen.
4. El script de siembra se ordena para borrar mantenimientos antes que
   solicitudes, o la restricción lo detiene.
5. Vuelta atrás: revertir la migración exige que no exista ningún mantenimiento
   sin técnico, porque la columna vuelve a ser obligatoria. Si ya se creó
   alguno, hay que asignarlo o borrarlo antes.

## Open Questions

- Qué otros parámetros se mudan a la pantalla de configuración. Hay al menos tres
  candidatos de negocio ya identificados en el código; ninguno condiciona la
  forma del modelo elegido, ni los requisitos, ni las tareas de este cambio.
