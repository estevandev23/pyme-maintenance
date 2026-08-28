## Context

Ver `proposal.md` — Why para la motivación y la evidencia.

Restricciones que condicionan el enfoque:

- El repositorio está escrito en dos versiones de Tailwind a la vez.
  `src/components/ui/` ya es v4; el resto de `src/` es v3. Es una situación que
  la herramienta oficial de migración no contempla: asume un proyecto v3
  homogéneo.
- `tailwind.config.ts` define los colores como `hsl(var(--token))` y los radios
  como `calc(var(--radius) - Npx)`, sobre variables declaradas en
  `src/app/globals.css`. Los tokens ya viven en CSS; lo que hay en el config es
  el puente que v4 deja de necesitar.
- `globals.css` son 69 líneas con dos bloques `@layer base` y dos `@apply`.
- El proyecto tiene cuatro cambios abiertos y trabajo sin confirmar en el árbol.
- Las pruebas del proyecto corren en jsdom y no compilan CSS, así que no
  detectarían por sí solas ninguna de estas regresiones.

## Goals / Non-Goals

**Goals:**

- Que la sintaxis escrita en el código y la versión instalada dejen de
  contradecirse, y que exista una barrera que impida la recaída.
- Que el diff de la migración sea revisable: separar lo que hace la herramienta
  de lo que se decide a mano.

**Non-Goals:**

- Modernizar la interfaz aprovechando el viaje. Cualquier cambio visual que no
  sea consecuencia directa del cambio de versión pertenece al cambio de
  proporciones.
- Migrar `src/components/ui/` a mano. Ya está en la versión de destino.

## Decisions

### Migrar hacia adelante en lugar de traducir hacia atrás

Se sube el proyecto a v4 en vez de reescribir los componentes a v3.

Alternativa considerada: traducir las 36 ocurrencias de los 12 componentes vivos
a sintaxis v3. Es más acotado y no toca el build, pero deja el proyecto anclado a
una versión que la biblioteca de componentes ya no emite: el siguiente componente
que se incorpore vuelve a llegar en v4 y el problema reaparece. Se descarta
porque trata el síntoma y conserva la causa.

### La herramienta oficial hace el grueso, pero sobre un árbol limpio y por partes

El codemod se ejecuta con el árbol sin cambios pendientes y su diff se revisa
antes de tocar nada a mano.

El riesgo específico de este repositorio es la **doble conversión**: el codemod
está pensado para convertir v3 a v4, y `src/components/ui/` ya está en v4. No se
asume que lo deje intacto — se verifica en el diff. Si lo altera, esa parte del
diff se descarta.

Alternativa considerada: migrar todo a mano. Se descarta por volumen y porque la
herramienta acierta en la parte mecánica, que es la mayoría.

### Los tokens se trasladan a `@theme`, no se reinventan

Los colores siguen expresados sobre las mismas variables CSS que hoy. La
migración traslada el puente que hoy vive en `tailwind.config.ts` a `@theme`, sin
cambiar ningún valor.

Alternativa considerada: aprovechar para pasar la paleta a OKLCH, que es lo que
v4 usa por defecto. Se descarta: cambiaría colores en la misma tanda en la que
hay que distinguir qué cambios visuales son esperados y cuáles son regresiones.

### La barrera es una comprobación, no una convención escrita

El proyecto gana una comprobación ejecutable que falla ante sintaxis de la
versión equivocada, en lugar de confiar en que alguien recuerde una norma.

Es la lección directa de este cambio: el fallo se encontró con un `grep` y una
consulta al CSS compilado, no revisando con cuidado. Una norma escrita depende de
que se lea; una comprobación que corre, no.

Nivel elegido: comparación por patrones de sintaxis conocidos de la versión que
no toca. Es barato y cubre exactamente la familia de fallos que se dio aquí.

Alternativa considerada, y anotada como pregunta abierta: verificar que **toda**
clase presente en el código aparece en el CSS compilado. Cubre además las
erratas —hoy `text-mutedforeground` no falla, simplemente no hace nada— pero es
bastante más trabajo y no es necesario para cerrar este cambio.

## Risks / Trade-offs

- **La deriva de `border` es el riesgo principal.** En v4 el color por defecto de
  un borde pasa a ser el del texto. Hay 60 apariciones de `border` sin sufijo
  entre la aplicación y los componentes. → Hay que separar las que ya llevan un
  color explícito al lado de las que no, y dar color a las segundas. Es revisión
  archivo por archivo, no un reemplazo automático.
- **Las escalas desplazadas no fallan, derivan.** `shadow-sm`, `blur-sm`,
  `rounded` y `outline-none` siguen siendo válidas pero significan otra cosa. →
  Son pocas fuera de `ui/` y están localizadas; se revisan una a una.
- **El codemod puede tocar lo que ya estaba bien.** → Revisar su diff sobre
  `src/components/ui/` antes de aceptarlo.
- **Las pruebas no protegen aquí.** Corren en jsdom, sin CSS: pasarán en verde
  aunque la interfaz quede rota. → La verificación de este cambio es visual y por
  comprobación de CSS compilado, no por la suite existente.
- **El diff será grande y se mezcla con trabajo en curso.** Hay cuatro cambios
  abiertos y modificaciones sin confirmar. → Conviene ejecutar la migración con
  el árbol limpio; si no, distinguir después qué cambio visual vino de dónde es
  costoso.
- **`tailwindcss-animate` no es compatible con v4.** → Sustituirlo y comprobar
  que las animaciones que hoy usan los diálogos y popovers siguen ocurriendo.

## Migration Plan

Sin migración de datos. El orden importa más que el contenido:

1. Árbol limpio, rama propia.
2. Ejecutar la herramienta oficial y **no aceptar nada todavía**: revisar el diff
   separando `src/components/ui/` del resto.
3. Completar a mano lo que la herramienta no cubre: dependencias, `postcss`,
   `components.json`, el plugin `aria-invalid` que sobra.
4. Recorrer los riesgos de deriva: bordes sin color, escalas desplazadas,
   `@apply`.
5. Añadir la comprobación automática y verla fallar antes de verla pasar.

Retroceso: revertir la rama. No queda estado persistente que deshacer.

## Open Questions

- Si conviene subir la comprobación al nivel de "toda clase usada existe en el
  CSS compilado". Se puede decidir después sin afectar a las specs ni al
  desglose de tareas de este cambio.
- Si la paleta debe pasar a OKLCH más adelante, una vez la migración esté
  asentada y los cambios visuales sean atribuibles.
