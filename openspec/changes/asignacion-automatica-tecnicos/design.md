## Context

Ver `proposal.md` — Why para la motivación.

Restricciones del estado actual que condicionan el enfoque:

- Un técnico pertenece a una sola empresa (`User.empresaId`, obligatorio para el
  rol `TECNICO` por `src/lib/validations/user.ts`). Un mantenimiento llega a su
  empresa a través de `Equipo.empresaId`. El pool de candidatos, por tanto, ya es
  derivable sin cambiar el esquema.
- `POST /api/mantenimientos` ya crea el mantenimiento, la entrada de historial y
  el cambio de estado del equipo dentro de una transacción. Hay dónde meter la
  selección sin abrir una transacción nueva.
- `PUT /api/mantenimientos/[id]` arma su objeto de actualización campo por campo
  y nunca copia `tecnicoId`. La validación con Zod acepta el campo, la respuesta
  es 200, y el cambio se pierde. La reasignación manual está rota desde antes de
  este cambio.
- El filtro por empresa del selector de técnicos solo existe en el formulario
  (`mantenimiento-form.tsx`). El servidor únicamente comprueba que el usuario
  tenga rol `TECNICO`.
- Los pools son pequeños: una empresa típica tiene entre uno y cuatro técnicos.

## Goals / Non-Goals

**Goals:**

- Que el resultado del reparto sea autoritativo y no dependa de qué vio el
  navegador ni de cuánto tiempo estuvo abierto el formulario.
- Resolver el reparto sin cambios en `prisma/schema.prisma`.
- Que las reglas de validez de una asignación se apliquen en el servidor, de modo
  que valgan igual para el formulario y para cualquier llamada directa a la API.

**Non-Goals:**

- Introducir un modelo de asignaciones históricas. La carga se deriva de los
  mantenimientos existentes.
- Convertir el formulario en la fuente de verdad del reparto. Puede mostrar quién
  va a recibir el trabajo, pero de forma informativa.

## Decisions

### El reparto se resuelve en el servidor, al guardar

La selección ocurre dentro de la transacción de `POST /api/mantenimientos`,
inmediatamente antes de crear el registro.

Alternativa considerada: precalcular el técnico en el cliente al abrir el
formulario y enviarlo como un `tecnicoId` más. Rechazada por dos motivos: la
sugerencia envejece mientras el formulario está abierto, y dos administradores
trabajando a la vez verían ambos al mismo técnico como el menos cargado y le
asignarían los dos trabajos.

### El criterio de orden es (abiertos, histórico, aleatorio)

```
  ordenar candidatos por:
    1. carga abierta        ASC   -> respeta quien esta ocupado hoy
    2. carga historica      ASC   -> garantiza que todos pasen por un trabajo
    3. aleatorio                  -> reparte el empate inicial
```

Alternativas consideradas:

- **Solo carga abierta.** Un técnico que termina su trabajo vuelve a cero y puede
  recibir el segundo antes de que otro haya recibido el primero, lo que
  contradice lo acordado con el cliente.
- **Solo carga histórica.** Reparto contable perfecto, pero un técnico que entra
  a la empresa más tarde queda en cero y absorbe todo el trabajo durante semanas,
  sin importar cuánto tenga ya encima.

El orden en cascada cumple las dos condiciones sin necesidad de modelar fases.

### La ausencia de `tecnicoId` significa "decide tú"

`tecnicoId` pasa a ser opcional en `mantenimientoSchema` y su ausencia dispara el
reparto. Alternativa considerada: un campo booleano `autoAsignar`. Rechazada por
redundante — habría dos formas de expresar lo mismo y un estado contradictorio
posible (`autoAsignar: true` junto con un `tecnicoId`).

### La carga histórica cuenta asignaciones actuales, no pasadas

Se calcula sobre los mantenimientos que **hoy** apuntan al técnico. Una
reasignación, por tanto, mueve también el contador histórico del técnico anterior
al nuevo.

Alternativa considerada: una tabla de asignaciones que conserve cada asignación
histórica aunque después se reasigne. Rechazada por desproporcionada frente al
beneficio: aportaría precisión en un contador que solo sirve para desempatar.

### La reasignación se registra en el `Historial` existente

No se introduce un modelo de auditoría. El historial del equipo ya recibe
entradas cuando cambia el estado de un mantenimiento; la reasignación se suma
como un tipo más de entrada.

## Risks / Trade-offs

- **Reparar el `PUT` cambia el comportamiento observable.** Hoy un administrador
  puede cambiar el técnico, ver "guardado" y que no pase nada. Al repararlo, esa
  misma acción empezará a surtir efecto. No hay datos corruptos que arreglar,
  pero conviene avisar: quien creyera que reasignar no funciona descubrirá que
  ahora sí. → Mencionarlo al entregar.
- **Dos creaciones simultáneas pueden elegir al mismo técnico.** Ambas
  transacciones leen la carga antes de que la otra escriba. → Aceptable al
  volumen actual (creación manual por administradores); el desequilibrio se
  corrige solo en el siguiente reparto. Elevar el nivel de aislamiento sería
  desproporcionado.
- **En empresas con un solo técnico el reparto es inerte.** Siempre le toca a él,
  que es el comportamiento correcto, pero puede leerse como que la función no
  hace nada. → Documentarlo al entregar.
- **El desempate aleatorio complica las pruebas.** Una prueba no puede esperar un
  técnico concreto. → Verificar que el elegido pertenece al conjunto de empatados,
  no que sea uno en particular.
- **El mismo defecto del `PUT` afecta a `equipoId`**, que tampoco se copia nunca a
  los datos de actualización: mover un mantenimiento a otro equipo también es un
  no-op silencioso hoy. Queda **fuera del alcance** de este cambio, que solo
  repara `tecnicoId`. → Registrarlo como cambio aparte.

## Migration Plan

No hay migración de datos ni cambios de esquema. El despliegue es directo y el
retroceso consiste en revertir el código.

Un efecto esperado del primer despliegue: los mantenimientos ya existentes cuentan
como carga desde el primer reparto, así que las primeras asignaciones automáticas
irán hacia los técnicos actualmente menos cargados. El reparto arranca corrigiendo
el desequilibrio acumulado en lugar de partir de cero, que es lo deseado.

## Open Questions

- La entrada de historial por reasignación necesita un `tecnicoId` porque el
  modelo `Historial` lo exige. Hoy ese campo se usa como "quién ejecutó la
  acción" (`session.user.id`), lo que en una reasignación hecha por un
  administrador guarda el id de un usuario que no es técnico. Se puede decidir al
  implementar sin afectar a las specs ni al desglose de tareas.
