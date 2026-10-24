# LOADING ARCADE 0.6 — trivias y progreso por dificultad

Versión de desarrollo con Supabase. **La 0.6 no se publicó en Cloudflare ni se aplicó su actualización SQL al proyecto remoto.** El propietario publicó 0.4 y confirmó que pudo registrarse, jugar y ver el perfil y la partida en Supabase. Las entregas 0.3, 0.4 y 0.5 se conservan en sus ZIP originales.

## Nuevo en 0.6

- Consolas PS1 y PS2 con Fácil, Medio y Difícil. Cada combinación muestra su total real y las trivias únicas que el jugador terminó.
- Catálogo de trivias con identidad estable, cinco preguntas por trivia, selector y marca de completada. Terminar cuenta incluso con cero aciertos; repetir o reenviar no incrementa el contador. No es necesario aprobar con una nota mínima.
- Los veinte enunciados originales forman **cuatro trivias reales**: una fácil y una difícil por consola. Medio muestra cero disponibles/próximamente; no se inventó contenido para llenar el nivel. Las antiguas preguntas Normal se clasifican como Fácil en este catálogo y las Experto como Difícil.
- Las partidas aleatorias anteriores conservan XP e historial, pero no completan retroactivamente una trivia que no existía. El Mix retro queda como modo libre sin contador de consola.
- Invitados mantienen la partida rápida libre (fácil/difícil) sin progreso persistente; para completar el catálogo se necesita un jugador, que puede ser temporal sin correo.
- El contador depende del catálogo publicado: si incorporamos 16 trivias fáciles de PS1, mostrará 0/16, 1/16, etc. Cada trivia tiene cinco preguntas; 16 trivias requieren 80 posiciones de preguntas. Las nuevas trivias del servidor aparecen sin recompilar el cliente; no cambiar la identidad/contenido de una trivia publicada, crear otra para contenido nuevo.

## Antes de instalar 0.6

1. El propietario ya ejecutó `supabase/setup.sql` para 0.4. **No volver a ejecutarlo.**
2. En Supabase **SQL Editor → New query**, ejecutar completo **`supabase/upgrade-v06.sql`**, una sola vez. Es una actualización adicional: agrega catálogo, relación de preguntas, referencia opcional en partidas y funciones de listado/inicio. No borra perfiles, XP, cromos ni partidas previas. Si detecta objetos existentes se detiene, no los reemplaza a ciegas.
3. El resultado esperado son cuatro filas: PS1 fácil 1, PS1 difícil 1, PS2 fácil 1, PS2 difícil 1 (los identificadores técnicos son `easy` y `hard`). Medio tiene cero porque todavía no hay contenido.
4. Si hay un error, compartirlo antes de ejecutar partes o repetir el script. Probar y autorizar la publicación del HTML solo después de aplicar esta actualización. Sin ella el cliente muestra error de catálogo y no inicia trivias de jugador.

## Funcionalidades conservadas

- Crear jugador sin pedir correo, con una identidad anónima de Supabase Auth y sus datos privados. La partida rápida sin identidad sigue disponible.
- Inicio personalizado al restaurar sesión: apodo, avatar, nivel, XP, partidas, cromos y próxima recompensa; accesos directos a jugar, perfil, historial y álbum. No vuelve a ofrecer registrarse a quien ya inició sesión.
- Después de tres partidas o un día desde la creación, recordatorio opcional para vincular correo. Se puede posponer 24 horas y seguir jugando. La aplicación no programa eliminaciones ni fechas de caducidad.
- Vincular correo conserva la identidad y sus puntos. El enlace debe abrirse en el mismo navegador donde se pidió. Las cuentas por correo de 0.4 mantienen su acceso.
- Perfil, ocho mascotas originales, foto opcional comprimida y tres cromos destacados guardados en la cuenta.
- Partidas de cinco preguntas seleccionadas por el servidor; puntuación y XP calculados en PostgreSQL, sin aceptar puntos enviados por el cliente.
- Explicaciones al terminar la partida, historial de las últimas 20 partidas y reintento de un guardado pendiente sin sumar XP dos veces.
- Invitados sin registro: trivia rápida sin guardar XP. Los datos locales de 0.3 se conservan pero no se convierten en progreso competitivo.

Las fotos pequeñas se guardan en el perfil privado como imagen comprimida; no se creó un bucket público. El ranking global, Google, Supabase Storage y la importación de documentación quedan pendientes. El cálculo en servidor no elimina todas las trampas: el contenido original ya era público y todavía falta protección adicional contra automatización.

## Configuración de Supabase: paso pendiente del propietario

El propietario confirmó que `supabase/setup.sql` terminó con 20 preguntas. **No volver a ejecutarlo** en ese mismo proyecto.

En **Authentication → Sign In / Providers**, buscar **User Signups → Allow anonymous sign-ins**, activarlo y guardar. En la comprobación previa estaba desactivado. No desactivar Confirm email: los jugadores anónimos no necesitan correo; la verificación solo se utiliza si deciden vincularlo.

En **Authentication → URL Configuration** (ya configurado por el propietario para 0.4):

