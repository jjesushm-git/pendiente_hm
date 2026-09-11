# Mis Tareas — Versión 11.7.5

Base: Versión 11.7.4 ESTABLE.

## Semana
- Se eliminó el apartado duplicado “Pendientes de la semana”.
- La vista principal de Semana continúa mostrando las tareas por día.
- Se conservan los apartados Completadas y No completadas.

## Movimientos registrados
- La navegación de fecha se muestra completa:
  - día anterior,
  - fecha visible DD/MM/AAAA,
  - día siguiente,
  - botón Hoy.
- Tocar la fecha abre el selector de fecha.
- Cambiar fecha actualiza inmediatamente los movimientos, balance y las vistas relacionadas.
- Hoy regresa a la fecha real en curso.
- El modal de Movimientos registrados tiene ancho y alto responsive para evitar contenido cortado.

## Botón de tres líneas de movimientos
- El botón de tres líneas abre un modal independiente de detalle.
- Ese modal muestra toda la información del movimiento:
  - Gasto/Ingreso,
  - título,
  - monto,
  - fecha,
  - libro,
  - descripción,
  - tarea relacionada si existe.
- Desde el mismo modal funcionan:
  - Editar,
  - Mover,
  - Borrar.
- Las tarjetas de movimientos conservan el comportamiento compacto/expandido al tocarlas.

## Tarjetas de tareas
- Al expandir una tarjeta se inicia un temporizador de 5 segundos.
- Después de 5 segundos vuelve automáticamente a su versión compacta.
- Tocar una zona libre sigue permitiendo contraerla inmediatamente.
- Las interacciones dentro de la tarjeta reinician el temporizador.

## Libro activo superior
- En el tema Esmeralda dorado el selector de libro tiene fondo blanco para mejorar la lectura.
- Se conserva el desplazamiento automático del nombre largo.

## Agregar / Editar libros
- Icono y Color están ocultos por defecto dentro de “Icono y color (opcional)”.
- Pueden dejarse sin icono.
- Pueden dejarse sin color.
- Los libros anteriores conservan sus iconos y colores.
- Se agregan botones “Sin icono” y “Sin color”.

## Ajustes
- Cada vez que se abre Ajustes:
  - Visual aparece contraído,
  - Gastos e ingresos aparece contraído,
  - Exportar/importar aparece contraído,
  - Acerca de aparece contraído.

Se conservan las funciones de Calendario, Día, Semana, Tablero, recurrencias por tramos, comentarios por ocurrencia, Libros, Gastos/Ingresos, Bitácora y exportación/importación.
