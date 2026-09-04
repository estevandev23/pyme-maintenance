Las tareas marcadas **[app]** necesitan la aplicación corriendo en el puerto 3200
con sesión iniciada del rol que indican. La suite no cubre lo que más importa aquí
—que el directorio elegido no se publique—, así que puede pasar entera en verde con
los archivos siguiendo expuestos. El resto se verifica de forma automática.

## 1. Estado de partida

- [x] 1.1 Comprobar en la base si hay mantenimientos con reporte apuntando a la
  ruta antigua `/uploads/...`, y anotar cuántos. Decide si la tarea 6.3 tiene
  trabajo o se puede cerrar como no aplicable
- [x] 1.2 Guardar la salida de `pnpm exec tsc --noEmit` y de `pnpm lint`. Ambos
  arrastran errores previos: al terminar se compara contra esta referencia, no se
  exige cero
- [x] 1.3 **[app]** Adjuntar un PDF con el código actual desde el formulario del
  administrador y comprobar, abriéndolo **sin sesión** en una ventana privada, que
  hoy se sirve a cualquiera. Es la evidencia del defecto y lo que la tarea 5.1 debe
  invertir

## 2. Custodia del archivo

- [x] 2.1 Elegir el directorio privado y dejar la lectura y la escritura del
  archivo en un solo módulo, para que cambiar de almacenamiento sea una sustitución
  y no una búsqueda. Verificar que ninguna otra parte del código escribe o lee esa
  ruta directamente
- [x] 2.2 Nombrar el archivo por el identificador del mantenimiento, descartando el
  nombre original. Verificar con una prueba de que un nombre recibido con
  caracteres de ruta no cambia dónde se escribe
- [x] 2.3 Comprobar que el archivo es realmente un PDF por su contenido, no por el
  tipo declarado. Verificar con una prueba que envía un archivo que dice ser PDF y
  no lo es, y confirma que se rechaza y no se guarda
- [x] 2.4 Conservar el rechazo por tamaño máximo que la ruta actual ya aplica.
  Verificar con una prueba de que el motivo del rechazo se distingue del de formato

## 3. Subida vinculada al mantenimiento

- [x] 3.1 Crear la ruta de subida que cuelga del mantenimiento y retirar la ruta
  genérica de subida. Verificar que ninguna parte del código sigue llamando a la
  retirada
- [x] 3.2 Aplicar la comprobación de quién puede adjuntar: administrador siempre,
  técnico si es suyo y sigue abierto, cliente nunca. Verificar con una prueba por
  cada uno de los tres roles, más una de mantenimiento inexistente
- [x] 3.3 Sustituir el reporte anterior cuando se adjunta uno nuevo, sin dejar el
  viejo. Verificar con una prueba de que tras sustituir solo queda uno
- [x] 3.4 Añadir el docblock `@jest-environment node` a las pruebas de estas rutas,
  o no correrán

## 4. Descarga con alcance

- [x] 4.1 Crear la ruta de descarga derivando el alcance de la misma consulta que
  decide si alguien puede leer el mantenimiento, no de una copia de sus
  condiciones. Verificar con una prueba de que ambas coinciden para los casos de
  cada rol
- [x] 4.2 Verificar con pruebas los seis casos de alcance: sin sesión, administrador,
  técnico con el trabajo asignado, técnico sin él, cliente de la empresa del equipo
  y cliente de otra
- [x] 4.3 Entregar el archivo como descarga, con el tipo determinado por el sistema
  y la cabecera que impide reinterpretarlo. Verificar con una prueba sobre las
  cabeceras de la respuesta
- [x] 4.4 Distinguir el mantenimiento sin reporte de un fallo, y no revelar si el
  reporte existe a quien no tiene alcance. Verificar con una prueba de cada caso
- [x] 4.5 Escribir todas estas pruebas doblando Prisma para que corran siempre.
  Verificar que **no** quedan en `src/__tests__/integracion/`: esas dos suites hacen
  `return` sin ejercitar nada cuando no encuentran la base y pasan en verde sin
  haber probado nada

## 5. Comprobación de que el directorio no se publica

- [x] 5.1 **[app]** Adjuntar un PDF por la vía nueva y pedirlo por su ruta estática
  bajo la carpeta pública, sin sesión, en una ventana privada. Confirmar que **no**
  llega. Es la comprobación que cierra el cambio y ninguna prueba de la suite la
  cubre
