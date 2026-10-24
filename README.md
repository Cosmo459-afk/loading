# LOADING ARCADE 0.7 — progresión y vestuario

Entrega de desarrollo, **sin publicar en Cloudflare ni aplicar SQL al proyecto remoto**. Las versiones anteriores se conservan en sus ZIP. La versión 0.4 fue probada por el propietario con registro y una partida real guardada; los flujos nuevos de esta entrega necesitan su comprobación real después de instalarla.

## Qué cambia

- PS1 y PS2 están disponibles desde el inicio. **Dentro de cada consola**, completar todas las fáciles abre Medio y completar todas las medias abre Difícil. No es necesario avanzar una consola para jugar la otra. El servidor exige los bloqueos, incluido el endpoint libre antiguo. Los niveles ganados se conservan cuando se agrega contenido nuevo.
- Diez preguntas nuevas sobre estudios desarrolladores, con referencias por pregunta en `content/question-batch-v07.json`. Tras la actualización habrá 30 preguntas y seis trivias: una fácil, media y difícil por consola.
- Vestuario con seis cosméticos guardados en la cuenta: gafas neón (500 XP), fondo violeta (1.000), gafas hielo (1.500), gorra arcade (2.000), fondo noche (3.500), corona de avatar (5.000). Solo cambian las mascotas; no dan ventajas, puntos ni respuestas. Las fotos mantienen su aspecto.
- Camino de recompensas con cromos y cosméticos, siguiente hito en el inicio y aviso al conseguirlos. El balance es inicial y revisable con partidas reales; los umbrales anteriores de cromos se conservan.
- Clasificación acordada: **objetos comunes, armas épicas, personajes legendarios**. «Rara» queda reservada hasta definir un criterio distinto. La Llave insignia pertenece a Resident Evil 4, confirmado por el propietario; no se inventó su función.

Se conservan perfiles, mascotas, foto opcional, tres cromos destacados, historial, puntuación en servidor, contadores de trivias únicas y recuperación del guardado sin duplicar XP. Terminar una trivia cuenta incluso con cero aciertos; repetirla no aumenta el contador de completadas. Mix retro es libre, no completa el catálogo por consola, y sus niveles avanzados requieren haberlos ganado para las consolas que mezcla. Invitados sin identidad pueden probar partidas fáciles; para guardar progreso y abrir niveles, crear un jugador sin correo o entrar con una cuenta existente.

## Arte y cofres: estado real

El formato de cartas está en exploración y **todavía no reemplaza las ilustraciones del álbum**. Ver `design/cromos.md` y `design/card-references.json`: distinguen datos confirmados de pendientes. No usar el primer mockup que atribuía la llave a Kingdom Hearts; fue un error corregido con la información del propietario. No inventar nombres, funciones, versiones o procedencias por parecido visual.

La propuesta de comunes aseguradas y tiradas gratuitas para cartas superiores está documentada, pero **no hay cofres, RNG, tickets, monedas, duplicados ni porcentajes implementados**. Las recompensas actuales siguen siendo deterministas por XP. No hay pagos, ranking global, descuentos ni Google OAuth.

## Instalación en Supabase antes de publicar

Para un proyecto que ya tiene 0.6:

1. No volver a ejecutar `setup.sql` ni `upgrade-v06.sql`.
2. En **SQL Editor → New query**, ejecutar **`supabase/upgrade-v07.sql` una sola vez**. Agrega desbloqueos, cosméticos, selección del avatar, clasificación de cromos y las diez preguntas nuevas. Conserva cuentas, XP, partidas y colecciones. Si aparece un error, compartirlo antes de repetir fragmentos.
3. El resultado final debe mostrar seis filas, una trivia por consola/dificultad. Los niveles reales se identifican con easy/medium/hard.
4. En **Authentication → Sign In / Providers → User Signups**, mantener **Allow anonymous sign-ins** habilitado. Dejar **Confirm email** activado para la vinculación opcional. Una identidad anónima tiene sus propios datos privados; no equivale a dar acceso público a los perfiles.

Para una base nueva: ejecutar `setup.sql`, después `upgrade-v06.sql` y después `upgrade-v07.sql`. No ejecutar además los archivos individuales de `migrations`, pues contienen los mismos cambios.

