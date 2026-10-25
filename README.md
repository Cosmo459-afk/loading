# LOADING ARCADE 0.24

Compartir sitio, perfiles públicos, resultados confirmados y cartas obtenidas. Imágenes para publicaciones (1080 × 1350) e historias (1080 × 1920), texto preparado, enlaces limpios y alternativas cuando el navegador no admite compartir archivos.

## Actualizar desde 0.23

1. Ejecutar **todo** [supabase/upgrade-v24.sql](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v24.sql) en una nueva consulta de Supabase SQL Editor. Añade la lectura del perfil público por enlace sin exigir registro; no borra nada ni abre acceso directo a tablas.
2. Descargar **loading-arcade-v24.zip**, descomprimir y subir **loading-arcade/sitio completa** a Cloudflare, incluidos `_headers` y `assets/media`.
3. Recargar y confirmar **Versión 0.24**. Probar Compartir mi perfil desde Perfil y abrir su enlace en una ventana sin sesión.

Conserva progreso, cartas, cofres, cupones, mensajes y permisos. No requiere volver a habilitar al administrador.

## Dónde compartir

- **Perfil → Compartir mi perfil**: apodo, avatar/cosméticos, nivel y mejor racha. El enlace lleva al perfil público por UUID público, nunca al identificador de Auth.
- **Resultado → Compartir logro**, también desde **Perfil → Mis partidas** para trivias finalizadas: aciertos, consola, dificultad y XP del resultado confirmado. No incluye preguntas, soluciones, identificadores de partida ni cupones. La imagen es una presentación del resultado; no se crea un certificado verificable ni un ranking.
- **Carta obtenida → Abrir carta → Compartir carta**: conserva el arte y color de rareza, con nombre, juego, descripción y jugador. No permite compartir una carta no conseguida desde la interfaz; compartir no la exhibe automáticamente. El enlace lleva al perfil del jugador, y solo aparecen allí las cartas elegidas para exhibición.
- **Pie del sitio → Compartir el Arcade**: invitación general con la imagen de marca.
- Los perfiles visitados también tienen **Compartir perfil**. Las conversaciones conservan su botón de copiar enlace.

El diálogo permite elegir publicación o historia, compartir imagen mediante el menú nativo del dispositivo, descargar PNG, compartir/copiar el enlace y copiar el texto. Si no hay soporte de archivos, se ofrece guardar imagen y copiar texto. Cancelar el menú nativo no inicia una descarga inesperada. Si falla el portapapeles, el texto queda seleccionado para copiar manualmente.

Las imágenes se generan bajo demanda en el navegador. No incluyen correo, tokens de sesión, códigos de cupón ni inventario completo. Los archivos temporales se liberan al cerrar o cambiar de cuenta y se descartan generaciones anteriores que terminen tarde.

## Enlaces y vista previa en redes

El HTML incluye description, Open Graph, tarjeta social grande, favicon y color de marca. La imagen general está publicada con URL HTTPS absoluta y nombre con hash. No se descarga al entrar normalmente: los rastreadores de redes la consultan y el diálogo del sitio la solicita cuando hace falta.

**La vista previa automática de un enlace es general de Loading Arcade.** Los rastreadores no reciben una imagen personalizada por perfil o por resultado: los fragmentos `#jugador/...` los procesa el navegador. Las imágenes personalizadas se comparten como archivos. Para historias de Instagram, guardar/subir la imagen y agregar el enlace como sticker; no se publica automáticamente en ninguna cuenta. Las redes pueden conservar vistas previas en caché.

La dirección pública configurada es `https://loading-arcade.tienda-somosloading.workers.dev/`. Si se cambia de dominio, actualizar PUBLIC_SITE en `src/sharing.js` y la metadata de `index.html` antes de construir.

## Perfil público sin sesión

El nuevo RPC `arcade_share_profile` permite leer un perfil concreto por su UUID público. Devuelve apodo, avatar, cosméticos, nivel, rachas, contador público de likes y cartas efectivamente poseídas que el jugador eligió exhibir. No lista jugadores anónimamente ni devuelve correo, Auth ID, historial, XP exactos, cartas privadas o cupones. Las tablas siguen protegidas. Para reaccionar o participar se invita a crear/abrir un jugador.

## Pruebas de esta versión

- `supabase/tests/sharing-v24.mjs`: lectura anónima segura, filtrado de exhibiciones no poseídas, UUID público, denegación de tablas, ausencia de datos privados y reejecución del SQL.
- `tests/sharing-v24.py`: exportaciones de cuatro tipos, ambos tamaños, imagen real de carta con recorte, resultado confirmado, menú nativo simulado sin enviar nada, cancelación, descarga, portapapeles fallido, enlaces sin parámetros de sesión, metadata y visita sin sesión a 320/390/768/1280 px.
- Pruebas de cupones/resultados, visitas y juego contra fixture local; la suite SQL completa incluye la nueva prueba.

