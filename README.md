# LOADING ARCADE 0.34

Apodos alineados a la izquierda y centrados verticalmente en cada fila del ranking. Tiempo y aciertos permanecen a la derecha. Subir sitio completa de loading-arcade-v34.zip. No requiere SQL.

---

# LOADING ARCADE 0.33

Ranking: cabecera TOP 10 sin «parcial», puesto menor que el apodo, nombres centrados en su columna y datos a la derecha: tiempo arriba, aciertos debajo. Se conservan las diez posiciones en una imagen. No requiere SQL: subir sitio completa de loading-arcade-v33.zip.

---

# LOADING ARCADE 0.32

Top 10 completo en una sola imagen. Se eliminan las opciones de dos mitades y la exportación abre directamente en historia completa. Conserva apodos grandes, aciertos y tiempo debajo de cada nombre, logo, fondo de aldea y espacio para enlace. Publicación completa también disponible. Subir sitio completa de loading-arcade-v32.zip. No requiere SQL.

---

# LOADING ARCADE 0.31

Ranking legible para Instagram: por defecto dos historias (puestos 1–5 y 6–10) con apodos grandes y aciertos/tiempo debajo; elimina la columna redundante de puntos. Conserva historia completa y publicación completa. Logo menor, títulos grandes y espacio para enlace. Ambas mitades usan la misma captura de resultados. No requiere SQL: subir sitio completa de loading-arcade-v31.zip.

---

# LOADING ARCADE 0.30

Ranking exportable: títulos y pregunta final en Anton, tipografía condensada similar a la referencia promocional. Apodos y cifras conservan su fuente legible. Se carga la fuente al generar la exportación; no cambia las fuentes del resto del sitio. Actualizar subiendo sitio completa de loading-arcade-v30.zip a Cloudflare. No requiere SQL.

---

# LOADING ARCADE 0.29

Diseño de ranking actualizado: logo oficial, DESAFÍO SEMANAL, Resident Evil 4 - (2005), top 10, pregunta «¿Creés que podés hacerlo mejor?» y espacio libre inferior para el sticker del enlace. Conserva los datos reales y fecha de captura, en publicación e historia.

Actualizar desde v28: subir la carpeta sitio completa de loading-arcade-v29.zip a Cloudflare. No requiere SQL ni reiniciar resultados.

---

# LOADING ARCADE 0.28

Exportación del top 10 semanal con fondo inspirado en la aldea de Resident Evil 4 original. En Inicio → COMPARTIR TOP 10 se actualizan los resultados y se genera una imagen pública con puesto, apodo, aciertos, puntos y tiempo. Incluye captura con fecha/hora de Argentina y distingue ranking parcial de resultado final. No inventa jugadores para llenar posiciones.

## Actualizar desde 0.27

No requiere SQL, reiniciar progreso ni volver a activar el desafío. Descargar loading-arcade-v28.zip y subir la carpeta loading-arcade/sitio completa a Cloudflare, incluyendo _headers y assets/media. Confirmar Versión 0.28.

Elegir PUBLICACIÓN (1080×1350) o HISTORIA (1080×1920), luego GUARDAR IMAGEN o COMPARTIR IMAGEN. El fondo se descarga únicamente al preparar la exportación. Para otros juegos habrá que incorporar su fondo temático; esta primera ilustración corresponde a RE4.

Pruebas: tests/ranking-v28.py verifica diez posiciones sintéticas, apodos largos, exportación sin sesión y descarga PNG de ambos tamaños. Las imágenes design/ranking-v28-*-EJEMPLO.png son ejemplos con datos ficticios, no resultados reales.

---

# LOADING ARCADE 0.27

Corrección de la entrada al Arcade: el desafío activo y el top 10 se muestran antes de crear un personaje. Ya no se interpreta «sin perfil» o un error de conexión como «desafío en preparación».

## Actualizar desde 0.26

1. Ejecutar **todo** [supabase/upgrade-v27.sql](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v27.sql) en una nueva consulta de Supabase SQL Editor. Solo agrega la consulta pública segura del anuncio/ranking: conserva edición activa, fechas, preguntas, intentos, puntajes, XP y premios.
2. Descargar **loading-arcade-v27.zip**, descomprimir y subir **loading-arcade/sitio completa** a Cloudflare, con `_headers` y `assets/media`.
3. Recargar y confirmar **Versión 0.27**. Probar el Inicio en una ventana sin sesión y en una cuenta que aún no eligió apodo/avatar.

**No volver a importar ni activar el banco. No ejecutar el reinicio de progreso.** Esta actualización no cambia la edición semanal existente.

## Causa y solución

La versión anterior cortaba la carga si no había un perfil, aunque ya existiera una sesión autenticada. Como el estado vacío usaba el texto «El próximo desafío se está preparando», alguien nuevo podía creer que no había una semanal activa.

