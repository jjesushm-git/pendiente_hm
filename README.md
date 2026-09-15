# Mis Tareas — Versión 11.9.2

Base: v11.9.1.2 ESTABLE.

## Novedades principales

### 1. Sincronización de tareas PC ↔ celular

La aplicación puede sincronizar tareas entre dos o más dispositivos que usen la misma URL de Google Apps Script y la misma clave privada.

Ruta predeterminada en Google Drive:

`Mis_Tareas_respaldo/sincronizacion`

Apps Script crea dentro:

- `Mis_Tareas_Sync.json`
- `Mis_Tareas_MailState.json`

La sincronización:

- se intenta al abrir la app;
- se intenta al volver a la app;
- se intenta cuando regresa Internet;
- se programa después de guardar una tarea;
- se repite aproximadamente cada minuto mientras la app esté abierta;
- combina tareas por `id` y conserva la versión con `updatedAt` más reciente;
- sincroniza eliminaciones nuevas mediante marcas de borrado para que una tarea eliminada no reaparezca en el otro dispositivo;
- sincroniza también los libros necesarios para que las tareas mantengan su `bookId`.

Los gastos e ingresos no se sincronizan en esta versión; siguen respaldándose y exportándose como antes.

### 2. Recordatorios por correo por tarea

Al crear o editar una tarea aparece:

`✉️ Notificación por correo`

Las opciones solo se muestran cuando el switch está activo.

Opciones:

- En la hora que inicia.
- 15 minutos antes.
- 1 hora antes.
- 1 día antes.
- Personalizado: hora, minutos y A.M./P.M.

Las tareas completadas no generan correos de recordatorio.

Para tareas de todo el día, la hora de inicio usada para el correo es 9:00 A.M.

### 3. Correo de tarea no completada

En Ajustes existe:

`Avisar tareas no completadas`

Si está activo y una tarea entra al estado `No completada`, se programa un correo 15 minutos después.

Asunto aproximado:

`15/09/26 tarea no completada Pagar luz`

El cuerpo incluye recomendaciones amigables:

- si sí la realizaste pero olvidaste marcarla, puedes marcarla completada fuera de tiempo;
- si la harás otro día, puedes usar `Reabrir`;
- si ya no aplica, puedes editarla o eliminarla.

## Configuración de Ajustes

### Sincronización

Ruta:

`Ajustes > Sincronización`

Campos:

- Sincronización automática.
- Nombre de este dispositivo.
- Carpeta de sincronización.
- Sincronizar ahora.
- Estado de sincronización.

Ejemplos de nombre:

- `Celular Jesús`
- `PC Casa`

### Notificaciones por correo

Ruta:

`Ajustes > Notificaciones por correo`

Campos:

- Correo que recibirá los avisos.
- Correo activo por defecto en tareas nuevas.
- Recordatorio predeterminado.
- Avisar tareas no completadas.
- Enviar correo de prueba.

El switch de correo viene activo por defecto para tareas nuevas, pero puede apagarse individualmente en cada tarea.

Las tareas antiguas existentes antes de actualizar a v11.9.2 no se activan automáticamente para correo, para evitar enviar avisos no deseados.

# Configuración detallada de Google Apps Script

Se incluye por separado:

`Google_Drive_Mis_Tareas_v11_9_2.gs`

## Paso 1. Abre tu proyecto actual

Entra a `script.google.com` con la misma cuenta de Google Drive donde quieres guardar los respaldos y sincronización.

Puedes reutilizar el mismo proyecto que ya estabas usando para v11.9.x.

## Paso 2. Reemplaza Código.gs

Borra el contenido actual de `Código.gs` y pega todo el contenido de:

`Google_Drive_Mis_Tareas_v11_9_2.gs`

## Paso 3. Cambia BACKUP_SECRET

Busca:

```javascript
const BACKUP_SECRET = "CAMBIA_ESTA_CLAVE_POR_UNA_LARGA_Y_PRIVADA";
```

Cámbiala por una clave nueva y privada.

Ejemplo solamente:

```javascript
const BACKUP_SECRET = "MiClave_MisTareas_2026_X9m2R8K4";
```

No publiques esta clave en GitHub.

La clave que pongas aquí debe ser exactamente la misma que escribas en la app.

## Paso 4. Configura la zona horaria

En Google Apps Script abre:

`Configuración del proyecto`

Selecciona una zona horaria correspondiente a tu ubicación. Para el horario del centro de México se recomienda:

`America/Mexico_City`

Esto es importante para que los recordatorios de hora funcionen correctamente.

## Paso 5. Ejecuta setupMisTareas una vez

En la parte superior del editor selecciona la función:

`setupMisTareas`

Pulsa `Ejecutar`.

Google pedirá autorización adicional porque esta versión usa:

- Google Drive;
- MailApp para enviar correos;
- ScriptApp para crear el activador automático.

Autoriza con la cuenta que será dueña del sistema.

Al ejecutarse, la función:

- verifica o crea las carpetas;
- crea `Mis_Tareas_Sync.json`;
- crea `Mis_Tareas_MailState.json`;
- crea un activador para `processMisTareasMail` cada minuto.

