# LOADING ARCADE 0.18 — comunidad y perfiles visitables

**Desde 0.16/0.17: ejecutar `supabase/upgrade-v18.sql` en Supabase SQL Editor → New query → Run; después subir el `index.html` del ZIP v18 a Cloudflare.** No reinicia progreso, cartas, cofres ni cupones.

## Nuevo en 0.18

- Se retira el top del inicio. **Comunidad** tiene su propia pantalla, accesible desde el menú principal del jugador.
- Todos los perfiles aparecen automáticamente en un directorio **alfabético**, con páginas de 24 jugadores y botones para seguir navegando. No se muestran puestos ni un ranking por nivel/XP.
- Cada jugador abre una página de perfil de solo lectura: avatar con cosméticos, apodo, nivel y **hasta tres cartas que decidió exhibir**. No se muestra el número de cartas que posee, sus pendientes, correo, XP exacta, historial, cofres ni cupones.
- Se puede tocar una carta exhibida para verla en detalle. Esa vista no permite exhibirla, quitarla ni adquirirla. Ver la carta de otra persona no la añade al inventario del visitante. Los controles del álbum propio siguen funcionando normalmente.
- Perfiles sin cartas muestran un estado vacío. Los perfiles que ya no están disponibles permiten volver o reintentar. Cambiar de cuenta limpia las vistas y respuestas tardías de solicitudes anteriores no reemplazan al último perfil solicitado.
- Cada perfil usa un identificador público aleatorio separado del ID de autenticación. El RPC de visita solo entrega los IDs de cartas exhibidas que siguen siendo propiedad de ese jugador, con máximo de tres. Las tablas de inventario conservan sus políticas privadas.
- Este paso no incorpora reacciones, foro, mensajes ni intercambios; quedan para una etapa posterior.

## Instalar 0.18

1. Aplicar [`upgrade-v18.sql`](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v18.sql) en **Supabase → SQL Editor → New query → Run**. Conserva los datos y se puede reejecutar; los identificadores públicos existentes no cambian.
2. Descargar `loading-arcade-v18.zip`, descomprimir y subir **solo `index.html`** a **Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy**.
3. Confirmar «Versión 0.18». Abrir Comunidad y tocar un jugador. Para decidir qué cartas ven los demás: Mi colección → juego → carta → Exhibir. El límite sigue siendo tres.

Si todavía falta 0.15 o 0.16, aplicar esos pasos históricos primero. No repetir los reinicios antiguos.

Validación: SQL comprueba paginación, orden alfabético, campos públicos permitidos, identificadores separados de Auth, límite de tres cartas realmente propias, exclusión de cartas no exhibidas/no obtenidas, RLS, sesión requerida y migración reejecutable. `tests/visits-v18.py` usa exclusivamente la fixture local y prueba visitas reales, detalle de carta ajena sin acciones, estado vacío/error, orden de solicitudes y retirada de una carta exhibida.

## Registro anterior: 0.17

**Si ya instalaste 0.16, esta actualización no necesita SQL.** Descargar `loading-arcade-v17.zip`, descomprimir y subir **solo `index.html`** a Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy. Confirmar «Versión 0.17» en el pie. Se conserva todo el progreso.

## Cambios de 0.17

- El listado de colecciones y el álbum de cada juego son pantallas independientes. Abrir Resident Evil 4 lleva a su propio álbum; «Volver a colecciones» regresa al listado.
- Cartas conseguidas en miniatura, hasta 140 px de ancho, sin botones de exhibición. El tamaño es el mismo aunque solo haya una carta.
- Tres grupos: **comunes, épicas y legendarias**, cada uno con cantidad conseguida, total y pendientes. Los espacios que faltan son dorsos negros genéricos, sin nombres, imágenes, siluetas ni controles de apertura. No representan una identidad o posición secreta concreta: son el número de cartas que faltan de esa rareza.
- Tocar una miniatura abre el detalle grande con descripción y la opción **Exhibir / Quitar del perfil**. Se mantiene el límite de tres destacados y la validación del servidor. Ninguna carta pendiente puede abrirse por el controlador de detalle.
- Las imágenes y recursos no cambian; no se agregan coleccionables, recompensas ni migraciones. Se conserva el estado de lectura del álbum y los indicadores del perfil.

