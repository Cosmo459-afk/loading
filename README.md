# LOADING ARCADE 0.23

La publicación inicial se presenta como una sola pieza: categoría, título, autor y texto. Los comentarios se agrupan debajo con su contador y una marca «AUTOR» cuando responde el creador. Un pulgar arriba permite aprobar y quitar la aprobación de publicaciones y comentarios de otros jugadores.

## Actualizar desde 0.22

1. En **Supabase → SQL Editor → New query**, pegar y ejecutar **todo** [supabase/upgrade-v23.sql](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v23.sql).
2. Descargar **loading-arcade-v23.zip**, descomprimir y subir **loading-arcade/sitio completa** a una nueva implementación de Cloudflare Pages, conservando `_headers` y `assets/media`.
3. Recargar y confirmar **Versión 0.23**. Abrir una conversación y probar el pulgar de un comentario ajeno; tocar otra vez lo retira. La elección persiste al recargar.

No borra publicaciones, XP, cartas, cupones ni permisos. No requiere volver a habilitar al administrador. Si todavía no se instaló v21, ejecutar primero su SQL de reparación; las versiones 22 y 23 usan esa base.

## Conversaciones y reacciones

- La publicación inicial permanece arriba al recorrer páginas de comentarios. Un mensaje inicial retirado u oculto nunca se sustituye por la primera respuesta: se informa que fue retirado o no está disponible.
- Los comentarios mantienen el orden de publicación; esta versión no agrega respuestas anidadas ni orden por popularidad.
- Cada jugador puede dar una aprobación por mensaje ajeno y quitarla. No hay votos negativos ni autoaprobaciones. No otorga XP ni recompensas.
- La tabla de reacciones es privada, con RLS y sin acceso directo para clientes. Las funciones devuelven solamente contador y la elección propia, no quiénes aprobaron. Reintentar el mismo estado no duplica ni alterna accidentalmente el voto.
- Los mensajes ocultos, retirados o dentro de temas ocultos no admiten nuevas reacciones. Los textos ocultos siguen sin exponerse. Se conservan reportes, retirada propia, moderación y cierre de conversaciones.
- El contador cambia después de la confirmación del servidor; un fallo permite reintentar. La selección se anuncia a lectores de pantalla sin insertar un panel grande por cada aprobación.

## Validación de esta versión

`supabase/tests/forum-v23.mjs` verifica permisos, idempotencia, autoaprobación bloqueada, moderación, retirada, privacidad, paginación y repetición segura del SQL. `tests/forum-v23.py` verifica estructura, contador, selección persistente, retiro de aprobación, error/reintento y tamaños de 320/390/768/1280 px. También se mantienen las pruebas de publicaciones y acciones previas del foro. Todo se ejecuta contra una base local, sin modificar Supabase real.

## Diseño, en el orden trabajado

1. **Tipografía:** Inter para preguntas, publicaciones y controles; Space Grotesk para títulos. La fuente pixel se conserva en las cartas y las personalizaciones elegidas. Ambas fuentes nuevas se incluyen como WOFF2 con caracteres en español y pesos variables; no hacen solicitudes a servicios de fuentes externos. Licencias SIL OFL incluidas.
2. **Botones:** tamaños y bordes comunes, acción principal rosa, secundarias más discretas y estados de selección, deshabilitado, teclado y pulsación. Las cuatro respuestas tienen identificador visual y avanzan al tocar, sin confirmación extra.
3. **Jerarquía:** menú persistente, superficies más sobrias, espaciados uniformes y progreso compacto. El logo y los 14 diseños aprobados de RE4 se conservan. Temas y fuentes cosméticas siguen teniendo efecto.
4. **Movimiento:** entradas de pantalla de 220 ms, diálogos de 180 ms, respuesta táctil y barra de progreso suave. No agregan demoras para jugar. Se conserva el evento de apertura de cofres y los efectos de sonido, sin música. La preferencia del sistema de reducir movimiento elimina las animaciones.
5. **Acabados:** indicadores de carga y paneles de error/confirmación derivados de los mensajes reales, estados vacíos consistentes, campos legibles y foco de teclado visible. No se simulan porcentajes de carga. El contenido de las publicaciones no se interpreta como estado del sistema.

El HTML sigue por debajo del límite de 750 KB y los seis archivos de imágenes mantienen la carga bajo demanda y la caché por hash. La carpeta completa sigue siendo necesaria para desplegar.

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

El historial anterior está en `docs/releases-through-v22.md` y `docs/releases-through-v21.md`, `docs/releases-through-v20.md` y `docs/releases-through-v19.md`. Para 0.23 se sube **sitio completo**. No ejecutar reinicios viejos.

Siguen pendientes el desafío semanal real, su ranking y carta exclusiva; las imágenes de Metal Gear Solid, Silent Hill 2 y Parasite Eve II; y la automatización de canjes en Tienda Nube. Esta versión no agrega intercambios de cartas ni nuevos premios.
