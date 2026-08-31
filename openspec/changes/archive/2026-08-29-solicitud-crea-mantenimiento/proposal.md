## Why

Hoy una solicitud de servicio no produce nada por sí sola: espera a que un
administrador la revise, la apruebe y rellene a mano un formulario de
mantenimiento con datos que la solicitud ya traía. Ese paso intermedio no aporta
ninguna decisión —el reparto de técnico ya es automático por carga— y retrasa la
atención tanto como tarde el administrador en mirar la bandeja.

El cambio elimina ese paso: la solicitud del cliente crea el mantenimiento en el
acto. La pantalla de solicitudes deja de ser una bandeja de aprobación y pasa a
ser el registro de qué mantenimientos nacieron de una petición del cliente.

## What Changes

### El flujo automático

- Al crear un cliente una solicitud, el sistema crea inmediatamente el
  mantenimiento correspondiente, con tipo `CORRECTIVO` y fecha programada a
  X días vista.
- El mantenimiento queda enlazado a la solicitud que lo originó, y desde el
  mantenimiento se puede llegar a esa solicitud.
- **BREAKING** — El administrador pierde las acciones «Aprobar», «Rechazar» y
  «Marcar en revisión» sobre las solicitudes, junto con el diálogo de revisión,
  el aviso de «solicitudes pendientes por revisar» y la redirección al
  formulario de mantenimiento. Toda solicitud nace aprobada.
- **BREAKING** — Los valores `PENDIENTE` y `EN_REVISION` dejan de alcanzarse por
  el flujo normal. Se conservan en el modelo de datos y en el filtro de la
  pantalla, para las solicitudes que ya estuvieran en esos estados al desplegar.
- El administrador puede crear el mantenimiento de una solicitud **pendiente o en
  revisión**, con las mismas reglas que la creación automática. Cubre las
  solicitudes que quedaron abiertas antes del cambio y las que vuelven a quedar
  abiertas porque se eliminó su mantenimiento.
- **BREAKING** — Eliminar un mantenimiento devuelve su solicitud a pendiente, y
  cancelarlo la deja cancelada. Hasta ahora nada del mantenimiento se reflejaba
  en la solicitud, porque no había vínculo entre ambos.
- Una solicitud con mantenimiento registrado no se puede eliminar: primero hay
  que eliminar el mantenimiento.
- Eliminar un equipo o un cliente que tenga solicitudes asociadas se rechaza con
  una explicación, en lugar de arrastrarlas en silencio o fallar con un error
  interno.

### El mantenimiento sin técnico

- **BREAKING** — Un mantenimiento puede existir sin técnico asignado. Si la
  empresa del equipo no tiene ningún técnico activo, el mantenimiento se crea
  igualmente y queda a la espera. Hasta ahora la creación se rechazaba.
- El administrador ve esos mantenimientos huérfanos como una alerta nueva,
  «sin técnico asignado», que desaparece en cuanto se le asigna uno.
- **BREAKING** — El equipo pasa a estado `EN_MANTENIMIENTO` cuando el
  mantenimiento **tiene técnico**, no al crearlo. Un equipo con trabajo
  pendiente pero sin técnico sigue figurando como activo.
- El administrador puede asignar un técnico a un mantenimiento huérfano, y
  también devolver un mantenimiento al estado sin técnico.

### La cancelación

- El cliente puede cancelar mientras el técnico no haya empezado. Al cancelar,
  la solicitud queda marcada como cancelada y su mantenimiento pasa a
  `CANCELADO`.
- **BREAKING** — Se añade el estado `CANCELADA` a las solicitudes. Hasta ahora
  una cancelación del cliente se guardaba como `RECHAZADA` y se presentaba con
  el rótulo «Rechazada», indistinguible del rechazo del administrador.
- **BREAKING** — Cancelar exige un motivo escrito, a quien cancele: cliente,
  técnico o administrador. Hoy el cliente cancela sin explicar nada y el
  sistema escribe por él un texto fijo.
- **BREAKING** — El motivo de cancelación deja de mostrarse bajo el rótulo
  «Respuesta del administrador» y pasa a identificar a quién canceló.
- Un mantenimiento cancelado deja de contar en la carga histórica del técnico,
  salvo que lo cancelara el propio técnico.

### La configuración

- Se introduce una pantalla de configuración para el administrador, donde vive
  la variable X de días de adelanto de la fecha programada.

### El correo

- Al crear una solicitud, el cliente recibe un correo con el detalle y con el
  técnico que la atenderá, o con el aviso de que aún no hay técnico asignado.

### Correcciones de permisos que el cambio hace inaplazables

- **BREAKING** — Se cierra la edición completa de mantenimientos para el rol
  `CLIENTE`.
- Se corrige la comprobación de pertenencia al crear una solicitud, para que un
  cliente sin empresa asignada no pueda solicitar sobre equipos ajenos.

## Capabilities

### New Capabilities

