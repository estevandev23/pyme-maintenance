## Context

Ver `proposal.md` — Why para la motivación.

Tres hechos del código de partida condicionan el diseño:

- La vía del técnico ya existe y está bien acotada. La ruta de actualización se
  bifurca por rol: el técnico valida contra un esquema propio y estrecho, y el
  administrador contra el completo. Ampliar la vía del técnico es ensanchar ese
  esquema estrecho, no abrir uno nuevo ni relajar el del administrador.
- El formulario del administrador ya tiene construidos el selector de tipo y la
  subida de PDF. Las piezas existen; lo que no existe es la composición para el
  técnico.
- La cancelación ya resuelve el problema de «comparar contra el estado anterior»:
  detecta que se está cancelando comparando el estado que llega con el que el
  mantenimiento ya tenía. Este cambio necesita exactamente el mismo criterio para
  otra cosa, y conviene que se parezca.

## Goals / Non-Goals

**Goals:**

- Que ensanchar la vía del técnico no pueda ensanchar por accidente la del
  cliente ni la del administrador.
- Que la regla de «solo mientras esté abierto» se aplique en el servidor, y que la
  pantalla se limite a no ofrecer lo que el servidor va a rechazar. La pantalla
  informa; no es donde vive la regla.
- Que el trabajo se pueda entregar aunque el arreglo de los adjuntos se retrase.

**Non-Goals:**

- Unificar el formulario del administrador y la pantalla del técnico en un solo
  componente. Ver Decisiones.
- Tocar el reparto automático de técnicos.

## Decisions

### Ensanchar el esquema del técnico, no reutilizar el del administrador

El esquema del técnico pasa a admitir `tipo` y `reporteUrl` además de estado,
observaciones y motivo de cancelación.

*Alternativa descartada:* validar la petición del técnico con el esquema completo
del administrador y filtrar después los campos que no le corresponden. Se descarta
porque invierte el valor por defecto: con el esquema estrecho, un campo nuevo que
alguien añada mañana queda fuera de la vía del técnico salvo que se le abra a
propósito; con el ancho más filtro, queda dentro salvo que alguien se acuerde de
cerrarlo. El primero falla hacia la seguridad y el segundo hacia el descuido.

Consecuencia concreta: `tecnicoId` **no** se añade al esquema del técnico. Hoy es
lo único que impide que un técnico se reasigne trabajo por la API, y es lo que
sostiene el requisito de que no reasigna.

### La condición «abierto» se evalúa sobre el estado anterior

Al recibir la petición ya se ha leído el mantenimiento para comprobar que es del
técnico. Ese registro trae el estado de partida, y es contra él —no contra el
estado que llega— contra el que se decide si el tipo puede cambiar.

*Alternativa descartada:* evaluar sobre el estado resultante. Rechazaría la
operación más útil de todas: cerrar el trabajo y corregir su tipo a la vez, que es
justo el momento en que el técnico sabe de qué tipo era. Le obligaría a guardar
dos veces, y la clasificación se perdería cada vez que se le olvidara el primer
guardado.

*Alternativa descartada:* permitir la reclasificación siempre y confiar en que el
historial deje rastro. Se descarta porque haría que un informe ya emitido cambiara
después de emitirse; el rastro explicaría el cambio, pero no evitaría que dos
copias del mismo informe no cuadraran.

### Componente propio para el técnico, no un formulario con banderas por rol

La pantalla del técnico se construye extendiendo el diálogo que hoy usa, no
añadiendo props de rol al formulario del administrador.

*Alternativa descartada:* un único formulario que reciba el rol y muestre u oculte
campos. Es tentador porque el boceto se parece al formulario del administrador,
pero deja la separación de permisos repartida en condicionales dentro de un
componente grande: un descuido en cualquiera de ellos abre al técnico un campo que
no le toca, y el fallo se vería como un campo de más en pantalla, no como un error.
Dos componentes con dos superficies distintas hacen que ese descuido no tenga
dónde ocurrir.

El coste asumido es duplicar el marcado del selector de tipo y del campo de
adjunto. Es marcado, no reglas.

### El asiento del cambio de tipo va al historial existente

El historial del equipo ya recibe un asiento por cada cambio de estado, firmado
por quien lo provoca. El cambio de tipo escribe otro asiento del mismo modo,
dentro de la misma transacción.

