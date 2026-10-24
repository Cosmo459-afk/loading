# LOADING ARCADE 0.13 — cartas Resident Evil 4 y audio retro

**Actualización de interfaz lista para instalar sobre 0.9–0.12.** No requiere SQL, no reinicia XP, partidas, cartas, cofres ni cuentas. No se ha desplegado Cloudflare desde el entorno de desarrollo.

El propietario confirmó la dirección «LOADING · Archivo Retro» de la primera propuesta y aclaró que las fotos son referencias para crear nuevas composiciones. Se renovaron los 14 artes de Resident Evil 4 a partir de las referencias y la muestra aprobada, cuidando la cara frontal cuadrada de la caja Red Hawk y los rasgos reconocibles de objetos y armas, con fondos oscuros y luz de inventario para objetos y armas, y ambientes del juego para los personajes. El marco es HTML/CSS reutilizable: bisel metálico, tipografía pixel Silkscreen, encabezado Archivo Retro, imagen protagonista, título/juego/descripción debajo y pie con rareza/número. Comunes azules, épicas violetas/rosas y legendarias doradas.

## Música y efectos originales

Audio procedural propio con Web Audio, sin grabaciones ni melodías tomadas de videojuegos y sin descargas adicionales. Bucle chiptune de menú y arreglo más suave durante la trivia; silencio musical en resultados y apertura para destacar las fanfarrias. Efectos al navegar, elegir respuesta, cambiar pregunta, aprobar/reintentar, desbloquear/equipar cosméticos, subir de nivel, abrir el cofre y revelar cada rareza. No se indica acierto/error al elegir: el resultado sigue reservado al cierre del quiz.

Control «♫ AUDIO» disponible en todas las pantallas, con interruptores y volúmenes separados para música y efectos; preferencias locales persistentes. No hay reproducción antes de interactuar. La música se pausa al ocultar la pestaña y se retoma al volver; se detienen las notas pendientes para evitar acumulaciones. Si Web Audio no está disponible o no logra iniciarse, se puede seguir jugando sin sonido. En móvil el primer toque habilita el contexto, sujeto a las políticas de sonido del dispositivo/navegador.

## Entrada única y portada

Se retiran la partida rápida, el modo invitado y el selector Mix libre. ENTRAR AL ARCADE crea una identidad anónima de Supabase sin pedir correo; después exige elegir apodo y avatar antes de jugar. El acceso antiguo `startMode('guest')` también conduce a crear/completar el personaje, sin abrir una partida local. Los endpoints libres antiguos del backend se conservan por compatibilidad, pero no aparecen ni se usan en la interfaz.

Tras crear o recuperar un jugador, el inicio muestra su avatar, apodo, nivel, XP total y cantidad de coleccionables. Desde ahí se accede a la ruta de trivias, colección misteriosa, avatar, historial y edición del perfil. La ruta de experiencia muestra el próximo nivel/cofre, XP restantes, barra real sobre 1.800 XP, siguiente hito y acceso destacado a los cofres pendientes.

Las partidas se guardan desde el principio en la identidad anónima; no se afirma que solo empiecen a guardarse al agregar correo. La vinculación opcional conserva el UID, puntos e historial y permite recuperar acceso. El recordatorio sigue apareciendo tras tres partidas o un día y se puede posponer, sin bloquear el juego. Las cuentas previas por correo se conservan.

El panel semanal está ubicado en el inicio y se muestra como **EN PREPARACIÓN**, sin jugadores, puntajes, posiciones ni fechas ficticias. **El desafío semanal y su ranking real todavía no están implementados ni publicados.** Esta entrega prepara el espacio en la portada; no anuncia una competencia activa ni inventa resultados.

## Descubrimiento y misterio

La entrada al álbum muestra solo los juegos disponibles y sus contadores reales, por ejemplo «Resident Evil 4 · 2 de 14 descubiertos». No hay galería desplegada de antemano ni desglose de las cartas pendientes por rareza.

Al abrir una colección se muestran únicamente las cartas obtenidas en cofres. Las pendientes se representan por un único aviso con dorso genérico y su cantidad, sin nombres, descripciones, siluetas, colores de rareza ni controles de vista previa. La primera revelación ocurre en la apertura del cofre. Solo las cartas propias se pueden ampliar o destacar en el perfil; intentar abrir una no obtenida por el controlador de detalle no abre el modal.

Los artes y nombres de producción se conservan en los recursos del HTML independiente; esta entrega implementa el misterio de la interfaz, no un sistema de confidencialidad de assets frente a inspección del código. No afirmar que los recursos ausentes de la interfaz no viajan al cliente. Una entrega selectiva por propiedad requeriría cambiar a recursos remotos autenticados.

## Actualizar desde 0.9–0.12