- `flujo-de-solicitudes`: la creación automática del mantenimiento a partir de
  la solicitud, el enlace entre ambos, la cancelación con motivo, las reglas de
  consistencia al eliminar y el aviso por correo al cliente.
- `configuracion-operativa`: los parámetros de operación que el administrador
  puede ajustar desde la aplicación, empezando por los días de adelanto de la
  fecha programada.
- `avisos-de-mantenimiento`: de qué avisa el sistema sobre el estado de los
  mantenimientos, con qué criterio de fechas y quién ve cada aviso. Recoge el
  criterio de retraso por día natural —que hoy no está en ninguna
  especificación pese a afectar a todos los mantenimientos, no solo a los
  nacidos de una solicitud— y la categoría nueva de los que esperan técnico.

### Modified Capabilities

- `asignacion-tecnicos`: se invierten dos requisitos. Una empresa sin técnicos
  activos deja de impedir la creación del mantenimiento; y un mantenimiento
  cancelado deja de contar en la carga histórica cuando la cancelación no
  provino del propio técnico. Se añade además el mantenimiento sin técnico
  como estado válido y la desasignación como operación.
- `edicion-mantenimiento`: la asignación de un técnico a un mantenimiento que
  no lo tenía debe surtir efecto sobre el estado del equipo, y la
  desasignación debe guardarse en lugar de responder éxito sin haber
  guardado nada. Recoge además la restricción de que solo el administrador
  modifica un mantenimiento, que es la corrección de permisos citada más abajo.
- `reportes-estadisticas`: un mantenimiento cancelado deja de contar como
  evidencia de falla recurrente de un equipo.

## Impact

### Modelo de datos

- `Mantenimiento.tecnicoId` pasa a ser opcional. Al dejar de ser obligatorio,
  Prisma cambiaría por su cuenta la acción de borrado de `Restrict` a
  `SetNull`, así que hay que declararla de forma explícita.
- `Mantenimiento` gana el enlace a su solicitud, el motivo de cancelación y la
  marca de quién canceló.
- `EstadoSolicitud` gana el valor `CANCELADA`.
- `Historial.tecnicoId` es obligatorio y bloquea la entrada de creación de un
  mantenimiento huérfano.
- Modelo nuevo para la configuración. Es la primera migración incremental del
  repositorio: hasta ahora solo existe la inicial.

### Código

- Rutas: `solicitudes` (creación, cancelación, borrado), `mantenimientos`
  (creación, asignación, cambio de estado), `alertas` (categoría nueva y
  criterio de fecha), `dashboard/stats` (fallas recurrentes), y una ruta nueva
  de configuración.
- Pantallas: solicitudes, mantenimientos, alertas, equipos, panel, y una
  pantalla nueva de configuración. La entrada de menú «Configuración» ya existe
  escrita y comentada en la barra lateral y en la cabecera.
- Cuatro archivos de la interfaz leen hoy el nombre del técnico sin contemplar
  su ausencia y se caen con un mantenimiento huérfano: el listado de
  mantenimientos, su detalle, la tabla de próximos del panel y los dos
  manejadores de exportación de la pantalla de mantenimientos. Las tres primeras
  las alcanza también un cliente, porque ni «Mantenimientos» ni el panel están
  restringidos por rol en la navegación.
- Los tipos de la interfaz están escritos a mano y declaran el técnico como
  obligatorio, así que **el compilador no señalará esas roturas** aunque se
  regenere el cliente de la base de datos: los componentes no derivan sus tipos
  del esquema.
- El script de siembra no crea ninguna solicitud y sortea al azar el estado de
  los equipos antes de crear sus mantenimientos, así que hoy no permite
  reproducir el flujo nuevo ni comprobar a ojo la regla del estado del equipo.

### Evidencia recogida antes de proponer

- **La fecha programada choca con el criterio de alertas.** La ruta de alertas
  compara contra el instante actual sin normalizar a medianoche, mientras que la
  tabla de mantenimientos compara por día natural. Un mantenimiento con fecha de
  hoy sale «atrasado por 0 día(s)» en rojo y con prioridad alta en una pantalla,
  y «programado para hoy» en amarillo en la otra, el mismo día. Por eso la fecha
  se adelanta X días y el criterio del servidor pasa a ser por día natural.
- **La ventana de «próximos a vencer» son tres días fijados en tres archivos
  distintos.** Con X mayor que 3, el mantenimiento no aparece en alertas durante
  X−3 días; con X igual a 0, nace atrasado. Por eso X se acota por validación.
- **El motivo de cancelación no cabe en ningún campo existente.** El campo de
  respuesta de la solicitud se muestra como respuesta del administrador y ya lo
  escribe el servidor en nombre del cliente; las observaciones del mantenimiento
  se borran cada vez que alguien cambia el estado con el campo vacío, porque el
  diálogo envía un valor nulo y el servidor solo comprueba la ausencia.