Validación: flujo de colección vacía 8/4/2, primer premio, miniatura, pantalla independiente, detalle y exhibición persistente, identidad oculta de las pendientes, rechazo de acceso a carta no obtenida y tamaños móviles/escritorio.

## Registro anterior: 0.16

**Desde 0.15: ejecutar solo `supabase/upgrade-v16.sql` en Supabase SQL Editor → New query → Run; después subir el `index.html` del ZIP v16 a Cloudflare.** No reinicia cuentas, XP, partidas, cartas, cofres ni cupones.

## Cambios de 0.16

- Ruta de inicio compacta: tarjetas de 78 px frente a los 150 px anteriores, texto y barra más pequeños; conserva desplazamiento horizontal y próximo premio destacado. La página Progreso conserva la vista completa.
- **Mis cofres dentro del perfil**, con círculo y cantidad de cofres pendientes. Se elimina el botón grande de cofres del inicio y la lista de aperturas pasadas. Los premios ya obtenidos siguen en Mi colección; no se borran datos del servidor.
- **Mi perfil** agrupa cofres, colección, estilo, cupón y partidas. El acceso al perfil avisa de pendientes. Las cartas nuevas tienen su propio indicador, que se limpia al abrir la colección correspondiente y ver las cartas obtenidas. Ese estado de lectura se guarda por jugador en este navegador; en otro dispositivo puede aparecer otra vez. El cupón disponible también tiene indicador hasta ser canjeado.
- **Ranking de progreso automático** de todos los jugadores. Orden por XP total (el nivel se muestra junto con la XP), puestos compartidos para idéntica experiencia. Primeros doce y tu propio puesto si estás fuera de esa lista. No es el ranking semanal ni promete premios competitivos.
- No hay opción de unirse u ocultarse. El antiguo campo de visibilidad queda sin efecto y se retira el permiso para usar su RPC. Al crear/editar el personaje se explica que apodo, avatar y nivel aparecen en comunidad. El servidor solo entrega apodo, avatar/cosméticos, nivel, XP, puesto y la marca «Vos»; no entrega correos, UUID ni historial. El ranking requiere sesión.

## Instalar 0.16

1. Con 0.15 instalada, abrir [`upgrade-v16.sql`](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v16.sql), copiar todo a **Supabase → SQL Editor → New query → Run**. Se puede reejecutar sin reiniciar progreso.
2. Descargar `loading-arcade-v16.zip`, descomprimir y subir **solo `index.html`** a **Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy**.
3. Confirmar «Versión 0.16» al pie. Abrir Mi perfil → Mis cofres y comprobar el ranking. Si falta el SQL nuevo se muestra un error de carga del ranking; no se inventan puestos con datos de la API antigua.

Si aún estás en 0.14, aplicar primero 0.15 siguiendo el apartado histórico de abajo y luego 0.16. No repetir los reinicios antiguos.

## Registro de 0.15

## Nuevo en 0.15

