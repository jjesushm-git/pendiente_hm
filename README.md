# Mis Tareas — Versión 11.8.1

Base: Versión 11.8 ESTABLE.

## Fecha en tarjetas compactas
Todas las tarjetas compactas de tareas ahora muestran la fecha de la ocurrencia.

Se aplica en:
- Día.
- Calendario.
- Semana.
- Tablero.
- Pendientes.
- Completadas.
- No completadas.

La fecha aparece en la misma línea de metadatos, inmediatamente antes del botón de comentario:

`... · 📅 DD/MM/AAAA · 💬`

Para no aumentar el tamaño de la tarjeta:
- no se cambia su altura mínima,
- no se cambia su padding,
- la línea no se parte,
- los metadatos anteriores pueden reducirse visualmente si falta espacio,
- la fecha y el botón de comentario permanecen visibles.

## Tira semanal superior
Los botones de la semana superior ahora usan la misma lógica del Calendario.

### Primer toque
- selecciona el día,
- actualiza la información de la fecha,
- permanece en la pestaña actual.

### Segundo toque sobre el mismo día
Abre el menú rápido con:
- Agregar tarea.
- Agregar gasto.

La fecha seleccionada se transmite automáticamente al formulario correspondiente.

### Fechas futuras
- Agregar tarea sigue disponible.
- Agregar gasto queda deshabilitado porque no se permiten movimientos financieros futuros.

No importa si estás en Día, Calendario, Semana o Tablero: usar la tira semanal no te cambia automáticamente de pestaña.

## Validación
- JavaScript sin errores.
- CSS sin errores.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript inexistentes.
- Se conservan Calendario, Día, Semana, Tablero, Libros, Movimientos, Comentarios, recurrencias y periodos financieros.
