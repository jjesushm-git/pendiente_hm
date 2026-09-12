# Mis Tareas — Versión 11.7.9

Base: Versión 11.7.8.2 ESTABLE.

## Agregar gasto+
En Agregar gasto / ingreso se agregó un botón nuevo:

- Agregar gasto+
- Si el tipo es Ingreso cambia a Agregar ingreso+.

Al tocarlo:
1. valida los mismos campos que Guardar,
2. guarda el gasto o ingreso,
3. conserva la fecha seleccionada,
4. vuelve a abrir inmediatamente el formulario vacío,
5. permite capturar otro movimiento sin regresar al menú anterior.

El botón se oculta al editar un movimiento existente; se usa únicamente para altas nuevas.

## Copiar movimiento
En Movimientos registrados, dentro del botón de tres líneas y el modal de detalle, se agregó:

- ⧉ Copiar

Al tocarlo:
- abre un selector de fecha,
- solo permite fechas posteriores al día actual,
- copia tipo, título, descripción, monto, moneda y libro,
- crea un movimiento independiente,
- no liga la copia a la tarea original aunque el movimiento fuente haya nacido desde una tarea.

## Pulsación larga en Calendario
Mantener pulsado un día durante 3 segundos abre un modal con:

- Agregar tarea.
- Agregar gasto.

La fecha del día pulsado se utiliza automáticamente.

### Agregar tarea
- abre Nueva tarea,
- Fecha de inicio usa el día pulsado,
- al guardar vuelve al Calendario,
- la tarea aparece ya registrada en ese día.

### Agregar gasto
- abre Agregar gasto/ingreso,
- usa exactamente el día pulsado,
- al guardar vuelve al Calendario,
- el movimiento aparece en los indicadores del día.

Los gastos no se pueden registrar en fechas futuras. Si se mantiene pulsado un día futuro, Agregar gasto aparece deshabilitado y se muestra el aviso correspondiente.

## Validación
- JavaScript sin errores.
- CSS sin errores.
- Sin IDs HTML duplicados.
- Sin referencias JavaScript inexistentes.
- Se conservan Calendario, Día, Semana, Tablero, Libros, Movimientos, Comentarios, recurrencias y periodos financieros.
