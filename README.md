# Mis Tareas - Web móvil

Aplicación web estática/PWA para seguimiento de tareas.

## Incluye
- Tareas pendientes ordenadas por vencimiento.
- Marcar completadas.
- Paso automático a "No completadas" al vencer.
- Fecha de inicio y vencimiento.
- Todo el día u hora específica.
- Descripción larga y comentario.
- Recurrencia diaria, semanal, mensual y anual.
- Vista Día, Calendario, Semana y Gantt.
- Papelera de reciclaje durante 24 horas, con restauración y eliminación definitiva automática.
- Respaldo JSON e importación.
- Almacenamiento local del navegador.
- Instalación como PWA.
- Recordatorios locales mientras la web/app permanece activa.

## Cómo probar
Opción rápida:
1. Abre la carpeta con VS Code.
2. Usa una extensión de servidor local como Live Server.
3. Abre `index.html` desde el servidor.

También puedes publicar gratis la carpeta en GitHub Pages, Cloudflare Pages o similar.

## Importante sobre notificaciones
Los navegadores móviles no permiten garantizar temporizadores JavaScript cuando una web está totalmente cerrada.
Para notificaciones confiables aun con la aplicación cerrada se necesita implementar Web Push con un backend/servicio de push.
