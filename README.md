# Mis Tareas — Versión 11.9.2.1

Base: v11.9.2 ESTABLE.

## Corrección principal: sincronización PC ↔ celular

La v11.9.2 podía subir correctamente las tareas a Google Drive, pero algunos navegadores móviles fallaban al hacer la segunda petición `sync_pull`.

La v11.9.2.1 elimina esa dependencia.

Ahora el flujo es:

```text
PC o celular
   ↓
envía sus cambios a Apps Script
   ↓
Apps Script combina tareas por updatedAt
   ↓
actualiza Mis_Tareas_Sync.json
   ↓
la MISMA respuesta de status devuelve el estado combinado
   ↓
la app actualiza sus tareas y libros
```

No se hace una segunda descarga independiente para completar la sincronización.

## Se conserva sin cambios

- Recordatorios por correo.
- Avisos 15 minutos antes, 1 hora antes, 1 día antes, al inicio y personalizados.
- Aviso de tarea no completada.
- Activador `processMisTareasMail`.
- Correo de prueba.
- Respaldo automático diario.
- Exportaciones a Google Drive.
- Balance personalizado.
- Libros, gastos e ingresos.
- Borrado cruzado tarea/movimiento.
- Calendario, Día, Semana y Tablero.

## Google Drive

Se siguen usando:

```text
Mis_Tareas_respaldo/
├── bitacora/
├── gastos/
│   └── personal/
├── respaldos/
└── sincronizacion/
    ├── Mis_Tareas_Sync.json
    └── Mis_Tareas_MailState.json
```

## Actualización necesaria

Para esta corrección debes actualizar DOS partes:

### 1. GitHub

Reemplaza los 7 archivos del ZIP:

- README.md
- app.js
- icon.svg
- index.html
- manifest.webmanifest
- styles.css
- sw.js

### 2. Google Apps Script

Reemplaza `Código.gs` por:

`Google_Drive_Mis_Tareas_v11_9_2_1.gs`

Conserva tu propia clave en:

```javascript
const BACKUP_SECRET = "TU_CLAVE_PRIVADA";
```

Después:

1. Guarda.
2. Ve a `Implementar > Administrar implementaciones`.
3. Edita la aplicación web.
4. Selecciona `Nueva versión`.
5. Ejecutar como: `Yo`.
6. Acceso: `Cualquier persona`.
7. Pulsa `Implementar`.
8. Conserva o copia la URL `/exec`.

No necesitas volver a crear el activador si ya existe `processMisTareasMail` cada minuto.

## Prueba recomendada

1. En PC crea una tarea llamada `PRUEBA SYNC PC`.
2. Pulsa `Sincronizar ahora`.
3. En celular pulsa `Sincronizar ahora`.
4. La tarea debe aparecer en el celular.
5. En celular cambia el título a `PRUEBA SYNC CELULAR`.
6. Sincroniza celular.
7. Sincroniza PC.
8. El nuevo título debe aparecer en PC.

La modificación más reciente gana mediante `updatedAt`.

## Nota técnica

El estado sincronizado se lee desde `Mis_Tareas_Sync.json` cuando la PWA consulta el mismo endpoint `status` que ya se usa para confirmar operaciones con Apps Script. Esto evita el fallo móvil observado con la petición separada `sync_pull`.
