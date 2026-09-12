# Mis Tareas — Versión 11.8.2

Base utilizada: Versión 11.8.1 ESTABLE.

## Borrar una tarea que tiene movimiento financiero
La eliminación ahora tiene validación cruzada.

Flujo:
1. Se confirma que quieres eliminar la tarea.
2. La tarea se enviará a Papelera por 24 horas, igual que antes.
3. Si la tarea tiene un gasto o ingreso vinculado, aparece una segunda confirmación con:
   - Borrar ambos.
   - Conservar movimiento.

Si eliges Conservar movimiento:
- la tarea va a Papelera,
- el gasto/ingreso permanece registrado.

Si eliges Borrar ambos:
- la tarea va a Papelera,
- el movimiento financiero se elimina.

Esta lógica se aplica tanto al botón Eliminar de la tarjeta expandida como al botón Eliminar dentro de Editar tarea.

## Borrar un movimiento financiero que pertenece a una tarea
Al eliminar desde Movimientos registrados:

1. Se confirma que quieres borrar el movimiento.
2. Si ese movimiento tiene una tarea vinculada, aparece una segunda confirmación con:
   - Borrar ambos.
   - Conservar tarea.

Si eliges Conservar tarea:
- se elimina solamente el movimiento,
- la tarea permanece.

Si eliges Borrar ambos:
- se elimina el movimiento,
- la tarea vinculada se envía a Papelera por 24 horas.

## Mensajes
Los mensajes finales indican claramente qué ocurrió:
- solo tarea,
- tarea + movimiento,
- solo movimiento,
- movimiento + tarea.

## Conservado
No se modificó la lógica de:
- Calendario,
- Día,
- Semana,
- Tablero,
- recurrencias,
- libros,
- periodos financieros,
- comentarios,
- restauración de Papelera.

## Validación
- JavaScript sin errores de sintaxis.
- CSS sin errores.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a elementos inexistentes.
- Todas las rutas existentes de borrado de tarea utilizan la validación cruzada.
- La ruta de borrado de movimientos utiliza la validación cruzada.
