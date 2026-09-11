# Mis Tareas — Versión 11.7.7

Base: Versión 11.7.6 ESTABLE.

## Fecha al agregar gasto / ingreso
- El selector de fecha ahora usa el mismo estilo visible de Movimientos registrados.
- Muestra:
  - ‹ día anterior,
  - 📅 DD/MM/AAAA,
  - › día siguiente.
- Tocar la fecha abre el selector de calendario.
- La fecha seleccionada es exactamente la fecha que se guarda en el movimiento.
- Si la app está posicionada en una fecha anterior al día actual, al abrir Agregar gasto/ingreso muestra esa fecha.
- Si la app está posicionada en una fecha futura, Agregar gasto/ingreso se ajusta al día actual.
- No se permite registrar gastos ni ingresos en fechas posteriores al día actual.
- Si se intenta elegir una fecha futura se corrige automáticamente al día actual y se muestra un aviso.

## Balance
- Debajo de “Balance del día” se muestra ahora el rango:
  - Desde DD/MM/AAAA hasta DD/MM/AAAA.
- Fecha inicio = fecha del movimiento más antiguo del libro activo incluido en el acumulado.
- Fecha fin = fecha seleccionada actualmente.
- Si todavía no existen movimientos, inicio y fin muestran la misma fecha seleccionada.
- El rango usa el mismo tamaño y estilo secundario que “Acumulado hasta…”.
- El acumulado continúa calculándose desde el movimiento más antiguo hasta la fecha seleccionada.

## Validación
- JavaScript sin errores de sintaxis.
- CSS sin errores de sintaxis.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a elementos inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos/Ingresos, Comentarios y recurrencias se conservan.
