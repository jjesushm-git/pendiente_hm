# Mis Tareas — Versión 11.8.2.1

Base: Versión 11.8.2 ESTABLE.

## Corrección visual de tarjetas compactas
Se corrigió únicamente la distribución visual de las tarjetas compactas.

El problema era una regla responsive antigua que cambiaba el botón de recurrencia a `white-space: normal`, permitiendo que “Sin recurrencia” se partiera en dos líneas. Esto empujaba la fecha y el botón de comentario y hacía que la tarjeta se viera encimada.

### Cambios
- La recurrencia compacta ya no puede partirse en dos líneas.
- En tarjetas compactas “Sin recurrencia” se muestra como `Sin rec.`.
- Las recurrencias Diaria, Semanal, Mensual y Anual conservan sus nombres.
- El botón sigue siendo clicable y abre exactamente el mismo editor de recurrencia.
- La fecha compacta se muestra como `📅 DD/MM/AA`.
- El título emergente conserva la fecha completa.
- Fecha y comentario tienen espacio reservado.
- Los metadatos anteriores se recortan con puntos suspensivos si el teléfono no tiene suficiente ancho.

## Sin cambios funcionales
No se modificó:
- altura mínima de tarjetas compactas,
- padding de tarjetas,
- tareas,
- recurrencias,
- comentarios,
- calendario,
- tira semanal,
- gastos e ingresos,
- borrado cruzado tarea/movimiento de la 11.8.2,
- libros,
- papelera,
- periodos financieros.

## Validación
Se validan sintaxis JavaScript/CSS, IDs, referencias DOM y una representación móvil a 360 px.


## Ajuste final de fecha en tarjeta compacta
La fecha ahora aparece fija en la esquina inferior derecha de la tarjeta compacta:

`📅 DD/MM/AA`

- No crea una línea nueva.
- No aumenta la altura de la tarjeta.
- No modifica el padding ni `min-height` existente.
- La línea de hora / estado / recurrencia sigue en una sola línea.
- El comentario permanece clicable.
- Se aplica automáticamente en todos los lugares que usan tarjetas compactas.
