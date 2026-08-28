## 1. Punto de partida

- [ ] 1.1 Medir en el navegador el ancho real del contenido de una tarjeta en los
      anchos de ventana 1024, 1279, 1280, 1536 y 1920, con la barra lateral
      visible. Verificar que queda registrado el acantilado entre 1279 y 1280
      para poder contrastarlo al terminar.
- [ ] 1.2 Dejar registrado el aspecto de partida del panel a 1280px de ancho, que
      es donde peor se ve. Verificar que hay una referencia antes de tocar nada.

## 2. Contrato de la tarjeta de indicador

- [ ] 2.1 Redefinir las propiedades de `MetricCard` para que reciba por separado
      la cifra, su unidad opcional y el matiz, en lugar de un único texto.
      Verificar que el tipo ya no admite una frase en el lugar de la cifra.
- [ ] 2.2 Dar a cada parte su tratamiento tipográfico dentro de la tarjeta: cifra
      destacada, unidad menor junto a ella, matiz en el nivel de apoyo. Verificar
      con un valor con unidad y otro sin ella que ambos se componen bien.
- [ ] 2.3 Retirar el alto mínimo del rótulo y conseguir que las tarjetas de una
      fila midan lo mismo por composición. Verificar con un rótulo de tres líneas
      que ninguna tarjeta crece por encima de sus vecinas.
- [ ] 2.4 Presentar las cifras con figuras tabulares y separador de millar.
      Verificar que pasar de 9 a 10 y de 999 a 1000 no desplaza nada alrededor.
- [ ] 2.5 Añadir un nivel compacto a la tarjeta para los indicadores de contexto.
      Verificar que se distingue del destacado por tamaño de cifra, no solo por
      posición.

## 3. Composición del valor de desviación

- [ ] 3.1 Hacer que `etiquetaDesviacion` en `src/lib/estadisticas.ts` exponga
      cifra, unidad y sentido por separado en lugar de la frase montada.
      Verificar que sus pruebas siguen cubriendo adelanto, retraso y valor cero.
- [ ] 3.2 Componer la tarjeta de desviación con esas partes. Verificar que un
      adelanto se lee como adelanto y no como un tiempo negativo.
- [ ] 3.3 Revisar el rótulo y la unidad de ese indicador para que no se pueda
      confundir con tiempo de resolución de una solicitud. Verificar que ningún
      texto de la tarjeta habla de resolver tickets.

## 4. Rejilla y jerarquía

- [ ] 4.1 Pasar la rejilla de indicadores a consultas de contenedor, de modo que
      el número de columnas dependa del ancho disponible y no del de la ventana.
      Verificar que la barra lateral queda descontada.
- [ ] 4.2 Disponer los indicadores en dos filas de tres: destacados arriba
      —desviación, fallas recurrentes, completados del periodo— y de contexto
      abajo. Verificar el orden en pantalla.
- [ ] 4.3 Comprobar que ensanchar la ventana nunca reduce el espacio por tarjeta,
      recorriendo los anchos de la tarea 1.1. Verificar que el acantilado entre
      1279 y 1280 ha desaparecido.
- [ ] 4.4 Revisar el relleno de la tarjeta para el nivel de densidad que pide un
      panel de datos, sin que el contenido quede apretado. Verificar a 1280px que
      el relleno no se come una porción desproporcionada del ancho.

## 5. Escala tipográfica

- [ ] 5.1 Declarar la escala modular de tamaños del panel, con los niveles
      intermedios que hoy faltan entre el rótulo y la cifra destacada. Verificar
      que todos los tamaños usados pertenecen a la escala.
- [ ] 5.2 Aplicar la escala a las tarjetas y a los encabezados de las tarjetas
      contenedoras. Verificar que no queda ningún tamaño suelto fuera de ella.

## 6. Selector de rango

- [ ] 6.1 Sustituir los dos selectores de fecha suelta por un único calendario en
      modo rango. Verificar que inicio y fin se eligen sobre el mismo calendario
      y que los días intermedios quedan resaltados.
- [ ] 6.2 Mantener visible el periodo aplicado sin necesidad de desplegar el
      control, y conservar el comportamiento de restablecer. Verificar que
      cambiar el rango sigue recargando los indicadores.
- [ ] 6.3 Comprobar que el rango inválido se sigue rechazando con su mensaje.
      Verificar que los indicadores conservan el último rango válido.

## 7. Verificación integral

- [ ] 7.1 Comparar el panel con la referencia de la tarea 1.2 a 1280px.
      Verificar que la cifra de cada indicador cabe en una línea.
- [ ] 7.2 Recorrer los anchos 1024, 1280, 1536 y 1920 comprobando que la
      composición aguanta en todos. Verificar que en ninguno hay desbordamiento
      ni texto partido de forma extraña.
- [ ] 7.3 Comprobar que las dos filas no dejan el gráfico fuera de la vista
      inicial a una altura de ventana habitual. Verificar a 1280x800.
- [ ] 7.4 Ejecutar la suite y el linter, dejando constancia de que ninguno de los
      dos detecta regresiones visuales: la verificación de este cambio es visual
      por naturaleza.
