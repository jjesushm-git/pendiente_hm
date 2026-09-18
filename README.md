# Mis Tareas — Versión 11.9.2.2

Base: v11.9.2.1 ESTABLE.

## Cambios de esta versión

### Copiar tarea
El botón **Copiar** ya no aparece dentro de Recurrencia. Ahora se encuentra en el menú de tres rayitas de la tarjeta expandida, junto a Editar / Reabrir / Eliminar.

### Zoom móvil
Se fija la escala de la PWA para evitar que una pinza accidental cambie el tamaño de la interfaz.

### Calendario
Pendientes, Completadas y Vencidas/No completadas ahora corresponden al **mes completo mostrado**. Al cambiar de mes, los contadores y listas cambian al nuevo mes.

### Semana
Pendientes, Completadas y Vencidas/No completadas corresponden a los **7 días de la semana mostrada**. Se agrega la sección de Pendientes que faltaba.

### Día y Tablero
Se conserva el comportamiento existente.

### Sincronización
Se agrega **Actualizar sincronización**.

- En PC: úsalo para traer a la PC los cambios más recientes hechos en el celular sin forzar una subida previa.
- En celular: con sincronización automática activada, la app consulta aproximadamente cada 30 segundos los cambios hechos desde PC, además de hacerlo al volver a la app.
- Los cambios locales siguen subiendo automáticamente al guardar.
- El estado muestra la fecha/hora de la última sincronización y el dispositivo de origen registrado por la nube.

## Apps Script
Esta versión agrega la acción `sync_read`, por lo que debes reemplazar también `Código.gs` por `Google_Drive_Mis_Tareas_v11_9_2_2.gs` y publicar **Nueva versión** de la Aplicación web.

No necesitas volver a crear el activador de correo si `processMisTareasMail` ya existe cada minuto.

## Archivos de GitHub
El ZIP contiene exactamente:

- README.md
- app.js
- icon.svg
- index.html
- manifest.webmanifest
- styles.css
- sw.js