- **Un `refine` de zod sobre el esquema base rompe el módulo entero.** Aplicar
  `partial()` sobre un objeto con refinamientos lanza una excepción al evaluar
  el módulo, comprobado contra la versión instalada. Caerían sus tres
  importadores: las dos rutas de mantenimientos, en todos sus verbos y no solo
  al validar una cancelación, y el formulario de mantenimiento, que importa el
  esquema como valor.
- **Cancelar podría convertirse en una forma de auto-asignarse trabajo.** Al no
  contar los cancelados, un técnico vuelve a cero y pasa a ser el mínimo
  estricto del reparto, que en ese caso no sortea: se garantizaría el siguiente
  mantenimiento. Por eso la cancelación solo descuenta cuando no la hizo el
  propio técnico.
- **Enviar el correo dentro de la transacción la haría fallar.** El presupuesto
  de tiempo de una transacción es de cinco segundos y el envío no tiene un tope
  corto, así que un retraso de la red deshaquería la solicitud, el mantenimiento
  y el cambio de estado del equipo por no haber podido mandar un aviso.
- **Las pruebas cargan el entorno real, con credenciales de correo válidas.** La
  primera prueba del nuevo flujo enviaría correos de verdad, y los dominios de
  los datos sembrados no son ficticios: son registrables y algunos están
  registrados por terceros.

## Fuera de alcance

- **La prioridad de la solicitud no se propaga al mantenimiento.** Se decidió a
  propósito no añadir prioridad al mantenimiento ni modular la fecha según
  ella. Consecuencia asumida: una solicitud urgente y una de prioridad baja
  producen mantenimientos idénticos, y la prioridad solo se ve en la pantalla de
  solicitudes.
- **La métrica de fallas recurrentes seguirá contando mantenimientos que nadie
  ejecutó.** Se excluyen los cancelados, como se pidió, pero siguen contando los
  programados y los que están en proceso. Dos solicitudes sin atender sobre el
  mismo equipo bastarán para marcarlo como falla recurrente. Excluir todo lo que
  no esté completado queda fuera de este cambio.
- **El cliente no tendrá ningún canal dentro de la aplicación una vez el técnico
  empiece.** Se decidió que en ese punto ya no interviene. Su única vía será el
  formulario de contacto público, sin sesión ni referencia al ticket.
- **No se restringen las transiciones de estado del mantenimiento.** Hoy se
  puede pasar de cancelado a en proceso o de completado a programado sin
  ninguna comprobación. Eso significa que la ventana de cancelación del cliente
  la cierra un clic del técnico, y que se puede reabrir. Corregirlo es un
  cambio propio.
- **Solo se envía correo cuando la solicitud obtiene su mantenimiento**, por
  cualquiera de las dos vías. Ni al asignar técnico a un mantenimiento huérfano,
  ni al empezar, ni al cancelar, ni al completar.
- **Las solicitudes aprobadas antes del cambio no recuperan el enlace con su
  mantenimiento.** Su mantenimiento existe pero se creó sin referencia a ellas, y
  reconstruir el vínculo exigiría emparejar por equipo y descripción, capaz de
  enlazar el equivocado. Desde esas solicitudes no se podrá saltar al
  mantenimiento ni la regla de borrado las protegerá.
- **No se retiran del modelo los valores `PENDIENTE` y `EN_REVISION`.** Se
  conservan aunque el flujo normal no los alcance.
- **No se unifica la ventana de tres días con la variable X.** X se acota por
  validación al rango que la ventana actual soporta. Hacer que la ventana siga a
  X obligaría a tocar tres archivos que hoy no comparten nada.
- **Nada impedirá dos solicitudes seguidas sobre el mismo equipo.** Hasta ahora
  la única barrera contra duplicar mantenimientos era que el formulario del
  administrador excluía del selector los equipos en mantenimiento; con la
  creación automática esa barrera deja de aplicarse, y además un equipo con
  trabajo abierto sin técnico ya no figura en mantenimiento. Un cliente que
  reporte dos veces el mismo fallo generará dos mantenimientos, dos asignaciones
  y dos correos. Poner una barrera nueva es un cambio propio.
- **Las solicitudes que ya estén abiertas al desplegar no se convierten solas.**
  La migración no les crea mantenimiento: sería trabajo que nadie pidió cuando se
  registraron, fechado con un adelanto que no existía entonces. El administrador
  decide una por una, con la acción descrita más arriba, o las elimina.
- **No se actualiza la documentación de `docs/`.** Ya está desalineada antes de
  este cambio: no menciona las solicitudes en ningún archivo y describe el
  catálogo de alertas como cerrado.
- **No se salda la deuda de linter del repositorio.** El criterio de cierre de
  este cambio es «ningún error nuevo respecto a la referencia inicial», no
  «cero errores». La capacidad `calidad-codigo` exige lo segundo y seguirá sin
  cumplirse por motivos anteriores a este cambio.