- **Site URL:** `https://loading-arcade.tienda-somosloading.workers.dev/`
- **Redirect URLs:** añadir exactamente `https://loading-arcade.tienda-somosloading.workers.dev/` y guardar.
- Si se prueba localmente, añadir además `http://localhost:8080/` o `http://127.0.0.1:8080/`, según la dirección utilizada. No añadir comodines amplios.

Authentication por correo está habilitado según la API real. El propietario confirmó el registro real por correo en 0.4. La creación anónima y la vinculación posterior de 0.5 todavía necesitan prueba con el proyecto real. El servicio de correo incluido en Supabase tiene restricciones para pruebas; antes de abrir el registro a muchos jugadores, revisar los destinatarios/límites vigentes y configurar un proveedor SMTP adecuado. La interfaz muestra un mensaje genérico si se rechaza el envío.

No se necesita service_role ni contraseña de base de datos en la web. `src/config.js` contiene solo la URL y la clave publicable. La seguridad depende de las políticas y funciones de la base de datos.

## Archivos para publicar, tras aprobación

- **`dist/index.html`:** aplicación completa en un solo HTML, con SDK incluido; no depende de CDN. Usar este archivo como `index.html` del sitio.
- **`loading-arcade-v06.zip`:** contiene ese HTML, estas instrucciones y las licencias de terceros.
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

Comprobaciones realizadas: migración adicional con preservación de XP, catálogo de cuatro trivias, progreso separado entre jugadores, partidas abandonadas, cero aciertos, repetición y reintentos sin duplicar completadas, nivel medio vacío; inicio personalizado, sesión restaurada, fallos de carga sin ofrecer registro de nuevo, registro anónimo sin correo, recordatorio y posposición persistente, vinculación simulada sin cambiar de identidad; seis combinaciones de consola/dificultad para invitado; solicitud de enlace y callback PKCE con Auth simulado; perfil, las ocho mascotas y foto; aislamiento entre dos usuarios; puntuación del servidor, revisión, historial, cromos destacados y lectura desde otro contexto de navegador. Se simuló una partida guardada cuya respuesta de red falla: recargar y reintentar conservó un único premio de XP. Se comprobó la versión de un solo HTML y ausencia de desbordamiento en 48 combinaciones de pantalla/ancho.

Comprobación remota sin sesión: Auth por correo habilitado, Anonymous Sign-ins desactivado y acceso sin identidad a las tablas privadas rechazado. El propietario confirmó registro y guardado real de 0.4. **Pendiente en 0.5:** habilitar Anonymous Sign-ins, crear un jugador sin correo, vincularlo y recuperar sus datos desde otro dispositivo. También falta aplicar `upgrade-v06.sql` y comprobar 0/1 → 1/1 en el proyecto remoto. No se afirma validación completa de producción para este flujo nuevo.

Un jugador temporal tiene sus datos en Supabase, pero la sesión para acceder queda en ese navegador. Cerrar sesión, borrar los datos o cambiar de dispositivo puede dejarlo sin acceso si no vinculó su correo. No se borran sus datos al cumplir un plazo. Si un correo ya pertenece a una cuenta anterior, no se fusionan automáticamente los progresos; es mejor elegir YA TENGO CUENTA desde el inicio. Antes de abrir el registro anónimo a gran escala, integrar CAPTCHA y revisar los límites de Auth para evitar altas automatizadas.

## Actualizar el Worker existente en Cloudflare

1. Aprobar la publicación de 0.6 y guardar el despliegue actual para poder volver atrás.
2. En **Workers & Pages**, abrir el Worker existente `loading-arcade`. Conservar nombre, dominio, rutas y bindings.
3. Si se usa carga de archivos estáticos, sustituir el `index.html` anterior por **`dist/index.html`**. Si se usa Wrangler, reutilizar su configuración original y copiar ese archivo a `assets.directory`; revisar un `npx wrangler deploy --dry-run` antes de publicar. La configuración de ese Worker no vino en el ZIP original: no inventar un archivo de entrada ni sustituir un Worker con código por uno de assets a ciegas.
4. Subir únicamente los archivos de la entrega estática. No publicar `supabase/`, tests, node_modules ni código de la fixture.
5. Con las URL de Auth guardadas, abrir el sitio, comprobar el pie **Versión 0.6**, entrar con el correo del propietario y completar una partida. Revisar en Supabase **Authentication → Users** y **Table Editor → arcade_profiles / arcade_games** que aparezcan la cuenta y su partida.
6. En 0.6 probar CREAR MI JUGADOR sin correo, completar una partida y recargar: el inicio debe reconocerlo. Vincular un correo nuevo desde el resumen, confirmar el enlace en el mismo navegador y luego entrar desde otro dispositivo. Verificar que el UID, XP y partidas se conservaron. Confirmar que invitado no suma XP y que cerrar sesión oculta todos los datos de la cuenta.

No actualizar la versión pública automáticamente. Si se restaura 0.3, el progreso en Supabase permanece en la base de datos, aunque 0.3 no puede consultarlo.
