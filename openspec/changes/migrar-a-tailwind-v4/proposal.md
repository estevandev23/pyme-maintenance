## Why

Los componentes de `src/components/ui/` están escritos para Tailwind v4, pero el
proyecto compila con Tailwind 3.4.19. Las clases de v4 no existen en v3: no
producen error, simplemente no se emite CSS. El resultado son componentes que se
ven desproporcionados sin que nada falle.

Comprobado contra la aplicación en ejecución, consultando el CSS ya compilado:

```
{ "shadow-xs": false, "outline-hidden": false,   <- no existen en el bundle
  "shadow-sm": true,  "outline-none": true }     <- los nombres de v3 si

checkbox real: className "... border shadow-xs ..."  ->  box-shadow: none
```

Son 36 ocurrencias repartidas en los 12 componentes que sí se usan. El calendario
es el caso extremo: mide todas sus celdas con `--cell-size`, una variable que se
declara con `--spacing(8)` —una función que en v3 no existe— y cuyos siete
consumidores (`size-(--cell-size)` y compañía) no llegan a generarse. Por eso el
selector de fechas se ve descuadrado.

El desajuste ya venía parcheándose a mano: `tailwind.config.ts` incluye un plugin
que añade la variante `aria-invalid` porque "Tailwind v3 no la genera por
defecto". En v4 es nativa.

## What Changes

- El proyecto pasa a compilar con Tailwind v4, que es la versión para la que ya
  están escritos los componentes de interfaz.
- Los tokens de tema (colores, radios, animaciones) pasan a definirse en CSS con
  `@theme`. `tailwind.config.ts` desaparece como origen de configuración.
- Se elimina el plugin que añadía la variante `aria-invalid`, innecesario en v4.
- `components.json` pasa a describir el proyecto real: hoy declara un proyecto v4
  (`"config": ""`) y además apunta a `app/globals.css` cuando el archivo está en
  `src/app/globals.css`. Esa incoherencia es lo que hizo que se instalaran
  componentes de la generación equivocada.
- El proyecto gana una comprobación automática que falla cuando el código
  contiene sintaxis de una versión de Tailwind distinta de la instalada.
- **BREAKING** Cambios visuales derivados del cambio de versión, no de una
  decisión de diseño:
  - El color por defecto de `border` pasa de gris a `currentColor`. Hay 60
    apariciones de `border` sin sufijo; las que no lleven un color explícito al
    lado cambiarán de color.
  - Las escalas de `shadow`, `rounded` y `blur` se desplazan un escalón: los
    nombres antiguos siguen funcionando pero significan otra cosa.

Fuera de alcance (registrado a propósito, no se implementa aquí):

- Rediseñar el panel, la `MetricCard` o la densidad de la rejilla. Eso es
  criterio visual, no reparación, y depende de qué clases existan al terminar
  esta migración. Va en un cambio aparte.
- Escribir las convenciones de trabajo del repositorio (`CLAUDE.md`, reglas de
  `openspec/config.yaml`). Es configuración del repositorio, no comportamiento
  del producto.
- Los 13 componentes de `src/components/ui/` que no usa nadie. Se migran si el
  codemod los toca, pero no se verifican uno a uno.

## Capabilities

### New Capabilities

- `sistema-de-estilos`: qué garantías ofrece la capa de estilos del proyecto —
  origen único de los tokens de tema, coherencia entre la versión de Tailwind
  instalada y la sintaxis del código, y que una clase escrita en el código llegue
  efectivamente al CSS compilado.

### Modified Capabilities

Ninguna. Las capacidades publicadas hasta ahora (`asignacion-tecnicos`,
`reportes-estadisticas`) describen comportamiento de negocio que este cambio no
toca.

## Impact

Configuración y dependencias:

- `package.json` — `tailwindcss` v4, `@tailwindcss/postcss`, y `tailwindcss-animate`
  sustituido por su equivalente para v4.
- `postcss.config.mjs` — el plugin deja de ser `tailwindcss` y pasa a ser
  `@tailwindcss/postcss`.
- `tailwind.config.ts` — se elimina; su contenido se traslada a `@theme`.
- `src/app/globals.css` — `@tailwind` pasa a `@import`, y recibe los tokens.
  Contiene dos `@apply`, cuyo comportamiento cambia en v4 y hay que revisar.
- `components.json` — coherente con el proyecto real.

Código de la aplicación:

- Las clases renombradas fuera de `src/components/ui/` son pocas y localizadas:
  `shadow-sm`, `shadow-lg`, `blur-sm`, `outline-none` y tres `rounded` sin
  sufijo.
- `src/components/ui/` ya está en v4 y no debería necesitar conversión. El riesgo
  es el contrario: que el codemod lo convierta como si fuera v3.

Sin cambios de esquema de base de datos y sin migración de datos.
