Las tareas marcadas **[app]** necesitan la aplicación corriendo en el puerto 3200
con sesión iniciada del rol que indican. El resto se verifica de forma automática.

Este es un cambio de permisos: casi todo consiste en quitar, y lo que hay que
comprobar no es que lo quitado desaparezca, sino que lo conservado siga estando.
Las tareas del grupo 5 son las que cubren eso.

## 1. Estado de partida

- [ ] 1.1 Contar cuántos equipos figuran en mantenimiento sin tener ningún
  mantenimiento abierto con técnico asignado. Son los que entraron por la puerta
  que este cambio cierra; el número decide si la tarea 6.2 tiene trabajo
- [ ] 1.2 **[app]** Con sesión de cliente, recorrer la pantalla de equipos y anotar
  qué se le ofrece hoy. Es contra lo que se compara al terminar
- [ ] 1.3 Guardar la salida de `pnpm exec tsc --noEmit` y de `pnpm lint`. Ambos
  arrastran errores previos: al terminar se compara contra esta referencia, no se
  exige cero

## 2. Permisos del servidor

- [ ] 2.1 Reescribir en positivo la comprobación del registro de equipos: admitir
  al administrador y rechazar al resto, en lugar de rechazar al técnico y dejar
  pasar a los demás. Retirar el forzado de empresa del cliente, que queda sin
  objeto. Verificar con una prueba por cada uno de los tres roles
- [ ] 2.2 Hacer lo mismo con la modificación de equipos, y retirar el descarte de
  empresa y estado del cliente, que queda sin objeto al no poder modificar.
  Verificar con una prueba por cada uno de los tres roles
- [ ] 2.3 Comprobar que la eliminación sigue restringida al administrador, que ya lo
  estaba. Verificar con una prueba por rol: lo que ya funcionaba también necesita
  red, porque es lo que nadie mira al tocar los otros dos verbos
- [ ] 2.4 Comprobar que cada prueba de rechazo afirma además que el equipo conserva
  sus datos. Una prueba que solo espera un error pasa igual si el error es de
  permisos que si es de otra cosa
- [ ] 2.5 Añadir el docblock `@jest-environment node` a las pruebas de estas rutas,
  o no correrán
- [ ] 2.6 Escribir estas pruebas doblando Prisma para que corran siempre. Verificar
  que **no** quedan en `src/__tests__/integracion/`: esas dos suites hacen `return`
  sin ejercitar nada cuando no encuentran la base y pasan en verde sin haber probado
  nada

## 3. El estado del equipo recién registrado

- [ ] 3.1 Normalizar el estado al registrar un equipo, de modo que no pueda quedar
  figurando en mantenimiento. Verificar con una prueba de que registrarlo así lo
  deja en el estado que le corresponde por no tener trabajo
- [ ] 3.2 Comprobar que los demás estados se aceptan tal cual. Verificar con una
  prueba de activo, inactivo y dado de baja
- [ ] 3.3 Comprobar que el equipo sí pasa a mantenimiento cuando recibe trabajo
  abierto con técnico. Verificar con una prueba, para confirmar que la
  normalización no rompió el camino normal

## 4. La interfaz

- [ ] 4.1 Retirar del cliente las entradas de registrar y modificar equipos.
  Verificar con una prueba de que no se renderizan para ese rol
- [ ] 4.2 Comprobar que al técnico tampoco se le ofrecen. Verificar con una prueba
- [ ] 4.3 Comprobar que al administrador se le siguen ofreciendo las tres.
  Verificar con una prueba

## 5. Lo que el cliente conserva

- [ ] 5.1 Comprobar que el cliente sigue viendo los equipos de su empresa y solo
  esos. Verificar con una prueba
- [ ] 5.2 Comprobar que el cliente sigue pudiendo registrar solicitudes sobre sus
  equipos. Verificar con una prueba: es la funcionalidad que este cambio no debe
  tocar y la que más fácil se rompe al cerrar permisos por entidad
- [ ] 5.3 Comprobar que las suites existentes de solicitudes y de mantenimientos
  siguen pasando, sin adaptarlas. Si alguna necesita cambios, entender por qué antes
  de tocarla: puede estar señalando que se cerró de más

## 6. Verificación con la aplicación corriendo

- [ ] 6.1 **[app]** Con sesión de cliente: confirmar que la pantalla de equipos ya
  no ofrece registrar ni modificar, comparando contra lo anotado en 1.2, y que sí
  puede consultar los suyos y abrir una solicitud sobre uno
- [ ] 6.2 **[app]** Con sesión de administrador: confirmar que registra, modifica y
  elimina equipos como antes. Corregir a mano los equipos que la tarea 1.1 hubiera
  encontrado figurando en mantenimiento sin trabajo abierto, si hubo alguno
- [ ] 6.3 **[app]** Con sesión de técnico: confirmar que la pantalla de equipos
  sigue sirviéndole para consultar y no le ofrece nada más
- [ ] 6.4 **[app]** Registrar un equipo declarándolo en mantenimiento y confirmar en
  la pantalla que no aparece como tal

## 7. Cierre

- [ ] 7.1 Ejecutar `pnpm test` y confirmar que pasa
- [ ] 7.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint`, y confirmar contra la
  referencia de 1.3 que no se han añadido errores nuevos
- [ ] 7.3 Avisar de que el cliente pierde el registro y la modificación de equipos
  antes de desplegar. El cambio se nota en el primer intento y sin aviso se
  denunciará como un fallo
- [ ] 7.4 Revisar que ninguna tarea quedó marcada sin que su verificación llegara a
  ejecutarse. Si alguna no se pudo comprobar, dejarla sin marcar y decir por qué
