## Why

`npm run lint` falla hoy con 21 errores acumulados en 11 archivos, ninguno
introducido por un cambio reciente. Mientras el check esté en rojo no sirve como
puerta de calidad: un error nuevo se pierde entre el ruido de los viejos, y cada
cambio hereda una verificación que no puede pasar por motivos ajenos a él.

Esto se detectó al implementar `asignacion-automatica-tecnicos`, cuya tarea 6.3
—"ejecutar `npm test` y `npm run lint` y verificar que ambos terminan sin
errores"— quedó sin cerrar precisamente por este backlog. Las pruebas pasan
(103/103); lint no.

## What Changes

- Se sustituyen los 20 `any` explícitos por tipos reales, en su mayoría tipos que
  Prisma ya genera (`Prisma.*WhereInput`, `Prisma.TransactionClient`,
  `Prisma.*UncheckedUpdateInput`) o tipos de dominio que el proyecto ya define.
- Se corrige el `prefer-const` de `src/app/api/historial/route.ts`.
- `npm run lint` pasa a terminar sin errores, de modo que un error nuevo vuelva a
  ser visible.
- El comportamiento observable de la aplicación no cambia: es una limpieza de
  tipos, no un cambio de funcionalidad.

Fuera de alcance (registrado a propósito, no se implementa aquí):

- Los avisos (`Warning`) de `react-hooks/exhaustive-deps` y
  `@typescript-eslint/no-unused-vars`. No rompen el check y algunos —los de
  dependencias de `useEffect`— pueden cambiar el comportamiento al corregirse.
- Los 39 errores de `npx tsc --noEmit`. Es otro check, no está en los scripts del
  proyecto, y varios de sus errores viven en archivos de prueba y en
  `components/ui/` de terceros.
- Silenciar reglas: ni bajar `no-explicit-any` a warning ni sembrar comentarios
  `eslint-disable`. Eso apagaría el aviso sin resolver el tipado.

## Capabilities

### New Capabilities

- `calidad-codigo`: qué garantiza la verificación estática del proyecto — que
  `npm run lint` termina sin errores y que esa condición se sostiene tipando de
  verdad, no silenciando reglas.

### Modified Capabilities

Ninguna.

## Impact

Código afectado (archivo — errores):

- `src/app/(dashboard)/usuarios/page.tsx` — 1: `handleUpdate(data: any)`.
- `src/app/api/equipos/route.ts` — 1: `andFilters: any[]`.
- `src/app/api/historial/route.ts` — 2: `let whereClause: any` (tipo y `const`).
- `src/app/api/mantenimientos/route.ts` — 1: `andFilters: any[]`.
- `src/app/api/mantenimientos/[id]/route.ts` — 3: `tx: any` en
  `actualizarEstadoEquipo` y dos `updateData: any`.
- `src/app/api/solicitudes/route.ts` — 1: `where: any`.
- `src/app/api/usuarios/route.ts` — 2: dos `where: any`.
- `src/components/dashboard/sidebar.tsx` — 1: `icon: any` en `menuItems`.
- `src/components/mantenimientos/mantenimiento-form.tsx` — 2: dos
  `as any` sobre fechas al rellenar el formulario.
- `src/components/solicitudes/solicitudes-table.tsx` — 2: `icon: any` en
  `estadoConfig` y `body: any`.
- `src/components/usuarios/usuario-form.tsx` — 2: `onSubmit(data: any)` y
  `handleSubmit(data: any)`.
- `src/lib/pdf-export.ts` — 3: tres exportadores que reciben `any[]`.

Sin cambios en `prisma/schema.prisma`, en el esquema de la base de datos ni en
los contratos de las APIs.

Datos existentes: no requieren migración.
