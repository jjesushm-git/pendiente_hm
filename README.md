# Mis Tareas — Versión 11.5.6

Base: Versión 11.5.5 ESTABLE.

Correcciones y cambios:

## Borrar gasto
- Se corrigió el botón Borrar de cada tarjeta de gasto.
- Ahora toma el ID exacto de la tarjeta seleccionada.
- Abre el modal de confirmación estilo aplicación.
- Al confirmar, elimina únicamente ese gasto.
- Actualiza inmediatamente:
  - lista de gastos,
  - total del día,
  - total del periodo,
  - calendario,
  - demás vistas relacionadas.

También se restauró la función `comicConfirm`, ya que el modal existía pero faltaba su función JavaScript.

## Mover gasto a otro libro
- Cada tarjeta de gasto ahora muestra:
  - Editar
  - 📖 Mover
  - Borrar
- Al tocar Mover aparece un selector con los demás libros disponibles.
- El libro actual no se muestra como destino.
- Al elegir otro libro:
  - el gasto cambia de libro,
  - desaparece de la consulta del libro actual,
  - aparece en el libro destino,
  - se actualizan totales y calendario.
- Si no existe otro libro, muestra “No hay otro libro disponible”.

Validaciones:
- JavaScript sin errores.
- CSS sin errores.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a IDs inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos y Comentarios presentes.
