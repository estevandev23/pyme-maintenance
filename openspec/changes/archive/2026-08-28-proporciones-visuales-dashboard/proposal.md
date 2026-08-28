## Why

El panel presenta seis tarjetas de indicador en una sola fila a partir de 1280px
de ventana. Con la barra lateral de 256px, a ese ancho cada tarjeta mide 149px y
le quedan **57px útiles de texto**, donde hay que encajar un valor a 30px en
negrita.

Peor aún, el corte está mal puesto: la rejilla pasa a seis columnas justo cuando
el ancho efectivo cae a territorio de tres.

```
  Viewport 1279px            |  Viewport 1280px
  lg:grid-cols-3             |  xl:grid-cols-6
  314 px por tarjeta         |  149 px por tarjeta
  222 px de texto util       |   57 px de texto util
```

Ensanchar la ventana un píxel reduce el espacio de texto a la cuarta parte. El
breakpoint razona sobre el viewport mientras la rejilla vive en un contenedor
256px más estrecho.

Encima, la tarjeta no distingue una cifra de una frase: `value` es un `string` y
acepta lo mismo `"100"` que `"1.5 días de adelanto"`. Cuando recibe una frase,
esta desborda a varias líneas y, como las tarjetas se estiran a la altura de la
más alta, **una tarjeta mal alimentada deforma la fila entera**.

## What Changes

- Los indicadores pasan a presentarse en dos filas de tres con jerarquía
  explícita, en lugar de seis iguales en una fila. Los tres destacados son la
  desviación respecto a lo programado, las fallas recurrentes y los completados
  del periodo; los otros tres quedan como contexto, en una presentación más
  compacta.
- El número de columnas se decide por el espacio realmente disponible y no por
  el ancho de la ventana, de modo que ensanchar la pantalla nunca reduzca el
  espacio por tarjeta.
- Una tarjeta de indicador deja de recibir un único texto y pasa a distinguir
  cifra, unidad y matiz, cada uno con su tratamiento. Así deja de ser posible
  colocar una frase donde el diseño espera un número.
- Desaparece el alto mínimo forzado en el título, que existía para igualar
  alturas y se rompe en cuanto un título ocupa tres líneas.
- Las cifras se presentan con figuras tabulares y separador de millar, para que
  al cambiar de valor no desplacen lo que tienen al lado.
- La escala tipográfica del panel se vuelve modular. Hoy salta de 14px a 30px
  sin nada en medio, que es parte de por qué la composición se percibe
  descompensada.
- La selección de rango de fechas pasa a ser un único calendario de rango, con
  los días intermedios resaltados, en lugar de dos selectores de fecha suelta
  puestos uno al lado del otro.

Fuera de alcance (registrado a propósito, no se implementa aquí):

- Cambiar la paleta o las tipografías del producto. La guía de diseño consultada
  propone una paleta azul y las fuentes Fira; el proyecto es neutro por decisión
  previa. Eso es identidad de marca, no proporción, y mezclarlo impediría saber
  qué mejoró cada cosa.
- Qué indicadores existen y cómo se calculan. Eso pertenece a
  `reportes-estadisticas`; aquí solo se trata de cómo se presentan.
- Rediseñar el gráfico, las tablas o la barra lateral.

## Capabilities

### New Capabilities

- `presentacion-del-panel`: cómo se compone visualmente el panel de indicadores
  — jerarquía entre métricas, comportamiento de la rejilla frente al espacio
  disponible, anatomía de una tarjeta de indicador y presentación del selector de
  rango.

### Modified Capabilities

Ninguna. `sistema-de-estilos` cubre que las clases compilen y de dónde salen los
tokens, no cómo se compone el panel. `reportes-estadisticas` cubre qué
indicadores hay y qué valen, no su presentación.

## Impact

- `src/components/metric-card.tsx` — el contrato del componente cambia: la cifra,
  su unidad y el matiz dejan de ser un único texto. Afecta a sus seis usos
  actuales.
- `src/app/(dashboard)/page.tsx` — rejilla en dos filas con jerarquía, y el
  selector de rango pasa a un solo control.
- `src/lib/estadisticas.ts` — `etiquetaDesviacion` devuelve hoy una frase
  montada; tendrá que ofrecer sus partes por separado para que la tarjeta las
  componga.

Sin cambios de esquema ni de API. Los indicadores y sus valores son los mismos:
lo que cambia es cómo se muestran.

Riesgo declarado: la tarjeta de desviación pasa a primera fila. Es la métrica
más fácil de malinterpretar del panel —mide desviación de agenda, no tiempo de
resolución— así que su rótulo y su unidad cargan más responsabilidad que las
demás.
