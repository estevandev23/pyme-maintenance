# Incoherencias destapadas por el tipado

Corresponde a la tarea 7.4. Quitar los `any` obligó al compilador a mirar sitios
que llevaban tiempo sin mirarse. Esto es lo que salió, separado entre lo que se
arregló aquí y lo que se deja anotado.

## Arreglado en este cambio

### Un *spread* muerto en el filtro de historial

`src/app/api/historial/route.ts` hacía:

```ts
if (empresaId && userRole === "ADMIN") {
  whereClause.equipo = { ...whereClause.equipo, empresaId }
}
```

`whereClause.equipo` solo se asigna en la rama de `CLIENTE`, y esta es de
`ADMIN`: el *spread* nunca tenía nada que copiar. Sustituido por la asignación
directa, que además es lo único que tipa.

### El tipo de mantenimiento prometía `Date` y la API devuelve cadenas

`src/types/mantenimiento.ts` declaraba `fechaProgramada: Date`, pero el informe
viaja en JSON y llega como texto. El formulario lo compensaba con cuatro `as any`
y comprobaciones de `typeof` en cada uso.

Se amplió el tipo a `string | Date` y la conversión se hace una sola vez, en un
ayudante. El tipo describe ahora lo que de verdad llega.

### El resolver del formulario de usuarios no coincidía con su tipo

`useForm<CreateUserInput>` recibía `zodResolver(isEditing ? updateUserSchema :
createUserSchema)`. El esquema de edición deja todos los campos opcionales, así
que su resolver no es asignable al del formulario. Era un error de tipos previo
a este cambio, y al tipar `handleSubmit` se propagó a siete sitios más.

Resuelto indicando explícitamente qué resolver rige. La solución de fondo sería
que el formulario tuviera dos tipos, uno por modo, en lugar de uno solo que vale
para los dos a medias.

## Anotado, no arreglado

### Parámetros de consulta llegan a Prisma sin validar

Siete sitios pasan un `string` de `searchParams` directamente a un campo que
Prisma declara como enumerado:

| Archivo | Parámetro |
|---|---|
| `api/equipos/route.ts` | `estado` |
| `api/mantenimientos/route.ts` | `estado`, `tipo` |
| `api/solicitudes/route.ts` | `estado`, `prioridad` |
| `api/usuarios/route.ts` | `role` |

Hoy, `?estado=CUALQUIERCOSA` no se rechaza: llega hasta Prisma, que lanza, y la
petición termina en 500 en lugar de en un 400 con explicación.

**No se arregló aquí a propósito.** La propuesta dice que el comportamiento
observable no cambia, y validar lo cambiaría —de un 500 a un 400, o a ignorar el
filtro—. Se usó una conversión de tipo, que deja el comportamiento intacto y
satisface al compilador.

Merece un cambio propio: validar esos parámetros contra su enumerado y responder
400 cuando no encajen. Son seis rutas y el patrón es el mismo en todas.

### Los errores de `tsc` bajaron, pero quedan

El proyecto pasó de **40 a 33** errores de `npx tsc --noEmit`. Los 33 restantes
siguen fuera del alcance declarado: viven en `src/components/ui/` de terceros, en
archivos de prueba y en dependencias que no están instaladas (`vaul`,
`input-otp`, `react-resizable-panels`, `@/hooks/use-mobile`).

Ese último grupo es el más llamativo: hay componentes en `src/components/ui/` que
importan paquetes que el proyecto no tiene. Son de los trece que no usa nadie, y
tienen su propia anotación pendiente.
