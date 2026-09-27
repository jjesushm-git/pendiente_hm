# Mis Tareas — Versión 12.0.0

Base: v11.9.2.3.

## Nueva función: Listas

El botón central `+ Agregar` fue reemplazado por **☑ Listas**.

Las listas son globales: no pertenecen a un libro. Por eso se muestran iguales aunque cambies de Libro.

### Flujo
- `Listas` abre la pantalla de listas.
- `Nueva lista` permite elegir fecha, título, emoticono y pendientes con casillas.
- Al pulsar Enter en un pendiente aparece otro renglón.
- Guardar muestra la lista en formato compacto.
- Al tocar una tarjeta se abre la lista completa.
- Al marcar una casilla, el texto queda tachado.
- Cuando todas las casillas están marcadas, la lista pasa a **Listas finalizadas**.
- Desde el menú ☰ se puede Editar, Copiar, Borrar y, cuando está finalizada, Reabrir.
- `Mostrar todas` enseña todas las listas pendientes ordenadas desde la fecha más antigua a la más reciente.
- Sin `Mostrar todas`, solo aparecen las listas de la fecha seleccionada.

## Respaldo y sincronización
Las listas se incluyen en:
- respaldo manual;
- respaldo automático diario;
- importación de respaldo;
- sincronización PC ↔ celular.

Las listas finalizadas se conservan 30 días. Cuando existe conexión con Google Drive, después de 30 días se crea un JSON en la carpeta configurada de **Bitácora** y solo después de confirmar ese respaldo se elimina la lista de la app.

## Archivos GitHub
Reemplaza exactamente estos 7 archivos:
- README.md
- app.js
- icon.svg
- index.html
- manifest.webmanifest
- styles.css
- sw.js

## Google Apps Script
Para que las listas también se sincronicen entre dispositivos, actualiza `Código.gs` con `Google_Drive_Mis_Tareas_v12_0_0.gs` y publica una **Nueva versión** de la Aplicación web.

Conserva tu propia `BACKUP_SECRET`.