Ahora se consulta el anuncio y ranking públicos al entrar, independientemente de la cuenta o del personaje. Se distinguen carga pendiente, respuesta confirmada sin edición publicada y error de conexión. El estado de preparación solo aparece después de que el servidor confirme que no hay una edición publicada.

Desde la vista pública se pueden consultar reglas, carta del premio y top 10. Para jugar se ofrece elegir apodo y avatar, y al guardar se vuelve al desafío. La visita no inicia un intento ni consume tiempo; el único intento comienza después de crear el personaje y confirmar Comenzar.

## Datos públicos y permisos

`arcade_weekly_public_hub()` devuelve únicamente los metadatos ya públicos de la edición y las diez posiciones del ranking. No devuelve preguntas, soluciones, correos, Auth IDs, inventario, intento personal o posición propia. No da acceso directo a tablas ni habilita jugar sin perfil. Los jugadores con perfil siguen usando el endpoint privado para obtener su propio puesto/intento.

## Validación

`supabase/tests/public-weekly-v27.mjs` prueba lectura anónima, privacidad de respuestas e intentos, ausencia de acceso anónimo al juego/tablas, conservación de la edición y sus resultados, y repetición segura del SQL.

`tests/public-weekly-v27.py` reproduce la captura de sesión sin personaje, entrada sin sesión, error de red y reintento, estado vacío confirmado y creación de personaje con retorno al desafío, verificando que mirar no consume un intento. Pantallas revisadas a 320/390/768/1280 px. Todo se ejecuta contra fixture local.

## Qué cambia

- **Ada completa:** la vista previa ya no muestra únicamente la ilustración. Usa `cardMarkup`, igual que la carta conseguida en la colección: cabecera de Loading, título, arte, juego, descripción, sello Exclusiva y 20/20. Conserva el arte aprobado y los colores originales de las otras rarezas.
- La vista ampliada del premio es de lectura: verla no entrega la carta ni permite exhibirla o compartirla como propia. Sigue siendo necesario conseguir 20/20 y tener la concesión del servidor para acceder a ella en la colección.
- **Inicio:** muestra los diez resultados que devuelve el ranking, con enlaces a los perfiles. Mantiene la posición propia aunque quede fuera de esos diez, permite actualizar y muestra un estado vacío si nadie terminó todavía.
- **Desafío:** conserva reglas, participación, premio y resultado propio, con un enlace para volver al ranking de Inicio. No duplica allí la tabla del top 10.
- Al visitar un perfil desde el ranking, Volver regresa al Inicio.

La mecánica de juego conserva las funciones de v25. La v27 agrega únicamente la consulta pública del anuncio/ranking; no cambia puntuación, plazos, preguntas ni posesión de cartas.

El ZIP incluye el banco revisado en `banco-semanal` como referencia para instalaciones nuevas. **Si tu desafío ya está activo, no lo vuelvas a importar.** Esa carpeta no se despliega en Cloudflare.

## Validación

`tests/weekly-v25.py` se amplió para verificar la carta completa antes de ganar, la vista previa sin acciones de posesión, la concesión por 20/20, la ausencia de tabla en el desafío, la tabla visible en Inicio y el regreso desde un perfil al Inicio. Conserva pruebas de temporizador real, vencimiento/reintento, administración y navegación en 320/390/768/1280 px. Capturas actualizadas en `design/*v26*`.

## Reglas de progreso normal

- Toda trivia de catálogo terminada permite avanzar, incluso con 0/5.
- +200 XP por terminar, +100 por acierto y +200 extra por 5/5: entre 200 y 900 XP.
- Cada trivia se completa una vez; no se repite para sumar puntos.
- Se mantiene el orden fácil → medio → difícil dentro de cada consola, PS1 y PS2 independientes.
- Los intentos terminados antes de actualizar también cuentan para avanzar, incluidos los que antes quedaron desaprobados. Sus XP históricos no se recalculan ni se borran.
- Una partida vencida o ya completada en otro dispositivo deja de bloquear el guardado pendiente y permite volver a la ruta.
- Las soluciones se pueden revisar al terminar. La insignia de racha normal sigue premiando 5/5; una partida no perfecta corta la racha.

## Reglas de la semanal y top 10

