# Mis Tareas — Versión 11.6.4

Base: Versión 11.6.3 ESTABLE.

## Fecha de vencimiento
- La fecha de vencimiento nunca puede quedar antes de la fecha de inicio.
- Al seleccionar una fecha de vencimiento menor:
  - automáticamente se cambia a la misma fecha de inicio,
  - se muestra un aviso.
- Si después se cambia la fecha de inicio y esta queda después del vencimiento:
  - el vencimiento también se corrige automáticamente.
- El campo Fecha de vencimiento usa además `min` con la Fecha de inicio.
- `readForm()` conserva una validación de respaldo para impedir fechas inválidas.

## Recurrencia directa desde tarjetas
- Todas las tarjetas muestran siempre la recurrencia.
- Si no se repite, muestra “↻ Sin recurrencia”.
- Al tocar la recurrencia abre un modal.
- Opciones:
  - Sin recurrencia.
  - Diaria.
  - Semanal.
  - Mensual.
  - Anual.
- Al seleccionar una opción:
  - el modal se cierra,
  - la tarea se guarda,
  - la tarjeta se actualiza inmediatamente.
- Funciona en:
  - Día.
  - Calendario.
  - Semana.
  - Tablero.

No se modificaron las demás funciones de tareas, horas, libros, gastos/ingresos, comentarios, Bitácora ni exportación/importación.
