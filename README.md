# Mis Tareas — Versión 11.8

Base: Versión 11.7.9 ESTABLE.

## Calendario: acción rápida con clic
Se eliminó la pulsación larga de 3 segundos.

Ahora funciona así:

1. Primer clic sobre un día:
   - selecciona ese día,
   - actualiza las tareas, balance y semana correspondientes.

2. Si vuelves a tocar el mismo día que ya está seleccionado:
   - abre el modal de acción rápida.

El modal permite:
- Agregar tarea.
- Agregar gasto.

## Agregar tarea
- Usa automáticamente como Fecha de inicio el día seleccionado.
- Puede abrirse desde cualquier día seleccionado del calendario.
- Al guardar, la aplicación permanece en Calendario.
- La tarea aparece inmediatamente en ese día.

## Agregar gasto / ingreso
- Usa automáticamente la fecha seleccionada.
- Solo está disponible si el día seleccionado no es posterior al día actual.
- En una fecha futura el botón Agregar gasto queda deshabilitado y se muestra el aviso correspondiente.
- Al guardar, la aplicación permanece en Calendario y se actualizan los indicadores financieros del día.

## Cambio de mes
Si se toca un día visible que pertenece al mes anterior o siguiente:
- ese día queda seleccionado,
- el Calendario cambia al mes correspondiente,
- un segundo clic sobre ese día abre las acciones rápidas.

## Validación
- JavaScript sin errores.
- CSS sin errores.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a elementos inexistentes.
- Se eliminó la función de pulsación larga.
- Se conservan Calendario, Día, Semana, Tablero, Libros, Movimientos, Comentarios, recurrencias y periodos financieros.
