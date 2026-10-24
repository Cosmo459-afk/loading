# LOADING ARCADE 0.8 — aprobación y avisos de progreso

Entrega para revisión. No aplica SQL remoto ni publica en Cloudflare automáticamente. Las cartas nuevas, cofres, monedas, descuentos y ranking semanal todavía no están implementados.

## Cambios

- Trivias del recorrido: aprobación con 3/5. Se puede reintentar hasta aprobar; los intentos fallidos no muestran soluciones ni dan XP. Al aprobar, se cierra la trivia y se muestran las explicaciones.
- Recompensa única: 200 XP por aprobar + 100 por acierto + 200 si son cinco aciertos. Totales: 500, 600 o 900 XP. El servidor impide repetir trivias aprobadas y otorgar puntos dos veces, incluso ante reintentos de red. El contador de partidas incluye intentos fallidos; el de trivias completadas solo aprobadas.
- Práctica Mix: sin XP ni progreso. Evita conseguir recompensas repitiendo partidas libres. Invitados pueden probar las partidas fáciles sin guardar progreso.
- PS1/PS2 independientes; aprobar todas las fáciles de una consola abre sus medias, y aprobar todas las medias abre sus difíciles. Los niveles ganados se conservan al agregar contenido.
- Aviso de nivel/recompensa durante 6,5 segundos, accesible mediante `role=status`. Botón global con insignia persistente hasta revisar Recompensas. La marca de lectura se guarda en Supabase por jugador y funciona entre dispositivos.
- Solo mascotas y cosméticos: se retira la foto del flujo y las fotos antiguas dejan de mostrarse. No se borran archivos/datos históricos; guardar el perfil usa `photo=null`. Se conservan apodo, avatar elegido, XP y cosméticos.
- Trivias en curso se pueden retomar seleccionando la opción «en curso». Una sola trivia de catálogo activa por jugador, con vencimiento de 24 horas. Las respuestas se envían al final; al retomar antes de enviarlas se vuelve a la primera pregunta del mismo intento.
- Carga por lotes sin cambios de código: ver [content/batches/README.md](content/batches/README.md). Validador offline con fuentes y generación de SQL transaccional. No es todavía un panel administrativo.

## Actualizar desde 0.7

1. Ejecutar **`supabase/upgrade-v08.sql` una sola vez** en SQL Editor de Supabase. No repetir setup ni upgrades anteriores. SQL y `migrations/202610240003_approval_notifications.sql` contienen lo mismo: usar solo uno.
2. Las partidas anteriores de catálogo ya terminadas siguen completadas, cualquiera fuera su resultado. No se quitan XP, cosméticos ni dificultades ganadas. Las notificaciones iniciales parten del XP actual, sin marcar todas las recompensas históricas como nuevas.
3. El resultado muestra las seis filas actuales por consola/dificultad. Si hay error, compartirlo antes de repetir fragmentos.
4. Descargar `loading-arcade-v08.zip`, descomprimir y cargar **solo su `index.html`** en Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy. Ese HTML es `dist/index.html`; no usar el fuente raíz.
5. Confirmar «Versión 0.8» en el pie. Probar una trivia pendiente: fallar, reintentar, aprobar y comprobar el bloqueo; verificar aviso/insignia y vestuario.

Base nueva: `setup.sql` → `upgrade-v06.sql` → `upgrade-v07.sql` → `upgrade-v08.sql`. No aplicar también las migraciones individuales.

Mantener Anonymous Sign-ins habilitado y Confirm email para vinculación opcional. Site URL/Redirect URL: `https://loading-arcade.tienda-somosloading.workers.dev/`. Configuración pública en `src/config.js`. No usar service_role ni contraseñas en el navegador.

## Desarrollo y pruebas

Node >=22, npm, Python y Playwright/Chromium del sistema. Checkout `/workspace/loading`.

```sh
npm ci
npm ci --prefix supabase
npm run build
npm run test:database
python -m http.server 8080 --bind 0.0.0.0
```

En otra terminal iniciar `npm run test:fixture`, y luego `npm run test:browser`. `ARCADE_URL` permite cambiar el puerto. La fixture usa PostgreSQL local (PGlite) y Auth simulado: nunca desplegarla. Las pruebas interceptan las solicitudes al Supabase remoto; no envían correos ni modifican datos reales. `python tests/smoke.py` comprueba invitado y tamaños de pantalla.

`index.html` raíz carga el bundle de `assets/`; `dist/index.html` incluye el SDK y es independiente de CDN. El ZIP solo contiene el HTML desplegable, README y licencias; nunca subir JSON de preguntas, SQL ni fixture al Worker público.

Se comprueban: preservación de datos previos; RLS y aislamiento; aprobación y ocultación de soluciones al fallar; XP una sola vez; bloqueo de repetición; reanudación del intento activo; notificaciones; cosméticos; importación atómica y validación de lotes. Navegador: guardado interrumpido y recuperación sin duplicar XP, marcas persistentes, aviso de nivel, vestuario, HTML independiente y 24 combinaciones de pantalla/ancho. Auth real, entrega de correo y aplicación de migración remota requieren comprobación posterior por el propietario.

## Próximas etapas acordadas

- Desafío semanal temático de un juego original, aproximadamente 20 preguntas, un intento puntuable, ranking por aciertos y tiempo. Definir manejo de desconexiones y cierre antes de publicar. No utilizar el XP del recorrido como ranking competitivo.
- Carta exclusiva para cada participante con perfect score durante la semana, fuera de colecciones habituales y sin otra vía de obtención.
- Encuesta de cuatro juegos en Instagram; enlace desde la app. No publicar ni enviar mensajes automáticamente.
- Cofres en subidas de nivel; cosméticos entre niveles. Probabilidades propuestas 70% común, 15% monedas, 10% épica, 5% legendaria, pendientes de balance, utilidad de monedas, duplicados y garantía.
- Beneficio de compra accesible por progreso; falta definir porcentaje, condiciones, emisión y validación. No se anuncia un descuento que aún no existe.
- Colecciones iniciales: Resident Evil 4 PS2, Metal Gear Solid PS1, Silent Hill 2 PS2 y Parasite Eve 2 PS1, todos originales. Inicio propuesto por juego: ocho comunes, cuatro épicas y dos legendarias. Arte y referencias pendientes; no inventar metadata. El álbum actual conserva los cromos provisionales.

Los datos del recorrido actual pueden consultarse con la clave pública bajo RLS; las respuestas correctas y fuentes nuevas se guardan en esquema privado. El futuro ranking necesita su propia política competitiva y banco de preguntas, sin reutilizar preguntas expuestas en el modo invitado.