- **96 trivias de cinco preguntas: 16 fáciles, 16 medias y 16 difíciles para cada consola; 480 preguntas nuevas.** Cada respuesta incluye manual original estadounidense, URL fijada por commit, hash y localizador de escaneo en el esquema privado. Registro de revisión en `content/research/retro-v15-audit.json`; no se redistribuyen manuales completos. Dificultad editorial pendiente de calibración con jugadores. Las seis trivias antiguas se archivan sin borrar sus partidas ni puntos; una partida anterior activa se puede terminar durante su ventana normal de 24 horas. El catálogo nuevo mantiene el orden igual para todos y no revela títulos antes de jugar.
- **Un toque elige y avanza** tras 350 ms de confirmación visual; última respuesta guarda automáticamente. Bloqueo de toques repetidos y recuperación del guardado ante cortes de conexión. No hay cronómetro en la ruta normal.
- **Nivel 5, a 7.200 XP: cupón personal de 10% en Tienda Nube**, un uso, no acumulable, sin vencimiento; reemplaza al cofre de ese nivel. Cofres normales desde nivel 6. Los cofres de nivel 5 entregados en versiones anteriores se conservan. El cupón se concede también a jugadores que ya llegaron al nivel 5.
- Imagen de cupón personalizada con código, jugador y aclaración Tienda Nube; enlace al catálogo `https://somosloading.mitiendanube.com/`. **CANJEAR CÓDIGO** abre `https://ig.me/m/somosloading` y trata de copiar el mensaje preparado. Instagram no garantiza rellenar un DM por URL: el texto queda visible y copiable para pegarlo. No se envían mensajes automáticamente y abrir el chat no consume el cupón.
- Imagen de logro 1080×1350 para descargar/compartir con avatar, resultado, nivel y XP. No contiene códigos de descuento ni puestos inventados. Compartir nativo solo si el navegador admite archivos; alternativa de descarga.
- **31 cosméticos espaciados de 900 en 1.800 XP**, hasta 54.900 XP: un cosmético a mitad de nivel y un premio principal al subir. Se conserva permanentemente lo ya desbloqueado, aunque ahora requiera más XP. Los 96 quizzes permiten obtener hasta 86.400 XP. La colección no pierde cartas: tras completarla, los cofres quedan guardados para futuras cartas.
- Próximas colecciones preparadas: Metal Gear Solid PS1, Silent Hill 2 PS2 y Parasite Eve II PS1, todas originales. Se muestran como próximas; **no entregan cartas hasta recibir y aprobar imágenes**. RE4 conserva sus 14 cartas y probabilidades 85/10/5, sin monedas ni duplicados.

## Validar un canje como dueño

El código del perfil es una identificación de beneficio, **no un cupón creado automáticamente en Tienda Nube**. Cuando el cliente envía su mensaje, validá el código en Supabase SQL Editor y coordiná el descuento de la compra en tu tienda. No marques usado solo por consultar el catálogo o abrir Instagram.

```sql
-- Consulta: debe existir, ser de 10% y tener redeemed_at vacío.
select c.code,p.nickname,c.discount_percent,c.redeemed_at
from public.arcade_coupons c join public.arcade_profiles p on p.id=c.player_id
where c.code='LD5-REEMPLAZAR-POR-CODIGO-REAL';

-- Solo al confirmar el canje de la compra, una vez:
select public.arcade_redeem_coupon('LD5-REEMPLAZAR-POR-CODIGO-REAL','Pedido TN #123');
```

`already_redeemed=true` significa que ese beneficio ya se consumió: no otorgar un segundo descuento. La función bloquea la fila y conserva el primer canje. Solo el dueño desde SQL Editor o un backend con rol de servicio puede marcarlo usado; nunca incluir claves de servicio en el HTML. Para aplicar en checkout, crear un descuento de uso limitado en Tienda Nube después de validar; la automatización entre ambas plataformas queda pendiente.

## Instalar 0.15

1. Con backend 0.14 instalado, copiar **todo** [`upgrade-v15.sql`](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v15.sql) al SQL Editor de Supabase y ejecutar. Devuelve seis filas con **16** trivias cada una. La actualización completa es atómica y reejecutable; no correr por separado los archivos internos `-schema` y `-route`.
2. Descargar `loading-arcade-v15.zip`, descomprimir y subir **solo `index.html`** a Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy.
3. Comprobar «Versión 0.15» en el pie. Revisar la ruta, jugar tocando respuestas y abrir CUPÓN desde el inicio. **No volver a ejecutar los reinicios 0.9.**

Si venís de 0.9–0.13, aplicar primero 0.14 como se explica en la sección histórica y luego 0.15. No ejecutar scripts antiguos cuando ya están instalados.

El propietario confirmó la dirección «LOADING · Archivo Retro» de la primera propuesta y aclaró que las fotos son referencias para crear nuevas composiciones. Se renovaron los 14 artes de Resident Evil 4 a partir de las referencias y la muestra aprobada, cuidando la cara frontal cuadrada de la caja Red Hawk y los rasgos reconocibles de objetos y armas, con fondos oscuros y luz de inventario para objetos y armas, y ambientes del juego para los personajes. El marco es HTML/CSS reutilizable: bisel metálico, tipografía pixel Silkscreen, encabezado Archivo Retro, imagen protagonista, título/juego/descripción debajo y pie con rareza/número. Comunes azules, épicas violetas/rosas y legendarias doradas.

## Solo efectos de sonido

