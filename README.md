# Mis Tareas — Versión 11.7.6

Base: Versión 11.7.5 ESTABLE.

## Modales
- Se eliminó el rombo/cola azul oscuro que aparecía debajo de algunos modales de confirmación.
- Se eliminó tanto el elemento HTML como cualquier decoración residual por CSS.
- Se conservan bordes, fondos, tipografía, colores y botones de los modales.

## Movimientos registrados
- Se corrigió la navegación de fecha que se veía amontonada.
- Ahora se muestran correctamente y separados:
  - ‹ día anterior,
  - 📅 DD/MM/AAAA,
  - › día siguiente,
  - Hoy.
- Se corrigieron reglas CSS antiguas que intentaban mantener 7 columnas dentro de este modal.
- El selector de fecha dispone del espacio central completo.
- En pantallas pequeñas se adapta a 430 px y 350 px sin superponer texto ni botones.
- Balance y lista de movimientos tienen mayor separación vertical.

## Detalle de gasto / ingreso
El orden visual ahora es:
1. Tipo, título y monto.
2. Fecha.
3. Descripción.
4. Libro.
5. Tarea relacionada, cuando existe.
6. Editar / Mover / Borrar.

- Descripción aparece antes de Libro como se solicitó.
- Cada dato principal se muestra en un bloque separado para facilitar lectura en móvil.

## Validación
- JavaScript sin errores de sintaxis.
- CSS sin errores de sintaxis.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript a elementos inexistentes.
- Calendario, Día, Semana, Tablero, Libros, Gastos/Ingresos, Comentarios y recurrencias por tramos se conservan.
