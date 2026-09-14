# Mis Tareas — Versión 11.9.1.2

Base: v11.9.1.1 ESTABLE.

## Cambio principal

El botón `Probar conexión` ahora siempre muestra un estado visible:

- `⏳ En espera` antes de probar.
- `⏳ Verificando...` mientras se comprueba la conexión.
- `✅ Conexión correcta` cuando Apps Script y Google Drive responden.
- `⚠️ Pendiente: ...` cuando hay un problema.

La prueba distingue entre:

- URL faltante.
- Clave privada faltante.
- Aplicación web que requiere inicio de sesión.
- Clave privada incorrecta.
- Apps Script sin la versión nueva publicada.
- Falta de respuesta.

## Corrección automática de URL duplicada

Si accidentalmente pegas:

`https://script.google.com/.../exechttps://script.google.com/.../exec`

la aplicación extrae automáticamente la primera URL válida terminada en `/exec`.

## Configuración correcta de Apps Script

En Google Apps Script:

1. Reemplaza Código.gs por `Google_Drive_Mis_Tareas_v11_9_1_2.gs`.
2. Cambia `BACKUP_SECRET` por tu clave privada.
3. Guarda.
4. Ve a Implementar > Administrar implementaciones.
5. Edita la Aplicación web.
6. Selecciona Nueva versión.
7. Ejecutar como: Yo.
8. Acceso: Cualquier persona.
9. Implementa.
10. Copia la URL que termina en `/exec`.

Después, en Mis Tareas:

- pega solo una URL `/exec`;
- escribe la misma clave;
- pulsa `Probar conexión`.

## Rutas

- Respaldos: `Mis_Tareas_respaldo/respaldos`
- Bitácora: `Mis_Tareas_respaldo/bitacora`
- Gastos: `Mis_Tareas_respaldo/gastos/personal`

## Importante

Si al abrir la URL `/exec` en un navegador Google obliga a iniciar sesión, la PWA no podrá usarla automáticamente. Debes revisar la publicación de Apps Script y dejar el acceso permitido para `Cualquier persona`.

## GitHub

El ZIP contiene exactamente:

- README.md
- app.js
- icon.svg
- index.html
- manifest.webmanifest
- styles.css
- sw.js