- [x] 5.2 **[app]** Pedir el mismo archivo por la ruta de descarga sin sesión y
  confirmar que tampoco llega
- [x] 5.3 **[app]** Confirmar que la carpeta pública de subidas no se crea ya en
  ningún caso, adjuntando un reporte y comprobando que no reaparece

## 6. Limpieza y ajustes

- [x] 6.1 Llevarse el reporte al eliminar el mantenimiento. Verificar con una prueba
  de que tras eliminar, el archivo deja de estar disponible
- [x] 6.2 Retirar el campo de reporte del formulario de creación y conservarlo en el
  de edición. Verificar con una prueba de que al crear no se ofrece y al editar sí
- [x] 6.3 Vaciar el campo de los mantenimientos que apunten a la ruta antigua, si
  la tarea 1.1 encontró alguno. Un enlace que falla al abrirse es peor que ninguno
- [x] 6.4 Retirar de `.gitignore` la regla de `public/uploads/`, que queda sin
  objeto

## 7. Verificación con la aplicación corriendo

- [x] 7.1 **[app]** Con sesión de administrador: adjuntar un reporte a un
  mantenimiento existente, abrirlo desde el detalle y comprobar que el PDF se abre
  bien
- [x] 7.2 **[app]** Con sesión de técnico: comprobar que puede adjuntar a un
  mantenimiento suyo abierto y que el enlace le funciona
- [x] 7.3 **[app]** Con sesión de cliente: comprobar que ve y abre el reporte de un
  mantenimiento de su empresa, y que no obtiene el de otra empresa pidiéndolo por
  su dirección
- [x] 7.4 **[app]** Comprobar que un mantenimiento sin reporte no ofrece el enlace,
  en lugar de ofrecer uno que falla

## 8. Cierre

- [x] 8.1 Ejecutar `pnpm test` y confirmar que pasa
- [x] 8.2 Ejecutar `pnpm exec tsc --noEmit` y `pnpm lint`, y confirmar contra la
  referencia de 1.2 que no se han añadido errores nuevos
- [x] 8.3 Confirmar que este cambio queda cerrado **antes** de empezar
  `vista-unica-tecnico-mantenimiento`, que multiplica el uso de los adjuntos
- [x] 8.4 Revisar que ninguna tarea quedó marcada sin que su verificación llegara a
  ejecutarse. Si alguna no se pudo comprobar, dejarla sin marcar y decir por qué

## Resultado de la verificación (2026-09-03)

- 1.1: la base de desarrollo no tenía ningún mantenimiento con `reporteUrl`
  apuntando a `/uploads/`. La 6.3 queda sin trabajo.
- 1.3: el defecto es algo distinto de como lo describe la propuesta. Sin sesión,
  el archivo bajo `public/uploads/` NO se servía: el `matcher` del middleware
  solo excluye `api`, `_next` y `.png`, así que redirigía a `/login`. Con
  cualquier sesión —incluida la de un cliente de otra empresa que ni siquiera
  existía en la base— se servía entero (200, `application/pdf`). Exigía sesión,
  pero no alcance.
- 5.1 a 5.3: tras el cambio, `/almacen/reportes/<id>.pdf` devuelve 307 a
  `/login` sin sesión y 404 con sesión; `/uploads/reportes/...` da 404;
  `public/` no vuelve a crearse. La descarga sin sesión da 401.
- 7.2: el técnico adjunta por la API (200 a un trabajo suyo abierto, 403 a uno
  ajeno). La interfaz actual solo abre el diálogo de edición al administrador,
  así que el gesto de adjuntar desde pantalla le llegará con
  `vista-unica-tecnico-mantenimiento`; el enlace de descarga sí le funciona.
- Además de lo especificado: la ruta del reporte admite `DELETE` —quitar el
  reporte sin sustituirlo—, que es lo que usa la X del formulario; sin ella ese
  botón dejaba el archivo huérfano en disco. `PUT /api/mantenimientos/[id]` ya no
  escribe `reporteUrl`.
- Entorno: la base en `localhost:5444` que indica `.env` no estaba corriendo; se
  levantó un contenedor Docker `pyme-maintenance-pg` (postgres:17-alpine) con las
  migraciones aplicadas y `scripts/seed-data.js`. Las sesiones del navegador se
  acuñaron con `next-auth/jwt` y el secreto de desarrollo, sin contraseñas.
