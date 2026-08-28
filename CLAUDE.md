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

Antes de dar por bueno cualquier trabajo de CSS o de interfaz:

1. Comprobar contra qué versión de Tailwind se compila (`pnpm list tailwindcss`,
   y si `globals.css` usa `@tailwind` es v3, si usa `@import "tailwindcss"` es v4).
2. Comprobar que la clase existe en esa versión. Los nombres cambiaron entre v3 y
   v4 (`shadow-sm`/`shadow-xs`, `outline-none`/`outline-hidden`,
   `size-[var(--x)]`/`size-(--x)`, `rounded`, `blur-sm`), y las escalas se
   desplazaron un escalón: los nombres antiguos siguen siendo válidos pero
   significan otra cosa.
3. Ante la duda, preguntarle al CSS compilado en lugar de suponer. Con la app
   corriendo, recorrer `document.styleSheets` buscando la regla, o comparar el
   estilo computado del elemento con lo que la clase debería producir.

**Los componentes de `src/components/ui/` deben venir del registro de shadcn que
corresponde a la versión instalada**, y `components.json` debe describir el
proyecto real. Un `components.json` que miente hace que el CLI baje componentes
de la generación equivocada, y el fallo aparece semanas después como "esto se ve
raro".

Estado actual: el proyecto compila con Tailwind v3 pero los componentes de
`ui/` están escritos para v4. Es un defecto conocido, con cambio abierto en
`openspec/changes/migrar-a-tailwind-v4/`. No parchear por partes: leer ese
cambio primero.

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
- `pnpm lint` arrastra errores previos en varios archivos. Al terminar un
  trabajo, comprobar que no se han añadido **nuevos**, en lugar de exigir que
  todo el linter pase.

## Modelo de datos

Reglas que el esquema no deja ver por sí solo:

- **Un técnico pertenece a una sola empresa** (`User.empresaId`, obligatorio para
  el rol `TECNICO`). Cualquier selección de técnico se acota a los de la empresa
  del equipo. Un mantenimiento llega a su empresa a través de `Equipo`.
- El alcance de datos depende del rol: un `CLIENTE` solo ve lo de su empresa, un
  `TECNICO` solo lo suyo, un `ADMIN` todo. Ese filtro debe aplicarse en el
  servidor, no en la interfaz.
- `SolicitudServicio` **no** tiene clave foránea hacia `Mantenimiento`, y no hay
  marcas de tiempo de los eventos del ciclo de vida. `updatedAt` se mueve con
  cualquier edición y no sirve como fecha de cierre. Por eso hoy no se puede
  medir el tiempo real de resolución de un ticket.

## Antes de dar algo por terminado

- Ejecutar `pnpm test` y comprobar que no hay errores de tipos nuevos
  (`pnpm exec tsc --noEmit` arrastra errores previos: comparar, no exigir cero).
- Si el trabajo toca la interfaz, verificarlo **viéndolo**, no solo con la suite.
- Marcar una tarea de OpenSpec como completada solo cuando su comportamiento está
  implementado de verdad. Si su verificación no se pudo ejecutar, decirlo en
  lugar de marcarla.
