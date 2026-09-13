# Mis Tareas — Versión 11.8.3.1

Base: Versión 11.8.3 ESTABLE.

## Cambio de ubicación de Balance personalizado
El botón que antes aparecía debajo del Balance del día ya no se muestra en la barra financiera principal.

Ahora el flujo es:
1. Tocar el Balance del día.
2. Se abre el modal “Gastos e ingresos”.
3. Justo debajo del encabezado aparece el botón “⚖ Balance personalizado”.
4. Al tocarlo se abre la selección de Fecha inicio y Fecha fin.
5. Ambas fechas están limitadas al periodo financiero que se está mostrando.
6. Al tocar “Ver balance” se muestran todos los gastos e ingresos del intervalo seleccionado, junto con los totales y balance en MN y DLS.

## Balance principal más visible
Se aumentó el tamaño de letra de “Balance del día” y de sus datos secundarios para que sea más fácil de identificar y tocar desde el menú principal.

## Funcionalidad conservada
No se modificó la lógica de cálculo del Balance personalizado de la 11.8.3:
- rango inclusivo de Fecha inicio a Fecha fin,
- solo movimientos del libro activo,
- límites dentro del periodo financiero actual,
- separación de MN y DLS,
- gastos, ingresos y balance final.

Tampoco se modificaron tareas, calendario, semana, tablero, libros, papelera, recurrencias, tarjetas compactas ni borrado cruzado tarea/movimiento.
