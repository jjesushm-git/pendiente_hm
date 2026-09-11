# Mis Tareas — Versión 11.6.1 REPARACIÓN

Base: Versión 11.6 ESTABLE.

Correcciones:

## Calendario y semana superior
- Al seleccionar cualquier fecha dentro de Calendario, la franja semanal superior cambia inmediatamente a la semana que contiene esa fecha.
- También se actualiza `weekCursor` para que la pestaña Semana quede alineada con la fecha seleccionada.

## Nueva tarea desde una fecha seleccionada
- Si seleccionas un día en Calendario y después presionas Agregar, Fecha de inicio toma ese día.
- Si estás en Día y cambias la fecha con sus controles, Agregar también toma esa fecha.
- Al editar una tarea existente se conserva su propia fecha de inicio.

## Mensajes al guardar
- El formulario usa validación propia para mostrar qué dato falta.
- Puede indicar:
  - Título.
  - Fecha de inicio.
  - Hora de inicio si no es Todo el día.
  - Hora de vencimiento si existe fecha de vencimiento y no es Todo el día.
  - Concepto del gasto/ingreso si se empezó a capturar un movimiento.
  - Monto del gasto/ingreso si se empezó a capturar un movimiento.
- El mensaje usa el formato: “Falta llenar: …”.
- El formulario desplaza el foco al primer campo faltante.

No se modificó la funcionalidad financiera de la 11.6:
- Gasto (-), Ingreso (+).
- $ dorado para gasto.
- $$ dorado para ingreso.
- Modal de detalle al tocar $ o $$ en tarjetas de tareas.
- Balance diario y acumulado.
- Libros, Bitácora, exportación/importación y comentarios.

Validaciones realizadas:
- JavaScript sin errores.
- CSS sin errores de parser.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a IDs inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos/Ingresos y Comentarios presentes.
