## 1. Preparación

- [ ] 1.1 Ejecutar `npx prisma generate` y confirmar que los tipos del cliente
      están disponibles. Verificar importando `Prisma` desde `@prisma/client` en
      cualquier archivo y comprobando que `Prisma.UserWhereInput` resuelve.
- [ ] 1.2 Registrar el punto de partida ejecutando `npm run lint` y guardando el
      recuento. Verificar que son 21 errores en 11 archivos; si el número no
      coincide, revisar el inventario del `proposal.md` antes de seguir.

## 2. Filtros y datos de Prisma

- [ ] 2.1 Tipar `andFilters: any[]` como `Prisma.EquipoWhereInput[]` en
      `src/app/api/equipos/route.ts:24`. Verificar que `npm run lint` ya no
      señala ese archivo y que el listado de equipos sigue filtrando igual.
- [ ] 2.2 Tipar `andFilters: any[]` como `Prisma.MantenimientoWhereInput[]` en
      `src/app/api/mantenimientos/route.ts:32`. Verificar el archivo con lint y
      comprobar que los filtros por estado, tipo, técnico y empresa siguen
      devolviendo lo mismo.
- [ ] 2.3 Cambiar `let whereClause: any` por `const whereClause:
      Prisma.HistorialWhereInput` en `src/app/api/historial/route.ts:28`, lo que
      resuelve a la vez el `no-explicit-any` y el `prefer-const`. Verificar que
      lint no reporta ninguno de los dos y que el historial sigue listando igual.
- [ ] 2.4 Tipar los dos `where: any` de `src/app/api/usuarios/route.ts` (líneas
      27 y 68) como `Prisma.UserWhereInput`. Verificar con lint y comprobar que
      `GET /api/usuarios?role=TECNICO` sigue excluyendo inactivos.
- [ ] 2.5 Tipar `where: any` como `Prisma.SolicitudServicioWhereInput` en
      `src/app/api/solicitudes/route.ts:27`. Verificar con lint y comprobar que
      el listado de solicitudes no cambia.
- [ ] 2.6 Tipar `tx: any` como `Prisma.TransactionClient` en la función
      `actualizarEstadoEquipo` de `src/app/api/mantenimientos/[id]/route.ts:101`.
      Verificar con lint y comprobar que completar un mantenimiento sigue
      devolviendo el equipo a `ACTIVO`.
- [ ] 2.7 Tipar los dos `updateData: any` de
      `src/app/api/mantenimientos/[id]/route.ts` (líneas 164 y 219) como
      `Prisma.MantenimientoUncheckedUpdateInput`, la variante que admite claves
      foráneas sueltas como `tecnicoId`. Verificar con lint y comprobar que tanto
      el cambio de estado por un técnico como la edición y la reasignación por un
      administrador siguen guardándose.

## 3. Iconos de lucide-react

- [ ] 3.1 Tipar `icon: any` como `LucideIcon` en `menuItems`
      (`src/components/dashboard/sidebar.tsx:23`). Verificar con lint y
      comprobar que la barra lateral sigue mostrando todos sus iconos.
- [ ] 3.2 Tipar `icon: any` como `LucideIcon` en `estadoConfig`
      (`src/components/solicitudes/solicitudes-table.tsx:54`). Verificar con lint
      y comprobar que cada estado de solicitud conserva su icono.

## 4. Payloads de formulario

- [ ] 4.1 Tipar `body: any` en
      `src/components/solicitudes/solicitudes-table.tsx:104` con una interfaz
      local que declare los campos que se envían. Verificar con lint y comprobar
      que cambiar el estado de una solicitud sigue funcionando.
- [ ] 4.2 Tipar `onSubmit(data: any)` y `handleSubmit(data: any)` en
      `src/components/usuarios/usuario-form.tsx` (líneas 49 y 126) con el tipo
      que infiere el esquema de Zod de usuarios. Verificar con lint y comprobar
      que crear y editar un usuario siguen funcionando.
- [ ] 4.3 Tipar `handleUpdate(data: any)` en
      `src/app/(dashboard)/usuarios/page.tsx:171` con el mismo tipo que reciba el
      formulario tras la tarea 4.2. Verificar con lint y comprobar que la edición
      de usuario desde el listado sigue guardando.

## 5. Fechas del formulario de mantenimiento

- [ ] 5.1 Declarar `fechaProgramada` y `fechaRealizada` como `string | Date` en
      el tipo `Mantenimiento` (`src/types/mantenimiento.ts`), que hoy promete
      `Date` mientras la API devuelve cadenas. Verificar que el proyecto sigue
      compilando en los consumidores de ese tipo.
- [ ] 5.2 Eliminar los dos `as any` de
      `src/components/mantenimientos/mantenimiento-form.tsx` (líneas 108 y 112),
      ahora innecesarios. Verificar con lint y comprobar que abrir el formulario
      de edición sigue rellenando ambas fechas correctamente.

## 6. Exportadores de PDF

- [ ] 6.1 Sustituir los `any[]` de `exportEquiposToPDF`,
      `exportMantenimientosToPDF` y `exportHistorialToPDF`
      (`src/lib/pdf-export.ts`, líneas 59, 111 y 173) por una interfaz por
      exportador que declare solo los campos que cada función lee. Verificar con
      lint y comprobar que los tres PDF se generan con las mismas columnas.
- [ ] 6.2 Comprobar que `src/__tests__/lib/pdf-export.test.ts` sigue pasando sin
      modificar sus expectativas. Si el tipo nuevo obliga a cambiar la prueba, es
      señal de que la interfaz no describe los datos reales: ajustar la interfaz,
      no la prueba.

## 7. Verificación integral

- [ ] 7.1 Ejecutar `npm run lint` y verificar que termina sin errores y con
      código de salida cero.
- [ ] 7.2 Verificar que la configuración de ESLint no rebajó ninguna regla y que
      no se añadió ningún comentario `eslint-disable` en los archivos saneados.
- [ ] 7.3 Ejecutar `npm test` y verificar que la suite sigue pasando completa.
- [ ] 7.4 Registrar aparte cualquier incoherencia real que haya destapado el
      tipado y que no se haya arreglado aquí, en lugar de dejarla sin anotar.
