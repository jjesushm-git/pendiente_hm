# Mis Tareas — Versión 11.6 ESTABLE

Base: Versión 11.5.6 ESTABLE.

## Gastos e ingresos
- La aplicación ahora maneja Gasto e Ingreso.
- Gasto = valor negativo.
- Ingreso = valor positivo.
- Gasto se muestra en rojo.
- Ingreso se muestra en verde.
- Indicador dorado:
  - $ = Gasto
  - $$ = Ingreso.
- Los movimientos antiguos sin tipo se conservan automáticamente como Gasto.
- El resumen muestra Balance del día y Acumulado del periodo.

## Tareas
- Crear/Editar tarea incluye una sección financiera opcional.
- El selector inicia en Gasto y cambia a Ingreso al tocarlo.
- Gasto pregunta: “¿En qué gasté?”.
- Ingreso pregunta: “¿Cómo lo gané?”.
- Incluye descripción, monto y moneda MN/DLS.
- Si no se captura monto, la tarea queda sin movimiento.
- Si la tarea tiene movimiento aparece $ o $$ dorado en la tarjeta.
- Al tocar $ o $$ en una tarjeta de tarea se abre un modal con:
  - tipo,
  - concepto,
  - descripción,
  - importe,
  - moneda,
  - fecha.
- El modal de $/$$ es exclusivo de las tarjetas de tareas.
- Al mover una tarea a otro libro, su movimiento asociado también cambia de libro.

## Botón +$
- Permite capturar Gasto o Ingreso.
- Cambia automáticamente título, pregunta y texto del botón según el tipo.

## Consulta financiera
- Las tarjetas muestran $ para Gasto y $$ para Ingreso.
- Los importes aparecen con signo:
  - -$ para gasto,
  - +$ para ingreso.
- La Bitácora, periodo actual, TXT y CSV calculan el neto correctamente.
- Importación de movimientos mantiene compatibilidad con archivos anteriores.

## Ajustes
- “Título de la aplicación” ahora se muestra como “Título principal”.

## Validación realizada
- JavaScript: sin errores de sintaxis.
- CSS: sin errores de parser.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a IDs inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos/Ingresos y Comentarios presentes.
- Prueba funcional en navegador:
  - creación de tarea con gasto,
  - $ en tarjeta y modal de detalle,
  - edición y guardado de tarea,
  - creación de ingreso desde +$,
  - balance -50 + 200 = +150,
  - gasto rojo / ingreso verde,
  - borrado con confirmación,
  - movimiento de tarea y movimiento financiero asociado entre libros,
  - creación de tarea con ingreso y símbolo $$.
