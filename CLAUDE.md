# pyme-maintenance (MantenPro)

Sistema de gestión de mantenimiento de equipos para pymes. Next.js 15 (App
Router) + React 19 + Prisma sobre PostgreSQL + NextAuth + shadcn/ui.

## Entorno

Tres trampas de este equipo. Comprobarlas antes de dar por roto algo que no lo
está:

- **El gestor es `pnpm`, no `npm`.** Existen los dos lockfiles; `package-lock.json`
  está de arrastre. Usar siempre `pnpm`.
- **Node no está en el PATH** de los shells de las herramientas: se gestiona con
  fnm y su hook solo corre en las terminales interactivas del usuario. Anteponer
  la ruta del alias por defecto antes de cualquier comando de node o pnpm:

  ```bash
  # bash: $APPDATA trae backslashes, hay que convertirlo o bash no lo resuelve
  export PATH="$(cygpath "$APPDATA")/fnm/aliases/default:$PATH"
  ```
  ```powershell
  $env:PATH = "$env:APPDATA\fnm\aliases\default;" + $env:PATH
  ```
- **El servidor de desarrollo corre en el puerto 3200**, no en el 3000
  (`next dev -p 3200`). `NEXTAUTH_URL` debe coincidir con ese puerto o los
  enlaces que se generan por correo apuntarán a un host equivocado. Antes de
  levantarlo, comprobar si el usuario ya lo tiene corriendo.

La base de datos de desarrollo es un PostgreSQL local. Las credenciales están en
`.env`, que no se versiona.

## Estilos

**Regla principal: una clase de Tailwind que no compila no da error, desaparece
en silencio.** No basta con que el código se vea correcto.

**El proyecto está en Tailwind v4.** Lo confirman `@import 'tailwindcss'` y el
bloque `@theme` de `globals.css`, el plugin `@tailwindcss/postcss` y la ausencia
de `tailwind.config`. Los componentes de `src/components/ui/` están escritos para
esa misma versión, y `components.json` la describe con `"config": ""`. La
migración se hizo y está archivada en
`openspec/changes/archive/2026-08-28-migrar-a-tailwind-v4/`.

Antes de dar por bueno cualquier trabajo de CSS o de interfaz:

1. Comprobar que la clase existe **en v4**. Los nombres cambiaron respecto a v3
   (`shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`,
   `size-[var(--x)]`→`size-(--x)`, `rounded`, `blur-sm`), y las escalas se
   desplazaron un escalón: los nombres antiguos siguen siendo válidos pero
   significan otra cosa.
2. Ante la duda, preguntarle al CSS compilado en lugar de suponer. Con la app
   corriendo, recorrer `document.styleSheets` buscando la regla, o comparar el
   estilo computado del elemento con lo que la clase debería producir.

**Ojo con los restos del codemod de v3 a v4.** El renombrado automático de
clases también tocó cadenas que no eran clases: dejó `variant="outline-solid"`
en varios `<Button>`, y esa variante no existe en el componente. No aplicaba
nada, así que esos botones salían transparentes y sin borde —se leían como
texto— sin que nadie lo notara. Se corrigieron en `alertas` y `mantenimientos`;
si aparece un `-solid` dentro de una **prop** y no de un `className`, es el
mismo defecto. La señal es que `pnpm exec tsc` lo marca: el componente enumera
sus variantes válidas.

**Los componentes de `src/components/ui/` deben venir del registro de shadcn que
corresponde a la versión instalada**, y `components.json` debe seguir
describiendo el proyecto real. Un `components.json` que miente hace que el CLI
baje componentes de la generación equivocada, y el fallo aparece semanas después
como "esto se ve raro".

Deuda conocida en `ui/`, ajena a Tailwind: `drawer`, `input-otp`, `resizable`,
`sidebar` y `toaster` se bajaron pero sus dependencias nunca se instalaron
(`vaul`, `input-otp`, `react-resizable-panels`, `@/hooks/use-mobile`,
`@/hooks/use-toast`). Son la mayor parte de los errores que arrastra
`pnpm exec tsc --noEmit`. Ningún componente de la aplicación los usa; o se
instalan las dependencias o se retiran esos archivos.

**Para decisiones visuales —jerarquía tipográfica, densidad, espaciado, paleta,
proporciones— invocar la skill `ui-ux-pro-max`.** Pero solo después de que las
clases compilen: afinar proporciones sobre componentes cuyas clases de tamaño no
se emiten es trabajar a ciegas.

## OpenSpec

El proyecto usa OpenSpec para desarrollo guiado por especificaciones. Para
cambios de funcionalidad, empezar por `/opsx:propose` (o `/opsx:explore` si la
idea aún no está clara) en lugar de editar código directamente.

- Los artefactos se escriben **en español**. Los encabezados estructurales y las
  palabras `SHALL`/`MUST` quedan en inglés.
