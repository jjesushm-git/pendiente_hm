# Mis Tareas — Versión 11.8.2.2

Base: Versión 11.8.2.1 ESTABLE.

## Corrección: botón “Borrar ambos”
Se corrigió el ciclo del modal de confirmación utilizado cuando existen dos confirmaciones consecutivas.

### Problema detectado
Al confirmar primero “Eliminar tarea” o “Borrar movimiento”, el mismo cuadro de confirmación se reutilizaba inmediatamente para preguntar si también debía borrarse el elemento vinculado.

El evento `close` del primer cuadro podía llegar cuando la segunda confirmación ya estaba activa. Eso hacía que la segunda confirmación se interpretara como cancelada y el botón “Borrar ambos” no ejecutara la acción.

### Solución
La confirmación ahora:
- espera a que el cuadro termine realmente de cerrarse;
- solo después resuelve la primera decisión;
- la segunda confirmación se abre en un ciclo nuevo;
- un evento `close` anterior ya no puede cancelar el siguiente cuadro.

## Comportamiento esperado
### Borrar tarea con movimiento
- Eliminar tarea → segunda pregunta.
- Borrar ambos → tarea a Papelera + movimiento eliminado.
- Conservar movimiento → tarea a Papelera + movimiento permanece.

### Borrar movimiento vinculado
- Borrar movimiento → segunda pregunta.
- Borrar ambos → movimiento eliminado + tarea a Papelera.
- Conservar tarea → movimiento eliminado + tarea permanece.

No se modificaron las tarjetas compactas ni las demás funciones de la versión 11.8.2.1.


## Prueba funcional realizada
Se probó el comportamiento con un cierre de modal asíncrono, que reproduce el problema de dos confirmaciones consecutivas.

Resultados:
- Tarea + Borrar ambos → tarea a Papelera y movimiento eliminado.
- Tarea + Conservar movimiento → tarea a Papelera y movimiento permanece.
- Movimiento + Borrar ambos → movimiento eliminado y tarea a Papelera.
- Movimiento + Conservar tarea → movimiento eliminado y tarea permanece.

Los cuatro escenarios finalizaron correctamente.