Se retiró por completo la música, sus bucles y sus controles; las preferencias antiguas de música no pueden reactivarla. Se conservan los efectos originales de navegación, selección neutra, cambio de pregunta, resultado, nivel, cosméticos, apertura y revelación por rareza. Elegir una respuesta no da pistas de acierto. No hay archivos de videojuegos ni grabaciones externas.

Control «♪ EFECTOS» con interruptor y volumen persistentes. Sin autoplay antes de un gesto, silencio al quedar inactivo, pausa al ocultar la pestaña y fallback sin audio cuando el navegador no lo admite.

## Progreso en el inicio

La ruta completa aparece horizontalmente en el inicio, con cada cosmético y cofre, XP requerida, estados y próximo hito destacado. Se desplaza dentro de su propio contenedor, con teclado y táctil; la página no desborda. El acceso anterior «Recompensas» se llama «Progreso». En el inicio se evita duplicar el botón y los datos de sesión: la ruta ya está a la vista y el panel del jugador ofrece salida.

## Trivias en orden fijo

Solo se elige consola. Se quitaron el selector de trivias, sus títulos y la selección manual de dificultad. Se juega la primera pendiente de la consola en orden fácil → medio → difícil, `sort_order` y luego ID como desempate estable para todos. Los títulos tampoco viajan en las respuestas de listado/inicio del nuevo backend. Los tres contadores de dificultad siguen visibles como información.

La comprobación de orden se hace en servidor, con bloqueo por perfil. Un intento activo se retoma, incluso si venía de la versión anterior; si fallás, la misma trivia sigue pendiente. Una aprobada no se repite. Al terminar, «Siguiente trivia» comienza directamente la siguiente; al acabar esa consola invita a elegir la otra. Las trivias de progreso no tienen tiempo. El desafío semanal sigue pendiente y será el único con cronómetro.

## Comunidad y reconocimiento

Desde 0.18 todos los jugadores aparecen automáticamente en el directorio alfabético de Comunidad. Cada perfil muestra solo avatar, apodo, nivel y hasta tres cartas exhibidas. El ranking de progreso anterior fue retirado; el desafío semanal sigue pendiente.

## Personalización ampliada

Se añaden **25 cosméticos**, para **31 en total**, en siete categorías: fondos, gafas/visores, accesorios, marcos, emblemas, temas y tipografías. Escenas SVG originales (ciudad, aurora, sala arcade, espacio, jardín y más), auriculares, visor, marcos con acabados y dos animados, cuatro emblemas, cuatro temas de menú y dos estilos de tipografía. No se usan GIF externos. Las animaciones respetan movimiento reducido.

Cada ítem tiene vista previa y filtro por categoría; previsualizar no equipa. El servidor valida XP, categoría y propiedad, conserva los otros elementos equipados y permite quitarlos. La propiedad queda guardada en `arcade_owned_cosmetics`. El calendario actual va de 900 a 54.900 XP, con pasos de 1.800 XP. Se preservaron todos los ítems ganados antes del cambio. No se permite repetir trivias aprobadas para farmear.

Los temas afectan el menú y la tipografía se aplica a nombres/títulos del menú; las preguntas y opciones mantienen una fuente legible. Nuevo logo «LOADING ARCADE» adaptado a partir de la referencia del propietario, incrustado en el HTML para escritorio y celular.

## Entrada única y portada

Se retiran la partida rápida, el modo invitado y el selector Mix libre. ENTRAR AL ARCADE crea una identidad anónima de Supabase sin pedir correo; después exige elegir apodo y avatar antes de jugar. El acceso antiguo `startMode('guest')` también conduce a crear/completar el personaje, sin abrir una partida local. Los endpoints libres antiguos del backend se conservan por compatibilidad, pero no aparecen ni se usan en la interfaz.

Tras crear o recuperar un jugador, el inicio muestra su avatar, apodo, nivel, XP total y cantidad de coleccionables. Desde ahí se accede a la ruta de trivias, colección misteriosa, avatar, historial y edición del perfil. La ruta de experiencia muestra el próximo nivel/cofre, XP restantes, barra real sobre 1.800 XP, siguiente hito y acceso destacado a los cofres pendientes.

