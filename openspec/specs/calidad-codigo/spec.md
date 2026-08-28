# calidad-codigo Specification

## Purpose
Define qué garantiza la verificación estática del proyecto: que `npm run lint`
termina sin errores, que esa condición se sostiene tipando de verdad en lugar de
silenciar reglas, y que una limpieza de tipos no altera lo que la aplicación
hace.

## Requirements

### Requirement: El proyecto pasa lint sin errores

El repositorio SHALL terminar `npm run lint` sin ningún error. Los avisos
(`Warning`) quedan permitidos y no invalidan la verificación.

#### Scenario: Lint sobre el repositorio limpio

- **WHEN** se ejecuta `npm run lint` sobre el repositorio sin cambios pendientes
- **THEN** el comando termina con código de salida cero
- **AND** no se reporta ningún `Error`

#### Scenario: Un error nuevo vuelve a ser visible

- **WHEN** se introduce en el código una anotación de tipo `any` explícita
- **THEN** `npm run lint` falla señalando ese archivo y esa línea

### Requirement: Las reglas se cumplen, no se silencian

El proyecto SHALL satisfacer las reglas de lint mediante tipos reales. El
proyecto MUST NOT alcanzar el check en verde rebajando la severidad de una regla
en la configuración de ESLint ni añadiendo comentarios `eslint-disable` sobre el
código señalado.

#### Scenario: La configuración conserva la severidad de las reglas

- **WHEN** se revisa la configuración de ESLint tras la limpieza
- **THEN** `@typescript-eslint/no-explicit-any` y `prefer-const` siguen
  declaradas como error

#### Scenario: No aparecen supresiones puntuales

- **WHEN** se revisan los archivos saneados
- **THEN** ninguno incorpora un comentario `eslint-disable` para las reglas que
  antes lo señalaban

### Requirement: La limpieza de tipos preserva el comportamiento

Sustituir `any` por un tipo concreto SHALL ser un cambio interno. El sistema MUST
seguir respondiendo lo mismo en cada endpoint y mostrando lo mismo en cada
pantalla afectada.

#### Scenario: Las pruebas siguen pasando

- **WHEN** se ejecuta `npm test` tras la limpieza
- **THEN** la suite termina sin fallos

#### Scenario: Los filtros de las APIs siguen filtrando igual

- **WHEN** se consulta un endpoint de listado con los mismos parámetros antes y
  después de tipar su objeto de filtros
- **THEN** el conjunto de resultados es el mismo
