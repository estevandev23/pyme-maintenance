## 1. Regla de inmutabilidad

- [ ] 1.1 Añadir a `src/lib/` una función pura que reciba el `equipoId` enviado y
      el `equipoId` guardado y decida si la actualización debe rechazarse.
      Verificar que devuelve "aceptar" cuando el campo llega ausente, cuando
      llega vacío y cuando coincide con el guardado, y "rechazar" solo cuando
      difiere. Verificar que no consulta la base de datos ni depende de Prisma.
- [ ] 1.2 Añadir las pruebas de esa función en `src/__tests__/lib/`, cubriendo
      los cuatro casos de la tarea 1.1. Verificar con `npm test` que pasan.

## 2. Rechazo en el endpoint

- [ ] 2.1 En `PUT /api/mantenimientos/[id]`, aplicar la comprobación de la tarea
      1.1 en la rama de ADMIN y CLIENTE, después de validar con Zod y antes de
      abrir la transacción. Verificar con una llamada directa a la API que enviar
      un `equipoId` distinto responde error y no 200.
- [ ] 2.2 Redactar el mensaje de rechazo de modo que explique que el equipo se
      fija al crear el mantenimiento y sugiera la alternativa: cancelar este
      mantenimiento y crear uno nuevo sobre el equipo correcto. Verificar que el
      texto aparece tal cual en la respuesta.
- [ ] 2.3 Comprobar que el mantenimiento no queda modificado tras un rechazo:
      enviar en la misma petición un equipo distinto y una descripción nueva, y
      verificar que ni el equipo ni la descripción cambiaron.

## 3. No romper la edición existente

- [ ] 3.1 Verificar desde el formulario que guardar una edición normal —que
      reenvía el `equipoId` actual— sigue funcionando y guarda los demás campos.
- [ ] 3.2 Verificar que una actualización que omite `equipoId` se acepta y el
      mantenimiento conserva su equipo.
- [ ] 3.3 Verificar que la reasignación de técnico introducida por
      `asignacion-automatica-tecnicos` sigue funcionando junto con esta
      comprobación, incluida su entrada en el historial.
- [ ] 3.4 Verificar que la rama de TECNICO del endpoint no se ve afectada: usa
      `cambiarEstadoSchema`, que no acepta `equipoId`, y debe seguir cambiando
      estado y observaciones igual que antes.

## 4. Verificación integral

- [ ] 4.1 Ejecutar `npm test` y verificar que la suite pasa completa.
- [ ] 4.2 Ejecutar `npm run lint` y verificar que este cambio no añade errores
      nuevos. El proyecto arrastra un backlog propio, registrado en el cambio
      `limpieza-backlog-lint`; comparar contra ese punto de partida, no contra
      cero.
