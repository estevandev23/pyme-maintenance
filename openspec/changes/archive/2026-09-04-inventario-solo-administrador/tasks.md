Las tareas marcadas **[app]** necesitan la aplicación corriendo en el puerto 3200
con sesión iniciada del rol que indican. El resto se verifica de forma automática.

Este es un cambio de permisos: casi todo consiste en quitar, y lo que hay que
comprobar no es que lo quitado desaparezca, sino que lo conservado siga estando.
Las tareas del grupo 5 son las que cubren eso.

## 1. Estado de partida

- [x] 1.1 Contar cuántos equipos figuran en mantenimiento sin tener ningún
  mantenimiento abierto con técnico asignado. Son los que entraron por la puerta
  que este cambio cierra; el número decide si la tarea 6.2 tiene trabajo
  <!-- Ninguno: 23 equipos en mantenimiento, los 23 con trabajo abierto y técnico.
       La 6.2 no tiene corrección que hacer. -->
- [x] 1.2 **[app]** Con sesión de cliente, recorrer la pantalla de equipos y anotar
  qué se le ofrece hoy. Es contra lo que se compara al terminar
  <!-- Hoy se le ofrece: el botón «Nuevo Equipo», y «Editar» en el menú de cada
       fila. «Eliminar» ya no se le ofrecía. Ve 8 equipos, los de su empresa, y
       el menú lateral le da Dashboard, Equipos, Solicitudes, Mantenimientos,
       Historial y Alertas. -->
- [x] 1.3 Guardar la salida de `pnpm exec tsc --noEmit` y de `pnpm lint`. Ambos
  arrastran errores previos: al terminar se compara contra esta referencia, no se
  exige cero

## 2. Permisos del servidor

- [x] 2.1 Reescribir en positivo la comprobación del registro de equipos: admitir
  al administrador y rechazar al resto, en lugar de rechazar al técnico y dejar
  pasar a los demás. Retirar el forzado de empresa del cliente, que queda sin
  objeto. Verificar con una prueba por cada uno de los tres roles
- [x] 2.2 Hacer lo mismo con la modificación de equipos, y retirar el descarte de
  empresa y estado del cliente, que queda sin objeto al no poder modificar.
  Verificar con una prueba por cada uno de los tres roles
- [x] 2.3 Comprobar que la eliminación sigue restringida al administrador, que ya lo
  estaba. Verificar con una prueba por rol: lo que ya funcionaba también necesita
  red, porque es lo que nadie mira al tocar los otros dos verbos
- [x] 2.4 Comprobar que cada prueba de rechazo afirma además que el equipo conserva
  sus datos. Una prueba que solo espera un error pasa igual si el error es de
  permisos que si es de otra cosa
- [x] 2.5 Añadir el docblock `@jest-environment node` a las pruebas de estas rutas,
  o no correrán
- [x] 2.6 Escribir estas pruebas doblando Prisma para que corran siempre. Verificar
  que **no** quedan en `src/__tests__/integracion/`: esas dos suites hacen `return`
  sin ejercitar nada cuando no encuentran la base y pasan en verde sin haber probado
  nada

## 3. El estado del equipo recién registrado

- [x] 3.1 Normalizar el estado al registrar un equipo, de modo que no pueda quedar
  figurando en mantenimiento. Verificar con una prueba de que registrarlo así lo
  deja en el estado que le corresponde por no tener trabajo
- [x] 3.2 Comprobar que los demás estados se aceptan tal cual. Verificar con una
  prueba de activo, inactivo y dado de baja
- [x] 3.3 Comprobar que el equipo sí pasa a mantenimiento cuando recibe trabajo
  abierto con técnico. Verificar con una prueba, para confirmar que la
  normalización no rompió el camino normal

## 4. La interfaz

- [x] 4.1 Retirar del cliente las entradas de registrar y modificar equipos.
  Verificar con una prueba de que no se renderizan para ese rol
- [x] 4.2 Comprobar que al técnico tampoco se le ofrecen. Verificar con una prueba
- [x] 4.3 Comprobar que al administrador se le siguen ofreciendo las tres.
  Verificar con una prueba

## 5. Lo que el cliente conserva

- [x] 5.1 Comprobar que el cliente sigue viendo los equipos de su empresa y solo
  esos. Verificar con una prueba
- [x] 5.2 Comprobar que el cliente sigue pudiendo registrar solicitudes sobre sus
  equipos. Verificar con una prueba: es la funcionalidad que este cambio no debe
  tocar y la que más fácil se rompe al cerrar permisos por entidad
