## 1. Regla de selección

- [x] 1.1 Crear `src/lib/asignacion-tecnicos.ts` con una función pura que reciba
      los candidatos con sus contadores de carga abierta e histórica y devuelva
      el elegido según el orden `(abiertos ASC, histórico ASC, aleatorio)`.
      Verificar que la función no consulta la base de datos ni depende de Prisma.
- [x] 1.2 Añadir `src/__tests__/lib/asignacion-tecnicos.test.ts` cubriendo los
      escenarios de la spec: menor carga abierta gana, empate roto por histórico,
      empate total resuelto entre los candidatos empatados, y lista vacía.
      Verificar con `npm test -- asignacion-tecnicos` que los casos pasan.
- [x] 1.3 En el caso de empate total, verificar la aleatoriedad comprobando que
      el elegido pertenece al conjunto de empatados y que muchas ejecuciones
      producen más de un resultado distinto, nunca esperando un técnico fijo.

## 2. Candidatos y carga

- [x] 2.1 Implementar la consulta de candidatos: usuarios con rol `TECNICO`,
      `activo = true` y `empresaId` igual al de la empresa del equipo del
      mantenimiento. Verificar que un técnico inactivo y uno de otra empresa
      quedan fuera del resultado.
- [x] 2.2 Implementar el cálculo de carga abierta (mantenimientos en
      `PROGRAMADO` o `EN_PROCESO`) e histórica (todos los estados) por candidato
      en una sola consulta agrupada. Verificar que un técnico sin mantenimientos
      aparece con ambos contadores en cero y no se pierde del listado.
- [x] 2.3 Permitir excluir usuarios inactivos en `GET /api/usuarios?role=TECNICO`
      (`src/app/api/usuarios/route.ts`), que hoy no filtra por `activo`.
      Verificar que la respuesta ya no incluye técnicos dados de baja.

## 3. Creación de mantenimiento

- [x] 3.1 Hacer `tecnicoId` opcional en `mantenimientoSchema`
      (`src/lib/validations/mantenimiento.ts`). Verificar que una petición sin
      ese campo ya no es rechazada por la validación.
- [x] 3.2 En `POST /api/mantenimientos`, cuando no llega `tecnicoId`, resolver el
      técnico con la regla de la tarea 1.1 dentro de la transacción existente,
      antes de crear el registro. Verificar creando un mantenimiento sin técnico
      y comprobando que queda asignado al de menor carga.
- [x] 3.3 Validar en el servidor que el técnico —venga del administrador o del
      reparto— esté activo y pertenezca a la empresa del equipo. Verificar que
      una petición directa con un técnico de otra empresa se rechaza con un
      mensaje que nombra el motivo.
- [x] 3.4 Devolver un error explicable cuando la empresa del equipo no tiene
      ningún técnico activo y no se indicó técnico. Verificar que el
      mantenimiento no se crea y que el mensaje menciona la ausencia de técnicos
      activos.

## 4. Reasignación y trazabilidad

- [x] 4.1 En `PUT /api/mantenimientos/[id]`, copiar `tecnicoId` al objeto de
      actualización, que hoy nunca lo incluye. Verificar reasignando un
      mantenimiento y confirmando con una consulta posterior que el técnico
      cambió de verdad.
- [x] 4.2 Aplicar en la reasignación las mismas validaciones de la tarea 3.3.
      Verificar que reasignar a un técnico inactivo o de otra empresa se rechaza
      y que el mantenimiento conserva su técnico anterior.
- [x] 4.3 Registrar en el `Historial` del equipo una entrada cuando cambie el
      técnico, mencionando al anterior y al nuevo, y no registrar nada cuando la
      actualización no toca el técnico. Verificar ambos casos en la vista de
      historial del equipo.

## 5. Formulario

- [x] 5.1 Permitir dejar vacío el campo de técnico en
      `src/components/mantenimientos/mantenimiento-form.tsx` para delegar en el
      reparto automático, con una opción explícita que lo comunique. Verificar
      que el formulario deja guardar sin elegir técnico.
- [x] 5.2 Mostrar la carga abierta de cada técnico junto a su nombre en el
      selector, para que la elección manual del administrador sea informada.
      Verificar que los números coinciden con los mantenimientos abiertos de cada
      técnico.
- [x] 5.3 Mantener el filtro por empresa que ya existe en el selector. Verificar
      que sigue sin ofrecer técnicos de otras empresas tras los cambios.

## 6. Verificación integral

- [x] 6.1 Comprobar el reparto de extremo a extremo con una empresa de tres
      técnicos sin trabajos: crear tres mantenimientos seguidos sin indicar
      técnico y verificar que cada uno recae en un técnico distinto.
- [x] 6.2 Comprobar que completar un mantenimiento libera carga: tras cerrarlo,
      el siguiente reparto puede volver a elegir a ese técnico si es el de menor
      carga abierta.
- [x] 6.3 Ejecutar `npm test` y `npm run lint` y verificar que ambos terminan sin
      errores.
