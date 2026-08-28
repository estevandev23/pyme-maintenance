## 1. Alcance y filtros en el servidor

- [x] 1.1 Extraer a una función el filtro de alcance por rol que hoy se repite en
      cada métrica de `src/app/api/dashboard/stats/route.ts` (tres ramas por
      indicador). Verificar que las métricas existentes siguen devolviendo los
      mismos valores para un mismo usuario antes y después del refactor.
- [x] 1.2 Aceptar los parámetros de rango `desde` y `hasta` en el endpoint,
      validarlos y rechazar el rango invertido con un mensaje explicable.
      Verificar que una petición con inicio posterior al fin devuelve error y no
      cifras.
- [x] 1.3 Aplicar el rango por defecto de los últimos seis meses cuando la
      petición no trae parámetros, y devolver en la respuesta el rango que se
      aplicó. Verificar que la respuesta siempre declara su periodo.

## 2. Fecha de referencia única

- [x] 2.1 Sustituir los tres criterios de fecha por la fecha de referencia
      `COALESCE(fechaRealizada, fechaProgramada)` en todos los indicadores.
      Verificar con un mantenimiento programado en un mes y realizado en otro que
      cuenta en el mes de realización y solo en ese.
- [x] 2.2 Verificar que un mantenimiento pendiente sigue apareciendo en el
      informe, contado en el mes en que está programado.

## 3. Desglose mensual y totales

- [x] 3.1 Construir la serie mensual completa del rango en el servidor,
      incluyendo los meses sin actividad con valor cero. Verificar con un rango
      que contenga un mes vacío que ese mes aparece en la serie.
- [x] 3.2 Devolver el total del periodo junto al desglose. Verificar que el total
      es igual a la suma de los valores mensuales.
- [x] 3.3 Conservar la separación entre preventivos y correctivos en el desglose
      mensual. Verificar que la serie distingue ambos tipos y no los suma.

## 4. Paridad de la exportación

- [x] 4.1 Ampliar `exportEstadisticasToExcel` (`src/lib/excel-export.ts`) para
      recibir el objeto completo de estadísticas en lugar de la firma de cinco
      campos actual. Verificar que el libro generado incluye todos los
      indicadores del panel.
- [x] 4.2 Ampliar `exportEstadisticasToPDF` (`src/lib/pdf-export.ts`) del mismo
      modo. Verificar que el documento incluye todos los indicadores del panel.
- [x] 4.3 Incluir el detalle de fallas recurrentes —equipo, empresa y cantidad—
      en ambos formatos. Verificar que la lista del archivo coincide con la que
      muestra la pantalla.
- [x] 4.4 Dejar constancia en el archivo del rango aplicado y de la fecha de
      generación, en ambos formatos. Verificar abriendo cada archivo que el
      periodo es legible sin la aplicación.
- [x] 4.5 Eliminar el armado manual de `dataToExport` en `handleExportExcel` y
      `handleExportPDF` (`src/app/(dashboard)/page.tsx`) y pasar el objeto de
      estadísticas completo. Verificar que ningún indicador queda fuera por
      omisión en el mapeo.
- [x] 4.6 Actualizar `src/__tests__/lib/excel-export.test.ts` y
      `src/__tests__/lib/pdf-export.test.ts` para cubrir la firma ampliada, con
      un caso que falle si un indicador presente en la entrada no llega al
      archivo. Verificar con `npm test` que pasan.

## 5. Panel

- [x] 5.1 Añadir el selector de rango en `src/app/(dashboard)/page.tsx` y mostrar
      de forma visible el periodo aplicado. Verificar que cambiar el rango
      recarga los indicadores.
- [x] 5.2 Renombrar el indicador de desviación en pantalla para que refleje que
      mide la diferencia respecto a la fecha programada y no el tiempo de
      resolución de una solicitud. Verificar que el rótulo ya no habla de
      resolución de tickets.
- [x] 5.3 Presentar correctamente el valor negativo del indicador de desviación
      como adelanto respecto a lo programado. Verificar con datos donde los
      trabajos se realizaron antes de la fecha prevista.

## 6. Verificación integral

- [x] 6.1 Comparar uno a uno los valores del panel con los del archivo exportado
      para un mismo rango, en Excel y en PDF. Verificar que no hay diferencias.
- [x] 6.2 Repetir la comparación con un usuario de rol cliente y otro de rol
      técnico. Verificar que el archivo solo contiene los datos que ese usuario
      ve en pantalla.
- [x] 6.3 Verificar que ampliar el rango al histórico completo no expone a un
      cliente datos de otras empresas.
- [ ] 6.4 Ejecutar `npm test` y `npm run lint` y verificar que ambos terminan sin
      errores.
