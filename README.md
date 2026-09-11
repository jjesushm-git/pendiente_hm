# Mis Tareas — Versión 11.7.3

Base: Versión 11.7.2 ESTABLE.

## Tareas no completadas
- Una tarea marcada como No completada ya puede marcarse después como Completada.
- Al hacerlo se agrega automáticamente un comentario en la ocurrencia correspondiente:
  - `Tarea completada fuera de tiempo el día DD/MM/AAAA.`
- Se conserva la funcionalidad Reabrir.
- El cambio también se respeta al completar desde Tablero.

## Tarjetas de tareas compactas / expandidas
- Las tarjetas compactas de Calendario y Semana siguen expandiéndose al tocarlas.
- Si la tarjeta ya está expandida y se vuelve a tocar una zona libre, regresa al formato compacto.
- Los controles interactivos no provocan el cierre accidental.
- En la tarjeta expandida, junto a fecha y horario aparece un botón de tres líneas.
- El menú contiene:
  - Editar.
  - Reabrir, cuando corresponde.
  - Mover a libro.
  - Eliminar.
- Alta importancia, recurrencia, comentario y movimiento de dinero conservan sus funciones.

## Movimientos registrados
- Las tarjetas siguen compactas: título, monto y fecha.
- Tocar una tarjeta muestra descripción y menú de tres líneas.
- Volver a tocarla la compacta.
- El selector superior queda como:
  - Día anterior.
  - Fecha seleccionable.
  - Día siguiente.
  - Hoy.
- El botón Hoy regresa realmente a la fecha actual.
- El modal fue ajustado para no quedar cortado en pantallas pequeñas.

## Tablero de actividades
- El resumen superior se muestra en un solo renglón.
- Presenta:
  - Pendientes.
  - Completadas.
  - No completadas.
- Es un poco más grande que la tira global de estados.

## Tira semanal
- Las celdas tienen contorno dorado en el tema Esmeralda/Dorado.
- El día seleccionado se rellena en verde.

## Encabezado y Libro
- Título principal, selector de Libro y Ajustes permanecen en el mismo renglón.
- El nombre del libro usa un visor propio para evitar que quede mocho.
- Si el nombre es más largo que el espacio disponible, se desplaza automáticamente cada 5 segundos para poder leerlo completo.

Se conservan recurrencias por tramos, copiar recurrencia, comentarios por ocurrencia, gastos/ingresos, Bitácora, exportación/importación y selector responsive de hora.
