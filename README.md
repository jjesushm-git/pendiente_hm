# Mis Tareas — Versión 11.9.1

Base: Versión 11.9 ESTABLE.

## Google Drive configurado para tu estructura

La aplicación usa estas rutas desde la raíz de "Mi unidad":

- Respaldos: `Mis_Tareas_respaldo/respaldos`
- Bitácora: `Mis_Tareas_respaldo/bitacora`
- Gastos del libro Personal: `Mis_Tareas_respaldo/gastos/personal`

No debes escribir `raiz/`.

La estructura queda:

```text
Mi unidad
└── Mis_Tareas_respaldo
    ├── bitacora
    ├── gastos
    │   └── personal
    └── respaldos
```

Si alguna carpeta no existe, Google Apps Script puede crearla automáticamente.

## Respaldo automático diario

Cuando activas "Respaldo automático diario":

1. Abres la app.
2. La app revisa si ya hay un respaldo confirmado para hoy.
3. Si todavía no existe, crea el JSON completo.
4. Lo envía a `Mis_Tareas_respaldo/respaldos`.
5. Solo después de que Google Drive confirma el archivo, se marca el día como respaldado.
6. Si no hay Internet, queda pendiente y se vuelve a intentar cuando regrese la conexión o abras nuevamente la app.

Nombre:

`Mis_Tareas_Auto_AAAA-MM-DD.json`

## Respaldos manuales

"Respaldar ahora" permite:

- Google Drive.
- Descargar al dispositivo.
- Google Drive + dispositivo.

La ruta predeterminada de Drive es:

`Mis_Tareas_respaldo/respaldos`

Puedes cambiar la ruta manualmente antes de guardar.

## Exportar movimientos TXT o CSV

Las exportaciones del periodo financiero ahora preguntan dónde guardar:

- Google Drive.
- Dispositivo.
- Ambos.

La ruta predeterminada de Drive es:

`Mis_Tareas_respaldo/gastos/personal`

## Exportar Bitácora

Cuando seleccionas uno o más periodos en Bitácora y pulsas "Exportar / Drive", también puedes elegir:

- Google Drive.
- Dispositivo.
- Ambos.

La ruta predeterminada es:

`Mis_Tareas_respaldo/bitacora`

Los archivos de Bitácora ahora usan el prefijo:

`bitacora_`

para identificarlos fácilmente.

## Configuración paso a paso

### 1. Revisa las carpetas de Drive

En "Mi unidad" confirma:

```text
Mis_Tareas_respaldo
├── bitacora
├── gastos
│   └── personal
└── respaldos
```

Evita tener dos carpetas distintas con el mismo nombre `Mis_Tareas_respaldo` en la raíz, porque el script utilizará la primera coincidencia.

### 2. Abre Google Apps Script

Entra a:

`https://script.google.com`

con la MISMA cuenta de Google Drive donde están las carpetas.

Crea un "Proyecto nuevo".

### 3. Copia el archivo del servidor

Abre el archivo separado:

`Google_Drive_Mis_Tareas_v11_9_1.gs`

Copia todo su contenido y pégalo en `Código.gs` dentro de Apps Script.

### 4. Crea una clave privada

Busca al inicio del script:

```javascript
const BACKUP_SECRET = "CAMBIA_ESTA_CLAVE_POR_UNA_LARGA_Y_PRIVADA";
```

Cámbiala, por ejemplo:

```javascript
const BACKUP_SECRET = "MiTareas_2026_X7p9K4m2_A1b8";
```

Usa una clave más difícil que el ejemplo.

Guárdala porque deberás poner exactamente la misma en Mis Tareas.

No escribas esta clave dentro de GitHub.

### 5. Guarda el proyecto

Pulsa Guardar.

Puedes ponerle como nombre:

`Mis Tareas - Respaldo Drive`

### 6. Publica como Aplicación web

En Apps Script:

1. Pulsa `Implementar`.
2. Pulsa `Nueva implementación`.
3. En "Seleccionar tipo", elige `Aplicación web`.
4. Descripción: `Mis Tareas v11.9.1`.
5. Ejecutar como: `Yo`.
6. Quién tiene acceso: `Cualquier persona`.
7. Pulsa `Implementar`.

Google puede pedir autorización para usar Drive. Debes autorizar el script con la cuenta dueña de las carpetas.

Copia la URL de la Aplicación web. Debe terminar en:

`/exec`

No uses la URL de prueba que termina en `/dev`.

### 7. Configura Mis Tareas

Abre:

`Ajustes > Respaldo en nube`

Completa:

**URL de Google Apps Script**

Pega la URL `/exec`.

**Clave privada**

Escribe exactamente la misma clave de `BACKUP_SECRET`.

**Carpeta de respaldos**

`Mis_Tareas_respaldo/respaldos`

**Carpeta de Bitácora**

`Mis_Tareas_respaldo/bitacora`

**Carpeta de gastos**

`Mis_Tareas_respaldo/gastos/personal`

**Respaldos automáticos a conservar**

Recomendado: `30 días`.

### 8. Prueba la conexión

Pulsa:

`Probar conexión`

Debe aparecer un mensaje indicando conexión correcta.

Si da error:

- revisa que la URL termine en `/exec`;
- revisa que la clave sea exactamente igual;
- revisa que desplegaste como Aplicación web;
- revisa que se ejecute como "Yo";
- revisa el acceso de la implementación;
- confirma que autorizaste Google Drive.

### 9. Activa el respaldo diario

Activa:

`Respaldo automático diario`

y pulsa Guardar.

Desde ese momento la primera apertura útil de cada día intentará guardar el respaldo.

## Actualizar Apps Script en el futuro

Si cambias el código `.gs`:

1. Pega la nueva versión en Apps Script.
2. Guarda.
3. Ve a `Implementar > Administrar implementaciones`.
4. Edita la implementación.
5. Selecciona `Nueva versión`.
6. Pulsa `Implementar`.

Normalmente puedes conservar la misma URL `/exec`.

## Seguridad

- Tu contraseña de Google nunca se escribe en Mis Tareas.
- La URL y la clave de nube se guardan localmente en el dispositivo.
- La clave no se incluye en los JSON de respaldo.
- No publiques `BACKUP_SECRET` en tu repositorio GitHub.
- Si alguien conoce la clave, cámbiala en Apps Script y también en la app.
- El Apps Script se ejecuta bajo tu cuenta y escribe en tu Drive.

## Archivos de GitHub

El ZIP de GitHub contiene exactamente:

- README.md
- app.js
- icon.svg
- index.html
- manifest.webmanifest
- styles.css
- sw.js

El archivo `.gs` se configura en Google Apps Script; no es necesario subirlo a GitHub para que la PWA funcione.
