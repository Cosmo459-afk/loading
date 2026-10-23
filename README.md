# LOADING ARCADE 0.4 — cuentas y partidas

Versión de desarrollo con Supabase. **No se publicó en Cloudflare.** La versión 0.3 se conserva en `loading-arcade-v03.zip`.

## Qué incluye

- Inicio y registro por enlace al correo, mediante Supabase Auth y PKCE. El enlace debe abrirse en el mismo navegador donde se pidió.
- Perfil, ocho mascotas originales, foto opcional comprimida y tres cromos destacados guardados en la cuenta.
- Partidas de cinco preguntas seleccionadas por el servidor; puntuación y XP calculados en PostgreSQL, sin aceptar puntos enviados por el cliente.
- Explicaciones al terminar la partida, historial de las últimas 20 partidas y reintento de un guardado pendiente sin sumar XP dos veces.
- Invitados sin registro: trivia rápida sin guardar XP. Los datos locales de 0.3 se conservan pero no se convierten en progreso competitivo.

Las fotos pequeñas se guardan en el perfil privado como imagen comprimida; no se creó un bucket público. El ranking global, Google, Supabase Storage y la importación de documentación quedan pendientes. El cálculo en servidor no elimina todas las trampas: el contenido original ya era público y todavía falta protección adicional contra automatización.

## Configuración de Supabase: paso pendiente del propietario

El propietario confirmó que `supabase/setup.sql` terminó con 20 preguntas. **No volver a ejecutarlo** en ese mismo proyecto.

En **Authentication → URL Configuration**:

- **Site URL:** `https://loading-arcade.tienda-somosloading.workers.dev/`
- **Redirect URLs:** añadir exactamente `https://loading-arcade.tienda-somosloading.workers.dev/` y guardar.
- Si se prueba localmente, añadir además `http://localhost:8080/` o `http://127.0.0.1:8080/`, según la dirección utilizada. No añadir comodines amplios.

Authentication por correo está habilitado según la API real. La entrega de email todavía no se probó. El servicio de correo incluido en Supabase tiene restricciones para pruebas; antes de abrir el registro a muchos jugadores, revisar los destinatarios/límites vigentes y configurar un proveedor SMTP adecuado. La interfaz muestra un mensaje genérico si se rechaza el envío.

No se necesita service_role ni contraseña de base de datos en la web. `src/config.js` contiene solo la URL y la clave publicable. La seguridad depende de las políticas y funciones de la base de datos.

## Archivos para publicar, tras aprobación

- **`dist/index.html`:** aplicación completa en un solo HTML, con SDK incluido; no depende de CDN. Usar este archivo como `index.html` del sitio.
- **`loading-arcade-v04.zip`:** contiene ese HTML, estas instrucciones y las licencias de terceros.
- `index.html` en la raíz es el archivo fuente y carga `assets/cloud.bundle.js`; no copiarlo solo a Cloudflare.

Abrir desde un servidor HTTP/HTTPS. No probar Auth abriendo el HTML como `file://`.

## Desarrollo y construcción

Node >=22, npm y Python 3. Desde el checkout existente `/workspace/loading`:

```sh
npm ci
npm run build
python -m http.server 8080 --bind 0.0.0.0
```

`npm run build` genera el bundle y `dist/index.html`. Los archivos generados están incluidos para que el propietario no necesite instalar Node. Cada tarea de nube ya está aislada: usar este checkout; no crear worktrees salvo pedido explícito.

## Pruebas

Con el servidor estático en ejecución y Playwright para Python/Chromium del sistema disponibles:

```sh
python tests/smoke.py
npm ci --prefix supabase
npm run test:database
```

Para la integración completa local, iniciar en otra terminal:

```sh
npm run test:fixture
```

Luego:

```sh
npm run test:browser
```

La fixture es exclusivamente de pruebas: combina PostgreSQL local (PGlite), usuarios ficticios y Auth simulado. Reinicia sus datos con cada ejecución de `tests/cloud.py`. Nunca desplegar esa fixture. El navegador usa el SDK real y los RPC SQL reales, interceptando la red hacia la fixture; no envía correos reales ni escribe en el proyecto de producción.

Comprobaciones realizadas: seis combinaciones de consola/dificultad para invitado; solicitud de enlace y callback PKCE con Auth simulado; perfil, las ocho mascotas y foto; aislamiento entre dos usuarios; puntuación del servidor, revisión, historial, cromos destacados y lectura desde otro contexto de navegador. Se simuló una partida guardada cuya respuesta de red falla: recargar y reintentar conservó un único premio de XP. Se comprobó la versión de un solo HTML y ausencia de desbordamiento en 48 combinaciones de pantalla/ancho.

Comprobación remota sin sesión: Auth por correo habilitado y acceso anónimo a las tablas privadas rechazado. **Pendiente:** recibir un enlace real, entrar con una cuenta real, jugar desde dos dispositivos y comprobar persistencia en el proyecto Supabase real. No se afirma validación completa de producción.

## Actualizar el Worker existente en Cloudflare

1. Aprobar la publicación de 0.4 y guardar el despliegue actual para poder volver atrás.
2. En **Workers & Pages**, abrir el Worker existente `loading-arcade`. Conservar nombre, dominio, rutas y bindings.
3. Si se usa carga de archivos estáticos, sustituir el `index.html` anterior por **`dist/index.html`**. Si se usa Wrangler, reutilizar su configuración original y copiar ese archivo a `assets.directory`; revisar un `npx wrangler deploy --dry-run` antes de publicar. La configuración de ese Worker no vino en el ZIP original: no inventar un archivo de entrada ni sustituir un Worker con código por uno de assets a ciegas.
4. Subir únicamente los archivos de la entrega estática. No publicar `supabase/`, tests, node_modules ni código de la fixture.
5. Con las URL de Auth guardadas, abrir el sitio, comprobar el pie **Versión 0.4**, entrar con el correo del propietario y completar una partida. Revisar en Supabase **Authentication → Users** y **Table Editor → arcade_profiles / arcade_games** que aparezcan la cuenta y su partida.
6. Cerrar y volver a abrir sesión; comprobar desde otro dispositivo. Confirmar que invitado no suma XP y que cerrar sesión oculta los datos de la cuenta.

No actualizar la versión pública automáticamente. Si se restaura 0.3, el progreso en Supabase permanece en la base de datos, aunque 0.3 no puede consultarlo.
