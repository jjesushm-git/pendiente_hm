# Mis Tareas — Versión 11.0.4.2.1 REPARADA

Corrección de publicación/caché sobre la 11.0.4.2:

- jjhm_reapair
- Conserva todas las funciones y datos de 11.0.4.2.
- El tema Esmeralda dorado se declara directamente en HTML para evitar una pantalla con estilos antiguos mientras carga JS.
- CSS, JS y manifest usan una versión en la URL para evitar archivos viejos de caché.
- Service Worker actualizado con caché mis-tareas-11-0-4-2-1.
- Los archivos principales usan red primero y caché solo como respaldo.
- El botón Actualizar aplicación limpia únicamente cachés antiguas; NO borra localStorage, tareas, libros ni gastos.
- Manifest actualizado a verde esmeralda / crema.