Las partidas se guardan desde el principio en la identidad anónima; no se afirma que solo empiecen a guardarse al agregar correo. La vinculación opcional conserva el UID, puntos e historial y permite recuperar acceso. El recordatorio sigue apareciendo tras tres partidas o un día y se puede posponer, sin bloquear el juego. Las cuentas previas por correo se conservan.

El panel semanal está ubicado en el inicio y se muestra como **EN PREPARACIÓN**, sin jugadores, puntajes, posiciones ni fechas ficticias. **El desafío semanal y su ranking real todavía no están implementados ni publicados.** Esta entrega prepara el espacio en la portada; no anuncia una competencia activa ni inventa resultados.

## Descubrimiento y misterio

El listado inicial muestra juegos y contadores. El álbum separado agrupa las cartas por rareza y presenta miniaturas de las obtenidas junto con dorsos negros genéricos para las pendientes. Los dorsos no tienen nombres, diseños, siluetas ni botones. Los controles para exhibir aparecen únicamente en el detalle de una carta propia.

Los artes están incrustados en el HTML independiente. Esta es una experiencia de descubrimiento en la interfaz, no confidencialidad frente a inspección del código. Entregar recursos solo después de adquirirlos requeriría almacenamiento remoto autenticado.

## Paso histórico previo: actualizar desde 0.9–0.13 a 0.14

1. Abrir [`supabase/upgrade-v14.sql`](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v14.sql), copiar su contenido completo en **Supabase → SQL Editor → New query → Run**. Conserva el progreso y permite reejecución sin reinicios. Devuelve las cantidades por categoría de cosméticos.
2. Descargar `loading-arcade-v14.zip`, descomprimir y subir **solo `index.html`** a Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy.
3. Confirmar «Versión 0.14» en el pie y refrescar con Ctrl+F5 si aparece la anterior. Revisar Progreso, Personalización y elegir si compartir el jugador en Comunidad.

Si falta el SQL nuevo, la comunidad se muestra temporalmente no disponible; el progreso existente no se borra. Aplicar el SQL antes del HTML para tener también la comprobación de orden en servidor. **No volver a ejecutar upgrades antiguos ni el reinicio 0.9.**

## Reglas implementadas

- Resident Evil 4 original: 14 coleccionables confirmados por el propietario, ocho comunes azules, cuatro épicos violetas/rosas y dos legendarios dorados. Arte y marco «Archivo Retro» uniformes; nombre y descripción siguen siendo texto accesible y editable. Contador por colección, detalle de cartas propias y tres destacados en el perfil.
- **Las cartas solo se obtienen abriendo cofres**, nunca por XP directamente. Un cofre al subir cada nivel salvo el nivel 5, que entrega el cupón; **1.800 XP por nivel**. Una trivia perfecta entrega 900 XP: dos perfectas suben un nivel. El jugador comienza en nivel 1 y su primer cofre corresponde al nivel 2.
- Probabilidades iniciales **85% común, 10% épica y 5% legendaria**. Se reasignó a comunes el 15% de monedas descartado por el propietario. **Sin monedas y sin repetidas**. Al agotar una rareza se elimina del sorteo y se normalizan proporcionalmente los pesos restantes. Con la colección completa, los cofres pendientes permanecen cerrados para futuras incorporaciones.
- Sorteo en servidor; premio e inventario guardados en la misma transacción. Doble clic, recarga, corte de red y otro dispositivo devuelven el mismo resultado ya guardado. No hay pagos ni compra de cofres.
- Evento de apertura: cofre que se agita, tapa que se abre, brillo y revelación de la carta; respeta movimiento reducido. El premio queda consultable desde Mis cofres. Las probabilidades y la regla de no repetición se muestran antes de abrir.
- Cosméticos entre niveles: uno cada 1.800 XP comenzando en 900; propiedad persistente y validada por servidor. Son únicamente visuales.
- Trivias por consola: aprobar con 3/5; reintentar hasta aprobar, sin mostrar soluciones al fallar. Recompensa única: 200 XP por aprobar + 100 por acierto + 200 por perfecta; totales 500/600/900. Una aprobada no se repite. Todas las partidas visibles requieren un personaje y guardan su resultado. PS1 y PS2 independientes; fáciles → medias → difíciles.
- Aviso de nivel y recompensas, botón con insignia persistente y contador de cofres sin abrir. Perfil solo con mascotas y cosméticos, sin foto.
- Carga de trivias por lotes sin actualizar HTML: ver `content/batches/README.md`. Las preguntas/soluciones/fuentes se guardan en esquema privado. Todavía no es un panel administrativo.