- [x] 5.3 Comprobar que las suites existentes de solicitudes y de mantenimientos
  siguen pasando, sin adaptarlas. Si alguna necesita cambios, entender por qué antes
  de tocarla: puede estar señalando que se cerró de más

## 6. Verificación con la aplicación corriendo

- [x] 6.1 **[app]** Con sesión de cliente: confirmar que la pantalla de equipos ya
  no ofrece registrar ni modificar, comparando contra lo anotado en 1.2, y que sí
  puede consultar los suyos y abrir una solicitud sobre uno
- [x] 6.2 **[app]** Con sesión de administrador: confirmar que registra, modifica y
  elimina equipos como antes. Corregir a mano los equipos que la tarea 1.1 hubiera
  encontrado figurando en mantenimiento sin trabajo abierto, si hubo alguno
- [x] 6.3 **[app]** Con sesión de técnico: confirmar que la pantalla de equipos
  sigue sirviéndole para consultar y no le ofrece nada más
- [x] 6.4 **[app]** Registrar un equipo declarándolo en mantenimiento y confirmar en
  la pantalla que no aparece como tal

## 7. Cierre

- [x] 7.1 Ejecutar `pnpm test` y confirmar que pasa
- [x] 7.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint`, y confirmar contra la
  referencia de 1.3 que no se han añadido errores nuevos
- [x] 7.3 Avisar de que el cliente pierde el registro y la modificación de equipos
  antes de desplegar. El cambio se nota en el primer intento y sin aviso se
  denunciará como un fallo
- [x] 7.4 Revisar que ninguna tarea quedó marcada sin que su verificación llegara a
  ejecutarse. Si alguna no se pudo comprobar, dejarla sin marcar y decir por qué

## Resultado de la verificación (2026-09-04)

- 1.1: ningún equipo figuraba en mantenimiento sin trabajo abierto con técnico —
  23 en ese estado, los 23 con motivo. La 6.2 no tuvo corrección que hacer.
- 1.3: referencia de partida 28 errores de `tsc` y 42 líneas de `lint`. Al
  cerrar: 28 y 42. Ninguno nuevo.
- 2.x: las tres comprobaciones se reescribieron en positivo —admitir al
  administrador— en lugar de rechazar al técnico y dejar pasar al resto, que es
  la forma que dio permiso al cliente sin que nadie lo decidiera cuando se añadió
  ese rol. Comprobado sobre la aplicación con sesiones reales: POST y PUT de
  cliente y de técnico devuelven 403, el administrador 200, y tras los intentos
  la ubicación del equipo era la que puso el administrador.
- 3.1: verificado en vivo. Registrar un equipo declarándolo en mantenimiento lo
  guarda como activo.
- 5.3: **ninguna suite de solicitudes o de mantenimientos necesitó adaptarse.**
  Era la señal que buscaba la tarea: si alguna hubiera fallado, habría indicado
  que se cerró de más.
- **Defecto encontrado al mirarlo, que la suite no veía:** al quitarle al cliente
  editar y eliminar, el menú de tres puntos de cada fila seguía apareciendo y se
  abría vacío. Un control que no lleva a ninguna parte se lee peor que la ausencia
  del control. Ahora el menú solo se muestra si hay alguna acción; cubierto por
  una prueba nueva.
- 6.1: comparado contra lo anotado en 1.2. El cliente ya no ve «Nuevo Equipo» ni
  el menú de fila, sigue viendo sus 8 equipos y sigue pudiendo reportar un
  problema: el diálogo abre y le ofrece elegir entre sus equipos.
- 6.3: el técnico no tiene «Equipos» en su menú lateral; llegando por URL directa
  la pantalla le sirve para consultar y no le ofrece ninguna acción.
- **Observación fuera del alcance de este cambio:** el técnico ve el inventario
  de todas las empresas, no solo la suya. La lectura de equipos solo acota al
  cliente. Este cambio trata de quién registra y modifica, no de quién consulta,
  así que no se ha tocado; queda anotado por si merece su propio cambio.
- Entorno: base en Docker `pyme-maintenance-pg` (puerto 5444), que hubo que
  arrancar; servidor de desarrollo en el 3200. Las sesiones se acuñaron con
  `next-auth/jwt`, sin contraseñas. El equipo de prueba creado para verificar se
  eliminó al terminar.
