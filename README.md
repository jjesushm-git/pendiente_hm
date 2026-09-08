# Mis Tareas — Versión 11.5.5

Base: Versión 11.5.4 ESTABLE.

Cambios en comentarios:
- Los comentarios ya no forman parte del formulario Crear/Editar tarea.
- Primero se crea la tarea y después se agrega el comentario desde la tarjeta.
- Los comentarios se guardan por ocurrencia mediante `commentsByOccurrence`.
- En tareas recurrentes, el comentario de una ocurrencia NO aparece en la siguiente recurrencia.
- Las tareas antiguas que ya tenían comentario se migran automáticamente:
  - el comentario se conserva únicamente en la ocurrencia más antigua,
  - normalmente la fecha de inicio original.
- El comentario de una tarea reabierta se conserva en la ocurrencia vencida que originó la reapertura.
- El modal permite agregar, editar o borrar el comentario de una sola ocurrencia dejando el campo vacío.

Mover tarea:
- En la pestaña Día, las tarjetas ahora también muestran “📖 Mover a libro”.
- Está colocado entre Editar y Eliminar.
- Usa la misma funcionalidad que Tablero.
- Al elegir un libro, la tarea cambia de libro inmediatamente.

Validaciones:
- JavaScript sin errores.
- CSS sin errores de sintaxis.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a IDs inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos y Comentarios presentes.
