# Mis Tareas — Versión 11.7.8

Base: Versión 11.7.7 ESTABLE.

## Balance basado en el periodo financiero
Los cálculos ya no usan todos los movimientos desde el más antiguo.

Ahora utilizan el Día de inicio del periodo financiero configurado en Ajustes.

Ejemplo:
- Día de inicio: 14.
- Fecha actual/seleccionada: 11/09/2026.
- Periodo financiero: 14/08/2026 a 13/09/2026.
- El acumulado usa únicamente los gastos e ingresos de ese periodo hasta el día seleccionado.

En Balance se muestra:
- Balance del día.
- Periodo completo: Inicio – Fin.
- Acumulado calculado hasta el día seleccionado.

## Modal de contabilidad
El modal que se abre al tocar Balance también usa el periodo financiero.

Antes de los totales muestra:
- Inicio.
- Fin.
- Calculado al.

La lista de movimientos y sus totales corresponden únicamente a ese periodo financiero.

## Cambio del día de corte y Bitácora
Si se cambia el Día de inicio y el nuevo corte ya pasó:
- se identifica el periodo anterior que queda cerrado con el nuevo día,
- se guarda en Bitácora como periodo EDITADO,
- el nombre/token incluye `_EDITADO`,
- la tarjeta muestra la etiqueta EDITADO y el nuevo día de corte.

Ejemplo al 11/09/2026:
- Día anterior: 14.
- Se cambia a día 9.
- Nuevo periodo actual: 09/09/2026 a 08/10/2026.
- Periodo anterior generado como editado: 09/08/2026 a 08/09/2026.
- Aparece en Bitácora identificado como EDITADO.

Si un periodo termina normalmente sin modificar el día de corte, aparece en Bitácora sin la etiqueta EDITADO.

Los periodos anteriores siguen respetando el historial del día de corte que tenían.

## Libro activo superior
- El selector ya no ocupa todo el espacio blanco disponible.
- Se ajusta al ancho real del nombre del libro.
- Si el nombre crece, el botón crece hasta el espacio permitido.
- Título, selector de libro y Ajustes permanecen en el mismo renglón.
- Si el nombre supera el ancho máximo, se conserva el desplazamiento automático cada 5 segundos.

## Validación
- JavaScript sin errores.
- CSS sin errores.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a elementos inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos/Ingresos, Comentarios, Bitácora y recurrencias se conservan.