No se enviaron mensajes, correos ni publicaciones a redes durante las pruebas. La aceptación de archivos y la vista previa final dependen de cada navegador/red; requieren comprobación en teléfonos reales.

## Diseño, en el orden trabajado

1. **Tipografía:** Inter para preguntas, publicaciones y controles; Space Grotesk para títulos. La fuente pixel se conserva en las cartas y las personalizaciones elegidas. Ambas fuentes nuevas se incluyen como WOFF2 con caracteres en español y pesos variables; no hacen solicitudes a servicios de fuentes externos. Licencias SIL OFL incluidas.
2. **Botones:** tamaños y bordes comunes, acción principal rosa, secundarias más discretas y estados de selección, deshabilitado, teclado y pulsación. Las cuatro respuestas tienen identificador visual y avanzan al tocar, sin confirmación extra.
3. **Jerarquía:** menú persistente, superficies más sobrias, espaciados uniformes y progreso compacto. El logo y los 14 diseños aprobados de RE4 se conservan. Temas y fuentes cosméticas siguen teniendo efecto.
4. **Movimiento:** entradas de pantalla de 220 ms, diálogos de 180 ms, respuesta táctil y barra de progreso suave. No agregan demoras para jugar. Se conserva el evento de apertura de cofres y los efectos de sonido, sin música. La preferencia del sistema de reducir movimiento elimina las animaciones.
5. **Acabados:** indicadores de carga y paneles de error/confirmación derivados de los mensajes reales, estados vacíos consistentes, campos legibles y foco de teclado visible. No se simulan porcentajes de carga. El contenido de las publicaciones no se interpreta como estado del sistema.

El HTML sigue por debajo del límite de 750 KB y los siete archivos de imágenes mantienen la carga bajo demanda y la caché por hash. La carpeta completa sigue siendo necesaria para desplegar.

## Validación

`tests/polish-v22.py` comprueba fuentes incluidas, navegación y trivia a 320/390/768/1280 px sin desbordamientos, controles principales de al menos 44 px, foco de teclado, selección con avance directo y estados reales con movimiento reducido. Las capturas están en `design/*v22*`. Se ejecutaron también las pruebas de navegación/publicaciones, juego y administración/carga de imágenes contra la fixture local, sin modificar el proyecto real.

## Navegación y publicaciones

- **Trivia**: jugar y consultar el progreso compacto.
- **Perfil**: identidad, personalización, colecciones, cofres, cupón y administración para la cuenta habilitada.
- **Comunidad**: publicaciones de todos, mis publicaciones y directorio de jugadores. Ya no está dentro del perfil.

El inicio de Comunidad muestra todos los espacios, con título, autor y extracto. Se puede filtrar por categoría. **Mis publicaciones** distingue los temas propios de las conversaciones donde respondiste; el acceso a tu respuesta abre su página correspondiente. Desde un perfil público se pueden consultar los temas y respuestas de ese jugador.

Cada conversación tiene un enlace que se puede copiar, recargar y compartir. El navegador conserva la navegación entre secciones. Crear un tema y leerlo son operaciones separadas: si falla la lectura después de guardarlo, se explica que sigue guardado y se ofrece volver a Mis publicaciones para recuperarlo. Reintentar el envío conserva la protección contra duplicados.

## Reparación incluida

Se reprodujeron localmente los errores de Comunidad y de apertura de temas al instalar v19/v20 sin v18: faltaban el identificador público y una función de listado. El SQL v21 repone esos componentes y mantiene likes, rachas y permisos. No borra ni reconstruye los mensajes. La prueba de reparación conserva expresamente una publicación anterior, XP y administrador, incluso al volver a ejecutar el SQL.

## Qué cambia en la carga

El HTML pasó de unos 18 MB a menos de 500 KB. El logo se solicita al entrar; el arte de cartas y el cupón son archivos separados que se solicitan cuando hacen falta. Las imágenes de cartas usan observación de visibilidad, incluso dentro de pantallas ocultas y modales. Al abrir un cofre se empieza a cargar el arte confirmado mientras termina la animación.

Las imágenes mantienen sus bytes y diseños originales aprobados: cuatro láminas compartidas de RE4, el logo y el cupón. No se han redibujado ni reemplazado. Al consultar una carta puede descargarse la lámina que comparte con otras; no se descargan las cuatro al entrar. Los nombres de archivo incluyen hash y `_headers` permite caché duradera sin quedarse con versiones antiguas de los artes. El HTML se revalida al actualizar.

Las cartas no obtenidas siguen ocultas en la interfaz. Los archivos de arte son públicos: esta carga bajo demanda no es un sistema de confidencialidad frente a inspección de recursos. No anunciar que los archivos están protegidos por propiedad.

Las exportaciones del cupón y de logros siguen generándose en el navegador con imágenes del mismo origen. Los datos de canje y las soluciones no están dentro del paquete estático.

## Revisión móvil

