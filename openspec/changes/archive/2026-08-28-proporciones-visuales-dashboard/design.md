## Context

Ver `proposal.md` — Why para la motivación y la aritmética.

Restricciones del estado actual:

- El panel vive dentro de un `layout` con barra lateral fija de `w-64` (256px),
  visible a partir de `lg`. La rejilla usa breakpoints de viewport (`xl:`), que
  no saben nada de ese descuento.
- El contenedor topa en `max-w-7xl` (1280px), así que a partir de unos 1580px de
  ventana las tarjetas dejan de crecer.
- `MetricCard` recibe `title`, `value`, `change`, `trend` e `icon`, todos como
  texto salvo los dos últimos. Tiene seis usos, todos en el panel.
- El alto del rótulo se iguala con `min-h-10`, un mínimo fijo que funciona
  mientras ningún rótulo pase de dos líneas.
- `etiquetaDesviacion` en `src/lib/estadisticas.ts` devuelve la frase ya montada
  ("1.5 días de adelanto"), que es lo que hoy se pasa como cifra.
- Las pruebas corren en jsdom y no compilan CSS: no van a detectar ninguna
  regresión de este cambio.

## Goals / Non-Goals

**Goals:**

- Que el reparto de espacio deje de depender de un breakpoint que ignora la
  barra lateral.
- Que el componente impida por construcción el error que originó esto: meter una
  frase donde va una cifra.

**Non-Goals:**

- Tocar identidad visual: paleta, tipografías, iconografía.
- Cambiar qué indicadores hay o cómo se calculan.

## Decisions

### Dos filas de tres, con jerarquía real

Seis indicadores en una fila no caben con dignidad al ancho efectivo que hay. Se
pasa a dos filas de tres: la primera con los tres indicadores que responden *cómo
vamos* —desviación, fallas recurrentes, completados del periodo— y la segunda,
más compacta, con los de contexto.

Alternativa considerada: seis columnas con tarjetas más estrechas y relleno
menor. Se descarta porque el problema no es solo el relleno: a 149px de tarjeta,
una cifra a 30px ya no cabe aunque el relleno fuera cero. Y porque seis
indicadores con el mismo peso no son una jerarquía, son una lista.

### Consultas de contenedor en lugar de breakpoints de viewport

La rejilla decide sus columnas por el ancho del contenedor, no por el de la
ventana.

Alternativa considerada: mover el corte a `2xl:grid-cols-3` y dejarlo en
breakpoints de viewport. Funciona hoy y es una línea, pero mantiene el defecto de
fondo: cualquier cambio en la barra lateral —plegarla, hacerla más ancha, un
segundo panel— vuelve a descolocar el reparto, y el fallo reaparece en forma de
"se ve raro a cierto ancho". La consulta de contenedor elimina la clase entera de
errores. Tailwind v4 la trae de serie, así que el coste es bajo ahora que la
migración está hecha.

### La tarjeta recibe partes, no una frase

`MetricCard` deja de aceptar un único texto como valor y pasa a recibir la cifra,
su unidad opcional y el matiz por separado.

Es la decisión central del cambio. Ensanchar la columna mejora los síntomas pero
deja viva la causa: mientras `value` sea un `string` libre, nada impide repetir el
error. Con las partes separadas, el componente puede dar a cada una su
tratamiento y la tarjeta deja de deformarse por lo que reciba.

Consecuencia: `etiquetaDesviacion` deja de ser el sitio donde se monta la frase.
Pasa a exponer cifra, unidad y sentido —adelanto o retraso— y la composición
ocurre en la tarjeta, que es quien sabe cómo presentarlos.

### Igualar alturas por composición, no por un mínimo fijo

Se retira `min-h-10` del rótulo. Que las tarjetas de una fila midan lo mismo debe
salir de cómo se reparte el espacio dentro de la tarjeta, no de un número mágico
que se rompe cuando un rótulo crece.

### Un solo control de rango

El selector pasa de dos calendarios de fecha suelta a uno de rango. Dos controles
independientes no comunican que las dos fechas son una sola cosa, y obligan a
abrir y cerrar dos veces para elegir un periodo.

## Risks / Trade-offs

- **Las pruebas no protegen este cambio.** jsdom no compila CSS: la suite pasará
  en verde con el panel descuadrado. → La verificación es visual y por medición
  de anchos reales en el navegador, como se hizo en la migración.
- **Cambiar el contrato de `MetricCard` toca sus seis usos a la vez.** → Están
  todos en el mismo archivo; el compilador señala los que falten.
- **La desviación pasa a primera fila.** Es la métrica más fácil de
  malinterpretar del panel: mide desviación de agenda, no tiempo de resolución.
  → Su rótulo y su unidad tienen que ser explícitos; conviene revisarlos con el
  cliente antes de darlos por buenos.
- **Dos filas empujan el gráfico hacia abajo.** Parte de lo que antes se veía sin
  desplazarse puede quedar por debajo. → Comprobarlo a 1280px de alto, no solo de
  ancho.
- **Las consultas de contenedor son un concepto nuevo en el proyecto.** → Queda
  acotado a la rejilla de indicadores; si se extiende, que sea por decisión
  aparte.

## Migration Plan

No hay datos ni configuración que migrar. El cambio es de composición y de
contrato de un componente interno, sin efecto en la API ni en el esquema.

## Open Questions

- Cuánto debe encoger la segunda fila respecto a la primera. Es un ajuste fino
  que se resuelve mirándolo, sin afectar a las specs ni a las tareas.
- Si el recuento de fallas recurrentes, ahora destacado, aporta lo suficiente
  cuando su detalle completo ya aparece más abajo en la misma pantalla. Se puede
  decidir después de verlo compuesto.