Descargar `loading-arcade-v13.zip`, descomprimir y subir **solo `index.html`** a Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy. Confirmar «Versión 0.13» en el pie y refrescar con Ctrl+F5 si todavía aparece la anterior. No volver a ejecutar SQL para este cambio visual.

## Reglas implementadas

- Resident Evil 4 original: 14 coleccionables confirmados por el propietario, ocho comunes azules, cuatro épicos violetas/rosas y dos legendarios dorados. Arte y marco «Archivo Retro» uniformes; nombre y descripción siguen siendo texto accesible y editable. Contador por colección, detalle de cartas propias y tres destacados en el perfil.
- **Las cartas solo se obtienen abriendo cofres**, nunca por XP directamente. Un cofre al subir cada nivel; **1.800 XP por nivel**. Una trivia perfecta entrega 900 XP: dos perfectas suben un nivel. El jugador comienza en nivel 1 y su primer cofre corresponde al nivel 2.
- Probabilidades iniciales **85% común, 10% épica y 5% legendaria**. Se reasignó a comunes el 15% de monedas descartado por el propietario. **Sin monedas y sin repetidas**. Al agotar una rareza se elimina del sorteo y se normalizan proporcionalmente los pesos restantes. Con la colección completa, los cofres pendientes permanecen cerrados para futuras incorporaciones.
- Sorteo en servidor; premio e inventario guardados en la misma transacción. Doble clic, recarga, corte de red y otro dispositivo devuelven el mismo resultado ya guardado. No hay pagos ni compra de cofres.
- Evento de apertura: cofre que se agita, tapa que se abre, brillo y revelación de la carta; respeta movimiento reducido. El premio queda consultable desde Mis cofres. Las probabilidades y la regla de no repetición se muestran antes de abrir.
- Cosméticos entre niveles: gafas neón 500 XP, fondo violeta 1.000, gafas hielo 1.500, gorra 2.000, fondo noche 3.500, corona 5.000. Se guardan al equiparlos; son únicamente visuales.
- Trivias por consola: aprobar con 3/5; reintentar hasta aprobar, sin mostrar soluciones al fallar. Recompensa única: 200 XP por aprobar + 100 por acierto + 200 por perfecta; totales 500/600/900. Una aprobada no se repite. Todas las partidas visibles requieren un personaje y guardan su resultado. PS1 y PS2 independientes; fáciles → medias → difíciles.
- Aviso de nivel y recompensas, botón con insignia persistente y contador de cofres sin abrir. Perfil solo con mascotas y cosméticos, sin foto.
- Carga de trivias por lotes sin actualizar HTML: ver `content/batches/README.md`. Las preguntas/soluciones/fuentes se guardan en esquema privado. Todavía no es un panel administrativo.

## Instalación histórica del backend 0.9 — solo si todavía falta

El propietario pidió eliminar todo el catálogo anterior y permitió reiniciar la experiencia. **`supabase/upgrade-v09.sql` borra XP, historial de partidas, dificultades desbloqueadas, destacados, cosméticos equipados y cartas anteriores**. Conserva cuentas, apodos, avatar elegido, vinculación de correo y preguntas publicadas. Instala únicamente las 14 cartas nuevas, inicialmente sin propietarios ni cofres.

Para actualizar, ejecutar **solo `supabase/upgrade-to-v09.sql`**: detecta si el proyecto está en 0.7 u 0.8 y aplica lo necesario en una transacción. En la primera instalación reinicia los datos de prueba; si se ejecuta otra vez tras una instalación correcta, conserva el progreso nuevo. El resultado debe mostrar common 8, epic 4 y legendary 2. No ejecutar además los upgrades individuales ni `migrations`.

Después subir el HTML actual. Probar dos trivias perfectas para recibir un cofre de nivel 2, abrirlo y verificar el contador 1/14 en el álbum. Este paso SQL es únicamente para instalar el backend 0.9 que aún falte; no es parte de la actualización de interfaz 0.13.

Base nueva: `setup.sql` → `upgrade-v06.sql` → `upgrade-v07.sql` → `upgrade-to-v09.sql`. No ejecutar también 0.8/0.9 individuales: el archivo único ya los incluye.

La corrección del límite SQL de puntuación a 900 está en `upgrade-v08.sql` y también en 0.9 para proyectos que ya habían aplicado la revisión previa de 0.8.

## Imágenes y paquete

Catálogo en `content/collections/re4.json`. Los 14 archivos originales aportados por el propietario se conservan sin cambios como referencias; su procedencia y hashes están en `content/collections/re4-image-provenance.json`. La autorización para mantener la referencia del medallón del remake sigue documentada, sin atribuir esa captura a la edición original.