Menú principal con tres secciones en celulares pequeños, etiquetas legibles, controles de al menos 44–48 px, formularios de 16 px para evitar zoom automático al escribir, diálogos con desplazamiento propio y espacio reservado para imágenes. Se conserva el progreso compacto, las miniaturas, el detalle con acciones, el avance al tocar una respuesta y el uso con movimiento reducido. No se agrega música; siguen los efectos.

## Administración

### Acceso

El botón no es una protección por sí mismo: **cada RPC verifica en el servidor** que la identidad esté habilitada en `arcade_private.admin_accounts`, tenga correo confirmado y no sea anónima. No hay contraseña/PIN compartido ni clave de servicio dentro del HTML. Las cuentas normales no pueden otorgarse permisos. Retirar la fila de habilitación revoca el acceso del siguiente pedido, aunque una pestaña estuviera abierta.

Para revocar desde SQL Editor, buscar la cuenta por el correo elegido y borrar únicamente su fila de `arcade_private.admin_accounts`; esto no elimina al jugador. El historial administrativo permanece sin respuestas ni mensajes duplicados.

### Resumen

Jugadores, trivias publicadas/retiradas o en borrador, mensajes con reportes pendientes y cupones disponibles/usados. Son cifras reales de Supabase; no son estadísticas de visitas, publicidad o compradores de Tienda Nube.

### Foro

Revisar hasta 50 mensajes reportados, ocultarlos o resolver su reporte; recorrer los temas y sus mensajes, incluso ocultos, y ocultar/mostrar o cerrar/reabrir temas. Las acciones son reversibles salvo el texto que el propio autor retiró. El texto de usuarios se muestra literalmente, sin ejecutar HTML. Los reportes continúan siendo manuales: no se oculta contenido solo por recibir una denuncia.

### Cupones

Buscar por código exacto o ver los 50 más recientes. Consultar apodo, estado y referencia del pedido, y confirmar el canje después de aplicar el 10% a la compra. El servidor conserva el primer canje aunque se repita el pedido; un cupón usado no permite un segundo descuento. Abrir Instagram no lo consume. Esto todavía **no crea descuentos automáticamente en Tienda Nube**.

### Trivias

Crear una trivia desde un formulario de cinco preguntas, cuatro opciones por pregunta, respuesta correcta, explicación, referencia y evidencia. El orden sugerido agrega la trivia al final de su consola/dificultad. También se pueden importar lotes JSON con el formato de `content/batches/README.md`, hasta 100 trivias/2 MB por carga.

**Todo se guarda como borrador**, aunque el JSON diga `publish:true`. Después se revisan las cinco preguntas y fuentes, y se publica explícitamente. Se pueden editar borradores sin partidas; las trivias publicadas o que ya tuvieron intentos no se sobrescriben. Para corregir una trivia jugada, retirarla y crear otra con ID nuevo. Retirar conserva puntos e historial y permite terminar los intentos activos según las reglas existentes.

El servidor valida estructura, longitudes, duplicados y presencia de fuentes. **Eso no verifica la verdad de una respuesta:** el dueño debe leer y revisar la fuente antes de confirmar publicación. La importación completa es transaccional y un reintento con el mismo identificador no duplica el lote.

## Construir y probar

Node >=22, npm, Python, Playwright y Chromium del sistema. Desde `/workspace/loading`:

```sh
npm ci
npm ci --prefix supabase
npm run build
npm run test:database
node scripts/package-release.mjs
```

`dist` es el sitio completo; `assets/cloud.bundle.js` también permite desarrollo desde el HTML fuente y `assets/media` se genera localmente. `dist/asset-manifest.json` solo sirve para comprobaciones del build y no entra al ZIP. Los artes de fuente y su procedencia siguen en `assets` y `content/collections`.

La fixture local se inicia con `npm run test:fixture`. Servir el repositorio en el puerto 8085 y abrir `/dist/index.html`. Las pruebas que reinician esa fixture deben correr **secuencialmente**. `tests/admin-speed-v20.py` verifica peticiones diferidas, exportación de cupón, autorización, formulario/revisión/publicación, canje, moderación segura y revocación. `tests/navigation-feed-v21.py` verifica las secciones, publicaciones propias y de otros, recuperación y enlaces. La suite SQL incluye `feed-v21.mjs`, `repair-v21.mjs` y `admin-v20.mjs` para permisos, validación, borradores e idempotencia. Ninguna prueba envía correos, mensajes o cambios al proyecto real.

El paquete solo contiene el sitio público, estas instrucciones y licencias. No desplegar SQL, el banco JSON con soluciones, la fixture, tests, node_modules ni claves de servicio.

## Historial y pendientes

El historial anterior está en `docs/releases-through-v22.md` y `docs/releases-through-v21.md`, `docs/releases-through-v20.md` y `docs/releases-through-v19.md`. Para 0.24 se sube **sitio completo**. No ejecutar reinicios viejos.

Siguen pendientes el desafío semanal real, su ranking y carta exclusiva; las imágenes de Metal Gear Solid, Silent Hill 2 y Parasite Eve II; y la automatización de canjes en Tienda Nube. Esta versión no agrega intercambios de cartas ni nuevos premios.