- 20 preguntas; 20 segundos por pregunta por defecto (editable entre 10 y 60 mientras es borrador).
- Un intento por jugador y edición. Empezar requiere confirmación antes de consumirlo.
- El servidor fija los plazos, valida la opción y solo entrega la pregunta actual. El cliente no envía puntos ni tiempos para que se acepten como ciertos.
- Una respuesta recibida después del plazo cuenta como omitida; aporta 0 puntos y 0 XP. Respuesta incorrecta: 0. Correcta: 100 puntos y 100 XP. Máximo 2000 XP, sin bonus por terminar. Los XP se entregan una vez al finalizar y sirven para el progreso normal.
- Al vencer el plazo, la interfaz avanza automáticamente. El reloj sigue al salir o perder conexión; al retomar, el servidor convierte los intervalos vencidos en omisiones. Una interrupción no reinicia ni pausa el intento.
- Orden del ranking: más aciertos, menor suma de tiempos de respuesta (incluye el tiempo completo de las omisiones), y finalización más temprana. Empates exactos comparten puesto. Se muestran 10 jugadores y la posición propia aunque quede fuera de esos 10.
- Los resultados solo entran al ranking cuando el intento termina. Si alguien abandona sin regresar, su intento puede quedar pendiente hasta retomar; no hay tarea programada que liquide abandonos en segundo plano en esta versión.
- Una edición cerrada rechaza nuevos intentos. Quien retome uno pendiente conserva los aciertos ya confirmados y las preguntas restantes vencen.
- Las fuentes/soluciones no se muestran durante el intento. El cronómetro dificulta consultar fuera, pero no garantiza ausencia de ayuda externa, cuentas múltiples o diferencias de latencia. El tiempo válido es el recibido por el servidor; conviene una conexión estable.
- La regla es un intento por jugador, no una verificación de persona única. Vincular correo sigue siendo opcional.

## Exclusiva de Ada Wong

Categoría **Exclusivas**, fuera de comunes/épicas/legendarias. Marco **verde esmeralda**, vestido rojo del RE4 original y arte nuevo basado en la referencia del dueño. Se obtiene únicamente con **20/20 en esa edición**. No sale en cofres ni se compra. La concesión se verifica en el servidor y no se duplica al reintentar el guardado.

Las exclusivas aparecen en **Perfil → Mi colección → Exclusivas semanales**, con su edición, detalle y opción de compartir. No consumen ni alteran los tres espacios de exhibición normal; esta primera implementación no agrega esas exclusivas a la vitrina pública de tres cartas. El archivo de arte es público y se muestra como premio del desafío; lo que se valida es su posesión en el juego, no la imposibilidad de descargar la imagen.

El premio visual disponible en esta versión es Ada Wong de RE4; para nuevas recompensas de personajes se debe incorporar el arte correspondiente.

## Navegación

**Inicio** pasa al primer lugar del menú. Se conservan Trivia y Comunidad como secciones independientes y Perfil queda al final. Las páginas sustituyen los accesos Inicio por Volver, y las vueltas contextuales del foro se conservan.

La portada reduce el bloque del jugador y prioriza Continuar trivia y el desafío semanal. La ruta de progreso está visible dentro de Perfil, debajo de la identidad. Se mantienen los indicadores de cofres/cartas/cupón pendientes.

## Pruebas de esta versión

`supabase/tests/weekly-v25.mjs`: 0/5 avanza y otorga 200 XP una sola vez; bloqueo de repetición; desbloqueo de dificultad; permisos de administración; publicación inmutable; una pregunta por vez; vencimientos; reintentos sin duplicación; un intento; concesión de Ada por 20/20; XP una sola vez; top 10 y posición fuera del top; aislamiento y reejecución segura.

`tests/weekly-v25.py`: navegación de cuatro secciones y Volver, progreso en Perfil, partida 0/5, importación cifrada/revisión/activación por la interfaz, intento de 20 preguntas, ranking, vencimiento tras recargar, premio esmeralda y exportación de la exclusiva. Usa una edición sintética, sin publicar las preguntas reales ni su clave. También se comprobó localmente la importación del banco real de 20 preguntas. Las pruebas solo escriben en la fixture local.

Construir con `npm run build`; paquete con `node scripts/package-release.mjs`; suite SQL con `npm run test:database`. `npm run test:browser` ejecuta la regresión v25 con servidor local 8085 y fixture 8082. El ZIP incorpora ocho imágenes cacheadas y un banco cifrado fuera de sitio; ningún SQL ni banco de respuestas en claro se despliega.

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

El HTML sigue por debajo del límite de 750 KB y los ocho archivos de imágenes mantienen la carga bajo demanda y la caché por hash. La carpeta completa sigue siendo necesaria para desplegar.

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

El historial anterior está en `docs/releases-through-v22.md` y `docs/releases-through-v21.md`, `docs/releases-through-v20.md` y `docs/releases-through-v19.md`. Para 0.25 se sube **sitio completo**. No ejecutar reinicios viejos.

Siguen pendientes el desafío semanal real, su ranking y carta exclusiva; las imágenes de Metal Gear Solid, Silent Hill 2 y Parasite Eve II; y la automatización de canjes en Tienda Nube. Esta versión no agrega intercambios de cartas ni nuevos premios.