*Alternativa descartada:* campos nuevos en el mantenimiento al estilo de los de
cancelación (`tipoAnterior`, `reclasificadoPorId`). Aquellos existen porque el
motivo de cancelación tiene que sobrevivir al borrado del mantenimiento y ser
consultable por el cliente. Aquí no hay nada de eso: el asiento es para auditoría,
se consulta desde el historial, y añadir columnas obligaría a una migración a
cambio de nada.

*Alternativa descartada:* reutilizar las observaciones. Es el error que el
proyecto ya cometió con el motivo de cancelación y documentó en el esquema: las
observaciones se sobrescriben cada vez que alguien guarda con la caja vacía.

### El técnico asignado se presenta como texto, no como control deshabilitado

*Alternativa descartada:* el mismo selector del administrador con `disabled`. Se
ve apagado, no recibe foco de teclado y un lector de pantalla lo anuncia como un
control que no funciona. Para un dato que solo se lee, el control sobra.

## Risks / Trade-offs

**El adjunto sigue guardándose en una carpeta pública y efímera** → Este cambio no
lo arregla y multiplica su uso: pasa de ser algo que el administrador hace de vez
en cuando a algo que el técnico hace en cada cierre. Mitigación: el cambio de
adjuntos va antes. Si no llega a tiempo, este se entrega **sin** el campo de
reporte —el resto de la pantalla no depende de él— y el campo se añade después.
Entregarlo con el adjunto y sin el arreglo es la única combinación que no debería
darse.

**Reclasificar mueve el indicador de fallas recurrentes** → Un correctivo que pasa
a preventivo descuenta una falla del equipo y puede sacarlo de la lista. Es el
comportamiento buscado, pero se verá como una cifra que cambió sin que nadie
tocara los informes. Mitigación: el asiento de historial permite explicar cualquier
diferencia; que lo cerrado no se reclasifique acota el efecto al periodo en curso.

**La regla podría quedar solo en la pantalla** → Si el selector de tipo se oculta
para los mantenimientos cerrados pero el servidor no comprueba nada, la restricción
no existe: basta una petición directa. La comprobación del servidor es el
requisito; ocultar el control es cortesía.

### Qué protege la suite y qué no

Declarado a propósito, porque aquí una suite en verde no significa lo mismo en
cada mitad del cambio:

- **Protegido, y debe estarlo con Prisma doblado para que corra siempre:** que
  reclasificar un abierto se aplique, que reclasificar un cerrado se rechace, que
  reclasificar y cerrar en la misma operación funcione, que el asiento se escriba,
  y que una petición del técnico con `tecnicoId` no reasigne nada. Son las cinco
  afirmaciones que sostienen el cambio y ninguna necesita base de datos real. No
  deben ir en `src/__tests__/integracion/`: esas dos suites hacen `return` sin
  ejercitar nada cuando no encuentran la base, y pasan en verde sin haber probado
  nada.
- **No protegido:** que la pantalla muestre de verdad el equipo, la empresa y la
  descripción del cliente junto al formulario, y que se vea bien. La suite corre
  en jsdom, que no compila CSS: pasará en verde con la pantalla rota. Esta mitad
  se verifica mirándola, con la aplicación corriendo y datos reales, en sesión de
  técnico.
- **Trampa conocida al probar la pantalla:** el selector de shadcn no se abre en
  jsdom sin rellenar `hasPointerCapture`, `setPointerCapture`,
  `releasePointerCapture` y `scrollIntoView`. Hay un ejemplo resuelto en
  `src/__tests__/components/cambiar-estado-motivo.test.tsx`.

## Migration Plan

No hay migración de datos: los tres campos que la vía del técnico gana ya existen
en el mantenimiento y el asiento cabe en el historial tal como está.

Los mantenimientos ya cerrados quedan con el tipo que tengan, que en el caso de
los nacidos de una solicitud será correctivo. El desglose de los informes solo
empieza a distinguir de verdad a partir del trabajo abierto desde el despliegue;
conviene decirlo antes de que alguien compare un mes anterior con uno posterior y
lea la diferencia como un cambio en la operación.

Para volver atrás basta con revertir: nada de lo que el cambio escribe deja el
sistema en un estado que la versión anterior no sepa leer. Un mantenimiento
reclasificado antes de revertir conserva su tipo nuevo, que es un valor legítimo
del campo desde siempre.

## Open Questions

- ¿Debe avisarse al cliente cuando el técnico reclasifica el mantenimiento nacido
  de su solicitud? Se puede responder después sin tocar estas specs ni el reparto
  de tareas: si la respuesta es que sí, es un aviso más en el sistema de avisos
  existente y va en su propio cambio.
