# Línea base antes del cambio

Estado de partida para poder comparar al terminar. Corresponde a las tareas 1.1
y 1.2.

Medido en el navegador contra la aplicación en ejecución, replicando la
estructura real del panel: barra lateral `w-64` visible desde `lg`, `main` con
`p-6`, contenedor `max-w-7xl`, rejilla `gap-4` y tarjeta con `p-6` más caja de
icono de 44px.

El modelo se validó midiendo la tarjeta real a 1280px: dio 149px de tarjeta y
57px de texto, que coincide exactamente con el cálculo. El resto de anchos se
obtuvo con la misma sonda fijando el ancho disponible y las columnas que
corresponden a cada breakpoint.

## Espacio disponible para el contenido de una tarjeta

| Viewport | Columnas | Tarjeta | Texto disponible |
|---|---|---|---|
| 768 | 2 | 352px | **260px** |
| 1024 | 3 | 229px | **137px** |
| 1279 | 3 | 314px | **222px** |
| 1280 | 6 | 149px | **57px** |
| 1440 | 6 | 176px | 84px |
| 1536 | 6 | 192px | 100px |
| 1920 | 6 | 200px | 108px |

## Los dos acantilados

Ensanchar la ventana reduce el espacio por tarjeta en dos puntos distintos:

```
   768px: 260px  ->  1024px: 137px     aparece la barra lateral (256px)
  1279px: 222px  ->  1280px:  57px     xl:grid-cols-6 pasa de 3 a 6 columnas
```

Ambos tienen la misma causa: los breakpoints razonan sobre el ancho de la
ventana mientras la rejilla vive en un contenedor que puede ser 256px más
estrecho. El segundo es el más visible, pero el primero existe igual y se
llevaba pasando por alto.

A partir de 1580px aproximadamente el contenedor topa en `max-w-7xl`, así que
las tarjetas dejan de crecer: 108px es el máximo que se alcanza.

## Lo que hay que meter en ese espacio

| Contenido | Ancho que necesita a `text-3xl font-bold` |
|---|---|
| `100` (un recuento) | 52px |
| `1.5 días de adelanto` (la desviación) | **282px** |

A 1280px hay 57px. Un recuento de tres cifras entra con 5px de margen; cuatro
cifras ya no caben. La frase de la desviación necesita cinco veces el espacio
disponible, y como las tarjetas se estiran a la altura de la más alta, arrastra
consigo a las otras cinco.

## Sobre la referencia visual

Las pantallas del panel están tras autenticación y no había credenciales, así
que no se tomaron capturas. La referencia de partida es esta tabla de medidas,
que además es lo que el requisito de la rejilla necesita comparar: si al
terminar no queda ningún acantilado y la cifra de cada indicador cabe en una
línea, el cambio cumplió.

La revisión visual de las pantallas autenticadas corresponde a las tareas 7.1 a
7.3 y la debe hacer una persona con acceso.
