## 1. Preparación

- [ ] 1.1 Confirmar que el árbol de trabajo está limpio y crear una rama propia
      para la migración. Verificar con `git status` que no hay cambios sin
      confirmar que puedan mezclarse con el diff del codemod.
- [ ] 1.2 Dejar registrado el estado visual de partida de las pantallas que más
      componentes usan (panel, mantenimientos, formulario de mantenimiento con
      su selector de fechas, usuarios) para poder comparar después. Verificar que
      hay una referencia de cada una antes de tocar nada.
- [ ] 1.3 Registrar el inventario de riesgos de deriva: listar las apariciones de
      `border` sin color explícito al lado, y las de `shadow-sm`, `shadow-lg`,
      `blur-sm`, `outline-none` y `rounded` sin sufijo. Verificar que la lista
      distingue las que ya llevan color de las que no.

## 2. Cambio de versión

- [ ] 2.1 Ejecutar la herramienta oficial de migración sin aceptar el resultado
      todavía. Verificar que el diff se puede revisar separando
      `src/components/ui/` del resto del código.
- [ ] 2.2 Revisar qué hizo el codemod dentro de `src/components/ui/`, que ya
      estaba en sintaxis v4. Verificar que no convirtió lo que ya era correcto;
      descartar esa parte del diff si lo hizo.
- [ ] 2.3 Actualizar `tailwindcss` a v4 y sustituir el plugin de PostCSS por
      `@tailwindcss/postcss` en `postcss.config.mjs`. Verificar que el proyecto
      arranca y genera CSS.
- [ ] 2.4 Sustituir `tailwindcss-animate` por su equivalente para v4. Verificar
      que las animaciones de apertura y cierre de diálogos y popovers siguen
      ocurriendo.

## 3. Tokens de tema

- [ ] 3.1 Trasladar a `@theme` en `src/app/globals.css` los colores, radios y
      demás tokens que hoy declara `tailwind.config.ts`, conservando los mismos
      valores. Verificar que ningún token cambia de valor en el traslado.
- [ ] 3.2 Eliminar `tailwind.config.ts` una vez trasladado su contenido.
      Verificar que no queda ninguna referencia al archivo y que el proyecto
      sigue compilando.
- [ ] 3.3 Eliminar el plugin que añadía la variante `aria-invalid`, nativa en v4.
      Verificar que un campo de formulario inválido sigue mostrando su estado de
      error.
- [ ] 3.4 Revisar los dos `@apply` de `globals.css`, cuyo comportamiento cambia
      en v4. Verificar que los elementos que dependen de ellos se siguen viendo
      igual.

## 4. Deriva visual

- [ ] 4.1 Dar color explícito a los bordes que hoy dependen del color por
      defecto, usando la lista de la tarea 1.3. Verificar que ningún borde
      quedó heredando el color del texto.
- [ ] 4.2 Corregir las clases cuya escala se desplaza (`shadow-sm`, `blur-sm`,
      `rounded` sin sufijo, `outline-none`) para que conserven su apariencia
      anterior. Verificar contra las referencias de la tarea 1.2.
- [ ] 4.3 Comprobar en el CSS compilado que las clases que antes desaparecían
      ahora se emiten: `shadow-xs`, `outline-hidden` y las de tamaño por
      variable. Verificar que un elemento con `shadow-xs` tiene sombra real.
- [ ] 4.4 Verificar el selector de fechas: celdas de día del mismo tamaño, fila
      de nombres de día alineada con la rejilla, y botones de navegación con área
      propia.

## 5. Barrera contra la recaída

- [ ] 5.1 Corregir `components.json` para que describa el proyecto real,
      incluida la ruta de la hoja de estilos, que hoy apunta a un archivo que no
      existe en esa ubicación. Verificar que la ruta declarada existe.
- [ ] 5.2 Añadir una comprobación ejecutable que falle cuando el código contenga
      sintaxis de utilidades de una versión de Tailwind distinta de la instalada,
      señalando archivo y clase. Verificar introduciendo a propósito una clase de
      la versión equivocada y comprobando que falla con ese mensaje.
- [ ] 5.3 Dejar la comprobación pasando sobre el proyecto ya migrado y
      conectarla a los comandos de verificación del proyecto. Verificar que se
      ejecuta sin errores.

## 6. Verificación integral

- [ ] 6.1 Comparar cada pantalla capturada en la tarea 1.2 con su estado tras la
      migración. Verificar que toda diferencia corresponde a un cambio declarado
      en la propuesta y no a una regresión.
- [ ] 6.2 Recorrer los formularios que usan los componentes afectados (diálogo de
      mantenimiento, alta de usuario, solicitudes) comprobando estados de foco,
      error y deshabilitado. Verificar que el contorno de foco es el del sistema
      de diseño y no el del navegador.
- [ ] 6.3 Ejecutar la suite de pruebas y el linter, y dejar constancia de que
      ninguno de los dos detecta regresiones visuales — la verificación de este
      cambio es visual por naturaleza.
