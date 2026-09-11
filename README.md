# Mis Tareas — Versión 11.7.2

Base: Versión 11.7.1 ESTABLE.

## Movimientos registrados
- Las tarjetas se muestran compactas con solamente título, monto y fecha.
- La descripción queda oculta inicialmente.
- Al tocar la tarjeta se despliega la descripción y, si corresponde, la tarea asociada.
- El botón de tres líneas horizontales aparece en el contenido desplegado.
- El menú conserva Editar, Mover y Borrar.
- Se corrigió el modal para que siempre quepa en pantallas móviles pequeñas.
- La lista interna tiene desplazamiento propio sin cortar encabezado ni controles.

## Fecha de gasto / ingreso
- Se quitaron los saltos por semana y mes.
- Solo quedan día anterior y día siguiente.
- La fecha central es un selector `date`; al tocarla abre el calendario del dispositivo como selector.
- Al abrir Agregar gasto/ingreso usa la fecha actualmente seleccionada en la app.
- Se conserva la regla existente de no permitir movimientos en fechas futuras.
- Movimientos registrados usa el mismo formato simple de navegación por día.

## Recurrencia — Copiar
- Se agrega la opción Copiar al editar recurrencia desde cualquier tarjeta.
- También aparece en el selector Repetir al editar una tarea existente.
- No aparece en Nueva tarea.
- Al elegir Copiar se muestra un selector de fecha.
- Solo permite fechas futuras.
- Guardar crea una nueva tarea independiente en la fecha seleccionada.
- La copia queda sin recurrencia, sin comentarios y sin duplicar el movimiento financiero.

## Calendario y tira semanal
- El emoticono/contador de tareas y $/$$ aparecen en una sola fila debajo del número del día.
- 1 tarea muestra su emoticono.
- 2 a 4 tareas muestran un contador amarillo.
- 5 o más muestran contador rojo.
- El contador queda centrado y usa como máximo dos dígitos visibles (hasta 99).
- Se redujo aún más la altura de las celdas para compactar el calendario.
- Calendario y tira superior usan el mismo formato visual.

Se conservan las funciones de Calendario, Día, Semana, Tablero, Libros, comentarios por ocurrencia, recurrencias por tramos, gastos/ingresos, Bitácora, exportación/importación y selector responsive de hora.
