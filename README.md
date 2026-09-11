# Mis Tareas — Versión 11.6.5

Base: Versión 11.6.4 ESTABLE.

## Edición de tareas recurrentes desde una ocurrencia

Ahora las tareas recurrentes se comportan por tramos.

Ejemplo:
- Una tarea recurrente comienza el lunes.
- El miércoles se edita esa ocurrencia.
- Lunes y martes conservan la información anterior.
- Miércoles y las siguientes ocurrencias usan la nueva información.

La misma lógica se aplica a:
- Diaria.
- Semanal.
- Mensual.
- Anual.

## Cómo funciona
- Si se edita la primera ocurrencia de la serie, se actualiza la serie actual.
- Si se edita una ocurrencia posterior:
  - el tramo anterior termina el día previo,
  - se crea un nuevo tramo desde la ocurrencia seleccionada,
  - las ocurrencias anteriores no cambian.
- Se usa `recurrenceUntil` para limitar el tramo anterior.
- Los comentarios por ocurrencia anteriores permanecen en el tramo anterior.
- Los comentarios desde la fecha de división se trasladan al nuevo tramo.
- Los movimientos financieros NO se duplican automáticamente al dividir una serie.
  - Si se captura un nuevo movimiento al editar el nuevo tramo, este pertenece al tramo nuevo.

## Cambio directo de recurrencia
La misma regla se aplica al botón de recurrencia de la tarjeta.
Si cambias la recurrencia desde una ocurrencia futura:
- las ocurrencias anteriores conservan la recurrencia anterior,
- desde la fecha seleccionada se aplica la nueva.

## Vistas
El contexto de la ocurrencia se conserva al editar desde:
- Día.
- Calendario.
- Semana.
- Tablero.

No se modifican Libros, Gastos/Ingresos, Bitácora, Comentarios, selector de hora ni exportación/importación.


### Protección de tramos ya divididos
- Si una serie ya había sido dividida y después editas una ocurrencia de un tramo histórico, se conserva también el límite final de ese tramo.
- Esto evita que una edición histórica vuelva a extenderse y se empalme con un tramo más nuevo.
- En Día y Tablero, un tramo recurrente anterior que ya terminó no se muestra como una tarea pendiente duplicada después de su fecha límite.
- Calendario y Semana siguen conservando los tramos históricos en sus fechas correspondientes.