- Nunca crear a mano un directorio bajo `openspec/changes/`: usar
  `openspec new change "<nombre>"`, que genera los metadatos necesarios.
- Las `rules` de `openspec/config.yaml` solo aplican al **escribir artefactos de
  OpenSpec**. No gobiernan el código. Las reglas de código van en este archivo.

## Pruebas

`pnpm test` (Jest, entorno jsdom). Las pruebas viven en `src/__tests__/`,
espejando la estructura de `src/`.

- **jsdom no compila CSS.** La suite pasará en verde con la interfaz rota. Una
  suite verde nunca es evidencia de que algo se ve bien.
- Las pruebas de rutas de API necesitan el docblock `@jest-environment node`.
- `jest.clearAllMocks()` no vacía las colas de `mockResolvedValueOnce`; para eso
  hace falta `resetAllMocks()` o `mockReset()` sobre el mock concreto.
- **`next/jest` carga el `.env` real**, que trae credenciales SMTP válidas. Por
  eso `jest.setup.js` dobla `nodemailer` y `@/lib/email`: sin ese doble, una
  prueba que importe una ruta que envía correo manda mensajes de verdad. No lo
  quites ni lo sobrescribas en una prueba concreta.
- **Las dos suites de `src/__tests__/integracion/` pegan contra la base real y,
  si no la encuentran, `return` sin ejercitar nada**: no se omiten, *pasan en
  verde*. Un verde suyo no prueba nada por sí solo. Para comportamiento que no
  puede quedarse sin comprobar, doblar Prisma y que la prueba corra siempre.
- El selector de shadcn no se abre en jsdom sin rellenar `hasPointerCapture`,
  `setPointerCapture`, `releasePointerCapture` y `scrollIntoView`. Hay un
  ejemplo en `src/__tests__/components/cambiar-estado-motivo.test.tsx`.
- `pnpm lint` arrastra errores previos en varios archivos. Al terminar un
  trabajo, comprobar que no se han añadido **nuevos**, en lugar de exigir que
  todo el linter pase. Lo mismo con `pnpm exec tsc --noEmit`: comparar contra
  una referencia tomada antes de empezar, no exigir cero.

## Modelo de datos

Reglas que el esquema no deja ver por sí solo:

- **Un técnico pertenece a una sola empresa** (`User.empresaId`, obligatorio para
  el rol `TECNICO`). Cualquier selección de técnico se acota a los de la empresa
  del equipo. Un mantenimiento llega a su empresa a través de `Equipo`.
- El alcance de datos depende del rol: un `CLIENTE` solo ve lo de su empresa, un
  `TECNICO` solo lo suyo, un `ADMIN` todo. Ese filtro debe aplicarse en el
  servidor, no en la interfaz.
- **Una solicitud del cliente crea su mantenimiento en el acto.** No hay paso de
  aprobación. El enlace vive en `Mantenimiento.solicitudId`, único y opcional,
  con borrado restringido: una solicitud con mantenimiento vivo no se puede
  eliminar. Nulo significa que lo creó el administrador desde el formulario.
- **`Mantenimiento.tecnicoId` es opcional.** Un mantenimiento sin técnico es un
  estado normal, no un error: la empresa del equipo no tenía ninguno activo, o
  el administrador se lo retiró. Cualquier lectura del técnico debe contemplar
  su ausencia.
- **El equipo figura en mantenimiento si y solo si tiene trabajo abierto con
  técnico.** Es un invariante, no una máquina de transiciones, y lo mantiene
  `sincronizarEstadoEquipo`. Un mantenimiento huérfano no pone el equipo en
  mantenimiento ni impide que salga.
- **La carga histórica de un técnico excluye lo que canceló otra persona**, pero
  no lo que canceló él. La diferencia no es un capricho: el desempate del
  reparto elige a quienes igualan al mejor en ambos contadores y sortea entre
  ellos, así que quien vuelve a cero es el mínimo estricto y no hay sorteo.
  Descontar siempre convertiría cancelar el trabajo propio en la forma de
  garantizarse el siguiente.
- Sigue sin haber marcas de tiempo de todos los eventos del ciclo de vida: solo
  la cancelación tiene `canceladoEn`. `updatedAt` se mueve con cualquier edición
  y no sirve como fecha de cierre, así que todavía no se puede medir el tiempo
  real de resolución de un ticket.

## Antes de dar algo por terminado

- Ejecutar `pnpm test` y comprobar que no hay errores de tipos nuevos
  (`pnpm exec tsc --noEmit` arrastra errores previos: comparar, no exigir cero).
- Si el trabajo toca la interfaz, verificarlo **viéndolo**, no solo con la suite.
- Marcar una tarea de OpenSpec como completada solo cuando su comportamiento está
  implementado de verdad. Si su verificación no se pudo ejecutar, decirlo en
  lugar de marcarla.
