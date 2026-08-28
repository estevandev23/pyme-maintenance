## Context

Ver `proposal.md` — Why para la motivación.

El backlog es homogéneo: 20 de los 21 errores son la misma regla
(`@typescript-eslint/no-explicit-any`) y casi todos caen en tres patrones
repetidos. Eso permite resolverlo por patrón en lugar de caso por caso.

Restricciones del estado actual:

- El cliente de Prisma ya genera los tipos que faltan (`Prisma.UserWhereInput`,
  `Prisma.TransactionClient`, etc.). No hay que inventar ninguno; hay que
  importarlos. Requiere que `npx prisma generate` se haya ejecutado.
- `npx tsc --noEmit` reporta hoy 39 errores preexistentes en archivos ajenos a
  este backlog (pruebas, `components/ui/`, `usuario-form.tsx`). Tipar de verdad
  puede destapar alguno más: donde `any` tapaba una incoherencia real, el tipo
  correcto la mostrará.
- `next lint` usa la configuración heredada (`.eslintrc`). Invocar `npx eslint`
  directamente falla, porque ESLint 9 espera `eslint.config.js`. La verificación
  debe hacerse siempre con `npm run lint`.

## Goals / Non-Goals

**Goals:**

- Dejar el check de lint utilizable como señal: verde hoy, rojo solo cuando algo
  nuevo esté mal.
- Que cada `any` se sustituya por el tipo que ya describe el dato, no por otro
  comodín (`unknown` con casts en cascada cuenta como comodín).

**Non-Goals:**

- Poner `tsc --noEmit` en verde. Es un frente aparte y más grande.
- Refactorizar la lógica de los archivos tocados. Si un tipo correcto obliga a
  cambiar comportamiento, eso es un hallazgo que se reporta, no se arregla de
  paso.

## Decisions

### Los `any` se agrupan en tres patrones

```
  1. Filtros y datos de Prisma   -> tipos generados por Prisma
  2. Iconos de lucide-react      -> LucideIcon
  3. Payloads de formulario      -> el tipo que infiere Zod
```

**Patrón 1 — filtros y datos de Prisma** (11 errores). `where: any`,
`andFilters: any[]`, `whereClause: any`, `updateData: any` y `tx: any` tienen
todos un tipo generado que les corresponde: `Prisma.<Modelo>WhereInput`,
`Prisma.TransactionClient` y, para los objetos de actualización que asignan
claves foráneas sueltas como `tecnicoId`, la variante *unchecked*
(`Prisma.MantenimientoUncheckedUpdateInput`) en lugar de la normal, que exige la
forma anidada `{ tecnico: { connect: ... } }`.

**Patrón 2 — iconos** (2 errores). `icon: any` en `menuItems` y en
`estadoConfig` guarda un componente de `lucide-react`. El tipo es `LucideIcon`,
exportado por la propia librería.

**Patrón 3 — payloads de formulario** (5 errores). `data: any` en los
`onSubmit`/`handleSubmit` de usuarios y el `body: any` de solicitudes tienen su
tipo en el esquema de Zod que ya valida esos datos (`z.infer`), igual que hace
`mantenimiento-form.tsx` con `MantenimientoInput`.

Los 3 `any[]` de `pdf-export.ts` quedan fuera de los patrones: sus exportadores
reciben filas heterogéneas armadas en la vista. Se les da una interfaz local por
exportador, declarando solo los campos que la función lee.

### Los `as any` de fechas son un síntoma, no la causa

`mantenimiento-form.tsx` castea `mantenimiento.fechaProgramada as any` para
preguntar si es una cadena. Lo hace porque el tipo `Mantenimiento` declara `Date`
mientras la API devuelve la fecha serializada como cadena. El arreglo es ajustar
el tipo a `string | Date` y eliminar los casts, no cambiar el cast por otro.

Alternativa considerada: convertir las fechas al recibir la respuesta, de modo
que el tipo `Date` fuera cierto. Rechazada por desproporcionada: toca todos los
consumidores del endpoint y este cambio no debe alterar comportamiento.

### El orden es archivo por archivo, verificando entre medias

Cada archivo se sanea y se comprueba con `npm run lint` antes de pasar al
siguiente, en lugar de tocarlos todos y verificar al final. Con 11 archivos
independientes, un fallo tardío obligaría a buscar cuál de todos lo causó.

## Risks / Trade-offs

- **Tipar puede destapar errores reales.** Donde `any` ocultaba una incoherencia,
  el tipo correcto la hará visible como error de compilación. → Es el resultado
  deseado, pero puede alargar la tarea. Si el hallazgo excede la limpieza, se
  reporta y se registra aparte en lugar de arreglarlo aquí.
- **El backlog puede volver a crecer.** Nada impide que el próximo cambio
  introduzca otro `any`. → Con el check en verde, el propio lint lo señalará; ese
  es justamente el punto de la limpieza.
- **`updateData` tipado puede rechazar asignaciones que hoy pasan.** Los objetos
  de actualización se arman campo a campo y con `any` nadie comprueba la forma.
  → Se resuelve eligiendo la variante *unchecked*, que es la que corresponde al
  estilo de asignación que ya usa el código.

## Migration Plan

No hay migración de datos ni cambios de esquema. El despliegue es directo y el
retroceso consiste en revertir el código.

## Open Questions

Ninguna.
