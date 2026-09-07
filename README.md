# Mis Tareas — Versión 10

Cambios principales:
- La app abre directamente en Calendario.
- Ajustes permite guardar el filtro predeterminado: Todas, Hoy, Próximas o Recurrentes.
- Ajustes permite cambiar el título de la app, máximo 10 caracteres.
- Ajustes permite elegir el día 1–31 en que inicia la sumatoria mensual de gastos.
- Las tareas No completadas incluyen Reabrir con reprogramación inteligente:
  - si hoy todavía no llega la hora de inicio, se reabre para hoy;
  - si la hora ya pasó, se reabre para mañana;
  - conserva la duración en días si tenía un rango de fechas.
- Nueva barra de gastos debajo de las pestañas en Calendario, Día, Semana y Tablero.
- Modal de gasto con navegación por día, semana y mes.
- Campos: fecha, ¿En qué gasté?, descripción, monto y moneda MN/DLS.
- Totales diarios y total del periodo mensual según el día configurado.
- Exportación de gastos en TXT y CSV.
- Se conservan tareas, Calendario, Día, Semana, Tablero, Papelera, Editar, Eliminar y notificaciones locales.
- Los datos siguen guardándose localmente; Supabase queda para una versión posterior.
