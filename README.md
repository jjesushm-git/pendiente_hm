# Mis Tareas — Versión 11.7.4

Base: Versión 11.7.3 ESTABLE.

## Tarjetas unificadas
Las tarjetas de tareas ahora usan el mismo diseño y comportamiento en:
- Día.
- Calendario.
- Semana.
- Tablero.

Todas:
- aparecen compactas por defecto,
- al tocar una zona libre se expanden,
- al volver a tocar una zona libre vuelven a compactarse,
- conservan emoticono, recurrencia, comentarios y movimiento financiero.

## Menú de tres líneas
- Se corrigió el botón de tres líneas para las tarjetas expandidas.
- El menú se busca dentro de la propia tarjeta y no por ID global.
- Esto corrige especialmente tareas recurrentes que pueden aparecer varias veces.
- El menú contiene:
  - Editar,
  - Reabrir cuando corresponda,
  - Eliminar.
- “Mover a libro” se eliminó del menú.

## Mover a / Mover a libro
Todas las tarjetas expandidas incluyen un único control de movimiento.

Por defecto el botón dice:
- Mover a

Al tocarlo cambia a:
- Mover a libro

Funciona como el cambio MN / DLS:
- Mover a: permite seleccionar Pendiente, En proceso, En espera o Completada.
- Mover a libro: muestra los demás libros disponibles.

Al volver a tocar el botón cambia nuevamente al otro modo.

La funcionalidad está disponible en Día, Calendario, Semana y Tablero.

## Tablero
- Se eliminó la barra duplicada Pendientes / Completadas / No completadas debajo de “Tablero de actividades”.
- Se conserva únicamente el resumen global superior.
- Las actividades del tablero ahora se muestran compactas.
- Mantienen las columnas Pendientes, En proceso, En espera y Completadas.
- Al expandirse usan exactamente la misma tarjeta que las demás pestañas.

## Compatibilidad
Se mantienen:
- completar una tarea fuera de tiempo y su comentario automático,
- recurrencias por tramos,
- comentarios por ocurrencia,
- gastos e ingresos,
- libros,
- selector responsive de hora,
- Bitácora,
- importación/exportación,
- contabilidad y balance.
