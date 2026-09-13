# Mis Tareas — Versión 11.8.3

Base: Versión 11.8.2.2 ESTABLE.

## Balance personalizado
Debajo del Balance del día se agregó el botón **Personalizado**.

### Flujo
1. Toca **Personalizado**.
2. Se abre el modal **Balance personalizado**.
3. El modal muestra el periodo financiero permitido del libro activo.
4. Selecciona **Fecha inicio**.
5. Selecciona **Fecha fin**.
6. Toca **Ver balance**.
7. Se muestran todos los gastos e ingresos registrados dentro de ese rango y los totales correspondientes.

## Restricción de fechas
Las fechas personalizadas solo pueden elegirse dentro del periodo financiero que se está mostrando.

Ejemplo:
- Periodo financiero visible: 14/08/2026 – 13/09/2026.
- Puedes consultar 20/08/2026 – 05/09/2026.
- No puedes elegir 13/08/2026 ni 14/09/2026 desde ese periodo.

Si Fecha inicio queda después de Fecha fin, la interfaz corrige el otro campo para mantener un rango válido.

## Resultado
El título del modal es **Balance personalizado** y muestra:
- Fecha inicio.
- Fecha fin.
- Número de movimientos encontrados.
- Todos los gastos e ingresos del rango.
- Concepto.
- Descripción, cuando existe.
- Fecha del movimiento.
- Tarea relacionada, cuando existe.
- Gastos MN.
- Ingresos MN.
- Balance MN.
- Gastos/Ingresos/Balance DLS en su sección desplegable.

El cálculo usa únicamente el libro activo.

## Sin cambios en funciones existentes
Se conservan intactos:
- Balance normal por periodo financiero.
- Movimientos registrados.
- Bitácora.
- Tareas y recurrencias.
- Calendario y Semana.
- Libros.
- Papelera.
- Borrado cruzado tarea/movimiento de v11.8.2.2.

## Validación
Se validan JavaScript, CSS, IDs, referencias DOM y el cálculo de rangos personalizados.
