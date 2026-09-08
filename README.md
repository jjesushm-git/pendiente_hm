# Mis Tareas — Versión 11.5.4

Base: Versión 11.5.3 ESTABLE.

Cambio:
- Exclusivamente en las tarjetas de la pestaña Tablero se agrega el botón “📖 Mover a libro”.
- El botón aparece entre Editar y Eliminar.
- Al tocar “Mover a libro” aparece un selector con los demás libros disponibles.
- El libro actual no aparece como destino.
- Al seleccionar un libro:
  - la tarea cambia su bookId al libro elegido,
  - se guarda inmediatamente,
  - desaparece del Tablero del libro actual,
  - aparece en Calendario, Día, Semana, Tablero y demás vistas del libro destino según corresponda.
- Si solo existe un libro, se muestra “No hay otro libro disponible”.
- Alta importancia conserva su comportamiento existente: si está activa, la tarea puede seguir mostrándose globalmente aunque pertenezca al nuevo libro.

Validaciones:
- JavaScript sin errores.
- CSS sin errores de sintaxis.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a IDs inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos y Comentarios presentes.