Los artes de producción están en `assets/cards/re4/art-v13/`: cuatro láminas de arte que la UI presenta como 14 imágenes individuales mediante recortes SVG. El marco y textos se generan por separado en `src/cards.css` y `cardMarkup`, evitando texto rasterizado. `content/collections/re4-art-provenance-v13.json` registra los originales generados y hashes; `originalImageFile` conserva el vínculo con la referencia. No usar el arte como fuente de nombres, funciones o lore: esos metadatos confirmados no cambiaron.

El build incrusta cada lámina una sola vez, junto con Silkscreen Bold (OFL) y los estilos; sin CDN ni fuentes externas. El HTML final es independiente y está dentro del límite de tamaño de assets estáticos. El build falla si falta arte. `npm run build:preview` solo sirve para desarrollo y no debe empaquetarse.

`loading-arcade-v13.zip` contiene el HTML independiente, README y licencias. No subir al Worker los JSON con respuestas, SQL, tests, fixture ni node_modules. Para reconstruir: `npm run build` y `node scripts/package-release.mjs`. Los ZIP previos se conservan como versiones históricas. No aplicar de nuevo la migración 0.9 al actualizar solo la interfaz.

## Desarrollo y validación

Node >=22, npm, Python, Playwright y Chromium del sistema. Checkout `/workspace/loading`.

```sh
npm ci
npm ci --prefix supabase
npm run build
npm run test:database
python -m http.server 8080 --bind 0.0.0.0
```

En otra terminal: `npm run test:fixture`. Luego `npm run test:browser` y `python tests/smoke.py`. `ARCADE_URL` cambia el puerto. La fixture usa PGlite y Auth simulado; las solicitudes de integración se interceptan y no escriben en Supabase remoto ni envían correos. Nunca desplegar la fixture.

Pruebas de servidor: reinicio autorizado conserva identidades; catálogo 8/4/2; dos perfectas entregan 1.800 XP y un solo cofre; XP sin cartas; partición exacta de probabilidades 85/10/5; normalización de rarezas agotadas; 14 premios únicos; colección completa no consume cofres; reintentos idempotentes, aislamiento por usuario y rechazo de escrituras/invocaciones privadas.

Pruebas de navegador: perfil, aprobación, recuperación de guardado interrumpido, avisos, dos perfectas/nivel, vestuario, álbum y contadores, apertura animada, recuperación tras abrir en servidor pero recibir error de red, consulta del mismo premio, destacados, detalle y 40 combinaciones de pantalla/ancho. Se comprueban la vista inicial de colecciones sin cartas desplegadas, ausencia de nombres/arte/controles de cartas pendientes incluso en el DOM del álbum, rechazo de vista directa de una carta no obtenida, revelación del primer premio por cofre, vista y destacados solo de la carta propia, y persistencia del contador/XP/inventario al recargar. También se comprueba el upgrade desde 0.7 y 0.8 y su reejecución sin otro reinicio.

Mantener Anonymous Sign-ins habilitado y Confirm email para vinculación opcional. Site URL/Redirect URL: `https://loading-arcade.tienda-somosloading.workers.dev/`. Configuración pública en `src/config.js`; no usar service_role ni contraseñas en el navegador. Correo real y despliegue remoto necesitan comprobación posterior.

## Pendientes posteriores

- Imágenes de las siguientes colecciones: Metal Gear Solid PS1, Silent Hill 2 PS2 y Parasite Eve 2 PS1, todos originales.
- Más trivias: el catálogo actual tiene seis; todas perfectas permiten tres cofres. Para completar la colección harán falta nuevos desafíos, sin habilitar repetición de trivias aprobadas.
- Desafío semanal temático de unas 20 preguntas, un intento, ranking por aciertos/tiempo y carta exclusiva por perfect score. Encuesta de cuatro juegos en Instagram con enlace desde la app.
- Beneficio de compra accesible por progreso; porcentaje, condiciones y validación pendientes. No anunciar descuentos inexistentes.


Validación 0.12: entrada anónima sin email, selección obligatoria de personaje, bloqueo del acceso invitado antiguo y ausencia del Mix en la interfaz; dashboard con usuario, 1.800 XP y cofre; estado semanal pendiente honesto; tres partidas sin correo y recordatorio posponible; vinculación PKCE simulada conserva UID, 1.500 XP e historial. Las pruebas públicas no crean identidades remotas ni envían correo.

Validación 0.13: `python tests/audio.py` comprueba la señal real del grafo Web Audio, ausencia de autoplay, música/efectos con mute independiente, persistencia de ambos volúmenes, pausa/reanudación en segundo plano, resultados sin música, controles responsive y fallback sin AudioContext. `tests/cloud.py` valida que la nueva interfaz mantiene progreso, misterio y premios. No requiere SQL ni reinicio.
