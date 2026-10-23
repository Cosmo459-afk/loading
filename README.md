# LOADING ARCADE 0.3

Aplicación estática HTML/CSS/JavaScript, sin compilación ni dependencias de producción.

## Novedades

- Ocho mascotas originales de aspecto facetado inspirado en PS1, dibujadas en SVG: Byte (perro), Glitch (gato), Save (foca), Pixel (pingüino), Combo (rana), Turbo (conejo), Reset (panda rojo) y Loop (pájaro). Son ilustraciones con volumen simulado, no modelos 3D animados ni personajes de terceros.
- Selector con nombres, estado accesible y vista previa. Dos columnas en teléfonos, cuatro desde 600 px. Sin ventajas competitivas.
- Foto opcional: JPG, PNG o WebP hasta 2 MB, recorte central a 192 × 192, compresión y opción de quitarla.
- Conservación de perfiles 0.2, XP, partidas y cromos; selección de hasta tres destacados con contador y estado accesible.
- Validación defensiva de datos locales y aviso si el navegador impide guardar.

Se conservan las trivias PS1/PS2, dificultad, partida rápida, experiencia, niveles, álbum, recompensas y compartir resultados. Las preguntas y los umbrales de XP no se modificaron.

## Desarrollo local

Desde `/workspace/loading`:

```sh
python -m http.server 8080 --bind 0.0.0.0
```

No requiere claves ni servicios externos. No crear otro checkout o worktree: utilizar el repositorio existente.

## Pruebas

La prueba de navegador utiliza Playwright para Python y Chromium del sistema (herramientas de desarrollo, no dependencias de la aplicación). Con el servidor iniciado:

```sh
python tests/smoke.py
```

Se pueden ajustar `ARCADE_URL` y `CHROMIUM_PATH`. Resultado de esta entrega: PASS en partidas invitado/jugador, ocho mascotas, migración de perfil 0.2, persistencia, límite de tres cromos, subida/eliminación/rechazo de foto y recompensas; sin errores JavaScript. Se comprobó ausencia de desbordamiento horizontal en seis pantallas a 320, 360, 390, 768 y 1280 px. Estas comprobaciones en Chromium no sustituyen una prueba real en iPhone/Instagram.

## Actualizar el Worker existente en Cloudflare

No se publicó esta versión. Reemplazar la versión pública requiere tu aprobación.

1. Descargar el ZIP y guardar una copia de la versión 0.2 y del despliegue activo para poder volver atrás.
2. En Cloudflare, entrar a **Workers & Pages** y abrir el Worker existente `loading-arcade`. Conservar nombre, dominio, rutas y bindings. No crear otro proyecto para sustituirlo.
3. Si el proyecto usa carga de archivos estáticos, usar `index.html` como archivo de entrada en la raíz de los assets y reemplazar el anterior. No subir el ZIP como si fuera una página HTML. La disponibilidad y el nombre de la acción de carga dependen del tipo de proyecto y del panel.
4. Si el despliegue anterior se hizo con Wrangler, reutilizar su configuración original (no está incluida en el ZIP 0.2). Copiar el nuevo `index.html` al directorio indicado por `assets.directory`, y revisar primero un despliegue de prueba con `npx wrangler deploy --dry-run`. Publicar con el procedimiento existente solo tras aprobarlo. Si el Worker sirve HTML desde código en lugar de assets, se necesita su archivo de entrada/configuración para actualizar ese formato; no reemplazarlo a ciegas.
5. Tras la publicación autorizada, abrir la misma URL pública, comprobar que el pie dice 0.3 y recorrer perfil, foto, trivia, álbum y recompensas. Ante problemas, restaurar el despliegue previo desde el historial del Worker.

Para probar la conservación del progreso, usar el mismo dominio, navegador y perfil que en 0.2: localStorage depende del origen. Una URL de prueba o una navegación privada no comparte esos datos.

## Límites actuales

Todo el progreso y las fotos se guardan exclusivamente en este navegador bajo `loading_arcade_profile`. Borrar datos del sitio elimina el progreso. No hay autenticación, Supabase, ranking global/semanal, sincronización, descuentos ni servidor antitrampas. Las mascotas podrán reutilizarse cuando se implemente el ranking; esta entrega no simula uno. Un invitado no guarda XP retroactivamente. Los cromos mantienen el arte conceptual con emojis de 0.2; no contienen ilustraciones oficiales. No se modificó la tienda ni se añadieron servicios de pago.