La URL y la clave publicable están en `src/config.js`; no se necesita contraseña ni service_role en el navegador. RLS y funciones restringen datos y operaciones. Las preguntas y soluciones están en un esquema privado; el servidor selecciona el pack, valida las respuestas y calcula puntos. Los cosméticos se validan por slot y XP. Las fotos pequeñas se guardan comprimidas en el perfil privado, sin bucket público.

## Acceso sin correo y recuperación

La partida rápida no crea identidad ni guarda XP. CREAR MI JUGADOR crea una identidad anónima de Supabase sin pedir correo. Después de tres partidas o un día, aparece un recordatorio opcional para vincularlo; se puede posponer 24 horas. No bloquea ni programa el borrado del progreso.

Sin vincular, cerrar sesión, borrar datos del navegador o cambiar de dispositivo puede dejar al jugador sin acceso a su identidad, aunque los registros sigan en Supabase. Vincular un correo mediante enlace conserva el UID, XP y partidas; abrir ese enlace en el mismo navegador. Las cuentas antiguas siguen entrando por YA TENGO CUENTA. No se fusionan dos cuentas existentes automáticamente. Antes de abrir altas anónimas a gran escala, integrar CAPTCHA y revisar límites de Auth/correo. Para muchos destinatarios, revisar SMTP propio y límites vigentes de Supabase.

## Desarrollo

Node >=22, npm y Python 3. Utilizar el checkout existente `/workspace/loading`; las tareas de nube ya están aisladas, no crear worktrees salvo pedido explícito.

```sh
npm ci
npm run build
python -m http.server 8080 --bind 0.0.0.0
```

El `index.html` raíz es fuente y carga `assets/cloud.bundle.js`. **`dist/index.html` es el HTML completo para desplegar**, con SDK incluido y sin CDN. No probar Auth con file://. `loading-arcade-v07.zip` contiene ese HTML, estas instrucciones y las licencias.

## Validación

Con el servidor local iniciado y Playwright para Python/Chromium del sistema disponibles:

```sh
python tests/smoke.py
npm ci --prefix supabase
npm run test:database
```

Para integración completa, iniciar en otra terminal `npm run test:fixture` y luego ejecutar `npm run test:browser`. La fixture usa PostgreSQL local (PGlite), usuarios ficticios y Auth simulado; nunca desplegarla. Las solicitudes al proyecto se interceptan; no envía correo ni escribe en la base remota. `ARCADE_URL` permite cambiar el puerto de pruebas.

Se probaron los bloqueos independientes por consola y el rechazo del salto directo por API; preservación de XP y desbloqueos; diez preguntas nuevas; equipar/quitar cosméticos, límites de XP y slot, persistencia y aislamiento. También solicitudes/callbacks PKCE simulados, invitado, progreso de usuario, fotos, historial, reintento tras un resultado ya guardado sin duplicar XP, HTML de un solo archivo y tamaños móviles. El informe de fuentes y sus límites está en `content/research/README.md`; no se afirma haber verificado fuentes oficiales que la red bloqueó.

Estas pruebas no sustituyen la comprobación de correo, registro anónimo y partidas en el proyecto Supabase real después de aplicar la actualización.

## Actualizar Cloudflare tras aprobar la publicación

1. Guardar el despliegue anterior para poder volver atrás y aplicar primero la actualización SQL.
2. En **Workers & Pages → loading-arcade → New deployment**, cargar únicamente el `index.html` del ZIP (es `dist/index.html`), en la raíz. No subir el ZIP entero, tests, SQL, fixture ni node_modules.
3. **Deploy** actualiza la web pública. Conservar Worker, dominio y configuración existentes.
4. Confirmar **Versión 0.7** en el pie. Comprobar el inicio con la cuenta existente y, en una ventana privada, el jugador sin correo.
5. Verificar PS1 y PS2 abiertas; completar PS2 Fácil y comprobar que abre solo PS2 Medio; completar PS2 Medio y comprobar que abre PS2 Difícil. Probar vestuario al alcanzar sus XP, recargar y comprobar los cambios. Revisar perfil y partidas en Supabase y recuperar la cuenta vinculada en otro dispositivo.

Mantener Site URL y Redirect URLs de Supabase en `https://loading-arcade.tienda-somosloading.workers.dev/`. Para pruebas locales agregar solo el origen exacto utilizado, sin comodines amplios. Nada de este repositorio publica o ejecuta SQL automáticamente.