## Instalación histórica del backend 0.9 — solo si todavía falta

El propietario pidió eliminar todo el catálogo anterior y permitió reiniciar la experiencia. **`supabase/upgrade-v09.sql` borra XP, historial de partidas, dificultades desbloqueadas, destacados, cosméticos equipados y cartas anteriores**. Conserva cuentas, apodos, avatar elegido, vinculación de correo y preguntas publicadas. Instala únicamente las 14 cartas nuevas, inicialmente sin propietarios ni cofres.

Para actualizar, ejecutar **solo `supabase/upgrade-to-v09.sql`**: detecta si el proyecto está en 0.7 u 0.8 y aplica lo necesario en una transacción. En la primera instalación reinicia los datos de prueba; si se ejecuta otra vez tras una instalación correcta, conserva el progreso nuevo. El resultado debe mostrar common 8, epic 4 y legendary 2. No ejecutar además los upgrades individuales ni `migrations`.

Después subir el HTML actual. Probar dos trivias perfectas para recibir un cofre de nivel 2, abrirlo y verificar el contador 1/14 en el álbum. Este paso SQL es únicamente para instalar el backend 0.9 que aún falte; no es parte de la actualización de versión 0.14.

Base nueva: `setup.sql` → `upgrade-v06.sql` → `upgrade-v07.sql` → `upgrade-to-v09.sql` → `upgrade-v14.sql` → `upgrade-v15.sql`. No ejecutar también 0.8/0.9 individuales: el archivo único ya los incluye.

La corrección del límite SQL de puntuación a 900 está en `upgrade-v08.sql` y también en 0.9 para proyectos que ya habían aplicado la revisión previa de 0.8.

## Imágenes y paquete

Catálogo en `content/collections/re4.json`. Los 14 archivos originales aportados por el propietario se conservan sin cambios como referencias; su procedencia y hashes están en `content/collections/re4-image-provenance.json`. La autorización para mantener la referencia del medallón del remake sigue documentada, sin atribuir esa captura a la edición original.

Los artes de producción están en `assets/cards/re4/art-v13/`: cuatro láminas de arte que la UI presenta como 14 imágenes individuales mediante recortes SVG. El marco y textos se generan por separado en `src/cards.css` y `cardMarkup`, evitando texto rasterizado. `content/collections/re4-art-provenance-v13.json` registra los originales generados y hashes; `originalImageFile` conserva el vínculo con la referencia. No usar el arte como fuente de nombres, funciones o lore: esos metadatos confirmados no cambiaron.

El build incrusta cada lámina una sola vez, junto con Silkscreen Bold (OFL) y los estilos; sin CDN ni fuentes externas. El HTML final es independiente y está dentro del límite de tamaño de assets estáticos. El build falla si falta arte. `npm run build:preview` solo sirve para desarrollo y no debe empaquetarse.

`loading-arcade-v18.zip` contiene el HTML independiente, README y licencias. No subir al Worker los JSON con respuestas, SQL, tests, fixture ni node_modules. Para reconstruir: `npm run build` y `node scripts/package-release.mjs`. Los ZIP previos se conservan como versiones históricas. No aplicar de nuevo la migración 0.9 al actualizar solo la interfaz.

## Desarrollo y validación

Node >=22, npm, Python, Playwright y Chromium del sistema. Checkout `/workspace/loading`.

```sh
npm ci
npm ci --prefix supabase
npm run build
npm run test:database
python -m http.server 8080 --bind 0.0.0.0
```

En otra terminal: `npm run test:fixture`. Luego `npm run test:browser`, `python tests/home-v14.py`, `python tests/rewards-v15.py`, `python tests/audio.py` y `python tests/smoke.py`. Ejecutar las pruebas que usan la fixture de forma secuencial porque reinician únicamente su base local. `ARCADE_URL` cambia el puerto. La fixture usa PGlite y Auth simulado; las solicitudes de integración se interceptan y no escriben en Supabase remoto ni envían correos. Nunca desplegar la fixture.

