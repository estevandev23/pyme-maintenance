# Línea base antes de la migración

Estado de partida para poder distinguir, al terminar, un cambio deliberado de
una regresión. Corresponde a las tareas 1.2 y 1.3.

Capturado contra la aplicación en ejecución con **Tailwind 3.4.19**, en la rama
`migracion/tailwind-v4`, sobre el commit `8052fe1`.

## Cómo se capturó, y por qué no son capturas de pantalla

Las pantallas que más componentes usan están detrás de autenticación y no había
credenciales disponibles, así que no se pudieron fotografiar. En su lugar se
midió lo que el requisito realmente necesita comparar: **qué valor produce hoy
cada clase**. Se inyecta un elemento de prueba en la página, se le aplica cada
clase y se lee su estilo computado.

Para detectar deriva es más preciso que una captura: un cambio de 1px en un
radio o un tono distinto de gris no se aprecian a ojo, y aquí sí.

Queda pendiente, y la debe hacer una persona con acceso, la revisión visual de
las pantallas autenticadas (panel, mantenimientos, formulario de mantenimiento
con su selector de fechas, usuarios). Es la tarea 6.1.

## Valores de partida

| Clase | Propiedad | Valor con v3 |
|---|---|---|
| `border` | `border-top-width` | `1px` |
| `border` | `border-top-color` | `rgb(229, 229, 229)` |
| `border-border` | `border-top-color` | `rgb(229, 229, 229)` |
| `border-input` | `border-top-color` | `rgb(229, 229, 229)` |
| `rounded` | `border-top-left-radius` | `4px` |
| `rounded-sm` | `border-top-left-radius` | `4px` |
| `rounded-md` | `border-top-left-radius` | `6px` |
| `rounded-lg` | `border-top-left-radius` | `8px` |
| `shadow` | `box-shadow` | `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)` |
| `shadow-sm` | `box-shadow` | `0 1px 2px rgba(0,0,0,.05)` |
| `shadow-md` | `box-shadow` | `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)` |
| `shadow-lg` | `box-shadow` | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` |
| `outline-none` | `outline-style` / `width` | `solid` / `2px` (transparente) |
| `bg-card` | `background-color` | `rgb(255, 255, 255)` |
| `bg-popover` | `background-color` | `rgb(255, 255, 255)` |
| `text-muted-foreground` | `color` | `rgb(115, 115, 115)` |
| `size-4` | `width` / `height` | `16px` / `16px` |
| `p-3` | `padding-top` | `12px` |
| `gap-2` | `gap` | `8px` |

### Las que hoy no producen nada

Son las que motivan la migración. Al terminar deben producir un valor:

| Clase | Valor con v3 | Qué se espera con v4 |
|---|---|---|
| `shadow-xs` | `box-shadow: none` | una sombra real |
| `outline-hidden` | sin efecto | `outline-style: none` |
| `size-(--cell-size)` y familia | no se emite la regla | dimensiones resueltas |

`--cell-size` se declara con `--spacing(8)`, valor que v3 no sabe resolver, y
ninguno de sus siete consumidores llega a generarse. Es la causa de que el
selector de fechas se descuadre.

## Inventario de deriva: `border` sin color explícito

En v4 el color por defecto de un borde pasa de gris a `currentColor`. Recuento
sobre literales de clase en `src/`:

```
  border CON color en el mismo literal : 25
  border SIN color en el mismo literal : 22   <-- cambian de color
```

Los 22 se concentran en unos pocos patrones repetidos:

| Patrón | Dónde |
|---|---|
| `rounded-md border` | contenedores de tabla: empresas, equipos, mantenimientos, solicitudes |
| `rounded-md border p-4 w-[320px]` | popovers del formulario de mantenimiento |
| `... rounded-lg border bg-popover` | desplegable del historial |
| `p-3 border rounded-lg bg-muted/50` | bloque de archivo adjunto |

Al ser tan repetitivos, la corrección es casi mecánica: añadir `border-border`
donde falta.

## Otras clases renombradas, fuera de `src/components/ui/`

Pocas y localizadas: `shadow-sm` (1), `shadow-lg` (1), `blur-sm` (1),
`outline-none` (2) y `rounded` sin sufijo (3).

## Cómo comparar al terminar

Repetir la misma medición sobre la aplicación ya migrada y contrastar tabla
contra tabla. Toda diferencia debe corresponder a un cambio declarado en
`proposal.md`; cualquier otra es una regresión.