## Paso 6. Verifica el activador

En el menú izquierdo de Apps Script abre `Activadores`.

Debe existir uno con:

- Función: `processMisTareasMail`
- Origen del evento: Basado en tiempo
- Frecuencia: cada minuto

No debes crear un activador por tarea. Solo se usa uno para revisar todas las tareas.

## Paso 7. Publica una nueva versión

Ve a:

`Implementar > Administrar implementaciones`

Edita tu Aplicación web actual.

Selecciona:

- Versión: `Nueva versión`
- Ejecutar como: `Yo`
- Quién tiene acceso: `Cualquier persona`

Pulsa `Implementar`.

Usa la URL que termina en:

`/exec`

No uses `/dev`.

## Paso 8. Configura la app

En Mis Tareas abre:

`Ajustes > Respaldo en nube`

Completa:

- URL de Google Apps Script: tu URL `/exec`.
- Clave privada: la misma `BACKUP_SECRET`.

Rutas recomendadas:

- Respaldos: `Mis_Tareas_respaldo/respaldos`
- Bitácora: `Mis_Tareas_respaldo/bitacora`
- Gastos: `Mis_Tareas_respaldo/gastos/personal`

Pulsa `Probar conexión`.

Debe mostrar `Conexión correcta`.

## Paso 9. Configura sincronización en el primer dispositivo

En el dispositivo que tenga la información más actualizada, por ejemplo el celular:

1. Abre `Ajustes > Sincronización`.
2. Activa `Sincronización automática`.
3. Nombre: `Celular`.
4. Carpeta: `Mis_Tareas_respaldo/sincronizacion`.
5. Guarda Ajustes.
6. Pulsa `Sincronizar ahora`.
7. Espera a que muestre `Sincronizado`.

## Paso 10. Configura el segundo dispositivo

En la PC:

1. Abre la misma app v11.9.2.
2. Configura la misma URL `/exec`.
3. Configura la misma `BACKUP_SECRET`.
4. Abre `Ajustes > Sincronización`.
5. Nombre: `PC`.
6. Usa `Mis_Tareas_respaldo/sincronizacion`.
7. Guarda.
8. Pulsa `Sincronizar ahora`.

Las tareas existentes en ambos equipos se combinan. Cuando la misma tarea fue modificada en ambos, gana la edición con fecha `updatedAt` más reciente.

## Paso 11. Configura correo

En:

`Ajustes > Notificaciones por correo`

Escribe el correo donde quieres recibir los avisos.

Recomendado:

- Correo activo por defecto en tareas nuevas: activado.
- Recordatorio predeterminado: 15 minutos antes.
- Avisar tareas no completadas: activado.

Guarda Ajustes.

Después pulsa:

`Enviar correo de prueba`

Debes recibir un mensaje con asunto:

`Prueba de notificaciones - Mis Tareas`

## Paso 12. Crea una tarea de prueba

Para comprobar el sistema:

1. Crea una tarea con hora de inicio unos minutos en el futuro.
2. Activa `Notificación por correo`.
3. Selecciona una opción adecuada, por ejemplo `En la hora que inicia`.
4. Guarda.
5. Pulsa `Sincronizar ahora` si quieres forzar el envío inmediato de la tarea al servidor.

El correo se procesa desde Google Apps Script, por lo que puede llegar aunque la PWA esté cerrada, siempre que la tarea ya haya sido sincronizada antes.

# Comportamiento importante

## Completadas

Una tarea con estado `Completada` no recibe correos.

## No completadas

Las tareas no recurrentes con fecha de vencimiento pueden pasar automáticamente a `No completada` cuando vence el tiempo. Apps Script también puede marcar este estado en la copia sincronizada aunque la PWA esté cerrada.

El aviso de no completada se calcula 15 minutos después de que se registró `missedAt`.

Si una tarea se marca manualmente como `No completada`, v11.9.2 también guarda `missedAt` para que pueda recibir el correo correspondiente.

## Tareas recurrentes

Los recordatorios previos al inicio funcionan para recurrencias diaria, semanal, mensual y anual mientras la tarea permanezca pendiente.

El correo de `No completada` depende de que la tarea esté realmente en estado `missed`. La app mantiene su comportamiento actual de recurrencias para no romper las series existentes.

## Internet

La sincronización de dispositivos requiere Internet.

Los correos no dependen de que el celular o PC permanezcan abiertos una vez que la tarea ya fue sincronizada con Apps Script.

# Límites de Google

Google Apps Script impone cuotas de correo y activadores. Una cuenta personal de Gmail suele tener una cuota menor que una cuenta de Google Workspace. La aplicación utiliza un solo activador por minuto y evita crear un activador distinto para cada tarea.

# Archivos para GitHub

El ZIP de GitHub contiene exactamente:

- `README.md`
- `app.js`
- `icon.svg`
- `index.html`
- `manifest.webmanifest`
- `styles.css`
- `sw.js`

El archivo `.gs` se configura en Google Apps Script y no se sube al repositorio público porque contiene tu configuración privada de servidor.