Pruebas de servidor: reinicio autorizado conserva identidades; catálogo 8/4/2; dos perfectas entregan 1.800 XP y un solo cofre; XP sin cartas; partición exacta de probabilidades 85/10/5; normalización de rarezas agotadas; 14 premios únicos; colección completa no consume cofres; reintentos idempotentes, aislamiento por usuario y rechazo de escrituras/invocaciones privadas.

Pruebas de navegador: perfil, aprobación, recuperación de guardado interrumpido, avisos, dos perfectas/nivel, vestuario, álbum y contadores, apertura animada, recuperación tras abrir en servidor pero recibir error de red, consulta del mismo premio, destacados, detalle y 40 combinaciones de pantalla/ancho. Se comprueban la vista inicial de colecciones sin cartas desplegadas, ausencia de nombres/arte/controles de cartas pendientes incluso en el DOM del álbum, rechazo de vista directa de una carta no obtenida, revelación del primer premio por cofre, vista y destacados solo de la carta propia, y persistencia del contador/XP/inventario al recargar. También se comprueba el upgrade desde 0.7 y 0.8 y su reejecución sin otro reinicio.

Mantener Anonymous Sign-ins habilitado y Confirm email para vinculación opcional. Site URL/Redirect URL: `https://loading-arcade.tienda-somosloading.workers.dev/`. Configuración pública en `src/config.js`; no usar service_role ni contraseñas en el navegador. Correo real y despliegue remoto necesitan comprobación posterior.

## Pendientes posteriores

- Imágenes de las siguientes colecciones: Metal Gear Solid PS1, Silent Hill 2 PS2 y Parasite Eve 2 PS1, todos originales.
- Ampliaciones de contenido con lotes nuevos y calibración de dificultad con datos reales; no sobrescribir preguntas ya jugadas.
- Desafío semanal temático de 20 preguntas con tiempo por pregunta (sin responder: cero), un intento, ranking por aciertos/tiempo y carta exclusiva por perfect score. Encuesta de cuatro juegos en Instagram con enlace desde la app.
- Automatización del canje en Tienda Nube; esta versión coordina el descuento por Instagram con validación del dueño.


Validación 0.12: entrada anónima sin email, selección obligatoria de personaje, bloqueo del acceso invitado antiguo y ausencia del Mix en la interfaz; dashboard con usuario, 1.800 XP y cofre; estado semanal pendiente honesto; tres partidas sin correo y recordatorio posponible; vinculación PKCE simulada conserva UID, 1.500 XP e historial. Las pruebas públicas no crean identidades remotas ni envían correo.

Validación 0.14: toda la suite SQL anterior más `route-community.mjs` comprueba orden fijo (incluyendo empates y varios quizzes en una dificultad), rechazo de saltos, intento activo/reintentos, títulos ausentes, privacidad y opt-in de comunidad, 31 cosméticos en siete categorías, límites de XP y migración reejecutable sin reinicio. `home-v14.py` prueba el logo, ruta horizontal, comunidad real local, altas/bajas, vistas previas/equipamiento/persistencia, temas/fuentes legibles, movimiento reducido y continuación con un clic. `audio.py` comprueba señal de efectos, silencio inactivo incluso con preferencias antiguas de música, mute/volumen y pausa. Sin solicitudes de escritura ni correos a producción.


Validación 0.15: `v15.mjs` comprueba 96/480, catálogo anterior archivado, reanudación, orden, ausencia de soluciones, cupón único, separación nivel 5/6, permisos de canje, propiedad de cosméticos y reejecución sin pérdida de XP. `rewards-v15.py` prueba exportación PNG, privacidad entre cuentas, enlaces y texto preparado, consumo exclusivo por dueño y avance automático sin saltos por doble toque. `node scripts/assemble-v15.mjs` reconstruye el SQL completo desde el lote revisado.

Validación 0.16: `community-v16.mjs` comprueba inclusión automática, orden por XP, empates, top doce/puesto propio, privacidad, permisos y reejecución. Las pruebas de interfaz comprueban altura compacta, cofres pendientes en perfil, ausencia de historial de aperturas, indicadores de cartas nuevas y continuidad del juego/cupón.
