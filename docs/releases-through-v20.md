# LOADING ARCADE 0.20

Revisión móvil, imágenes bajo demanda y administración del dueño. Mantiene las trivias, rachas, likes, foro, colecciones, XP, cofres y cupones existentes.

## Actualizar desde 0.19

1. Ejecutar **todo** [`supabase/upgrade-v20.sql`](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/upgrade-v20.sql) en **Supabase → SQL Editor → New query → Run**. No reinicia datos.
2. Para habilitar administración: abrir [`supabase/grant-admin.sql`](https://github.com/Cosmo459-afk/loading/blob/supabase-setup/supabase/grant-admin.sql), copiarlo en una consulta nueva y reemplazar **CORREO_DEL_DUENO** por el correo personal elegido, **solo dentro de Supabase**. No se guarda el correo personal en el repositorio público. La cuenta debe existir y tener el correo confirmado; si no, el script rechaza la habilitación.
3. Descargar `loading-arcade-v20.zip` y descomprimir. Dentro de `loading-arcade` está **sitio**, con `index.html`, `_headers` y la carpeta `assets`.
4. En **Cloudflare → Workers & Pages → loading-arcade → New deployment**, subir **la carpeta sitio completa**, conservando `assets/media`. **Ya no alcanza con subir solo index.html.** No subir la carpeta exterior con documentación ni SQL.
5. Confirmar «Versión 0.20». Entrar con el correo habilitado y recargar: aparece **ADMINISTRACIÓN**. Las demás cuentas no ven ese acceso y el servidor rechaza sus llamadas administrativas.

Si todavía jugás sin correo, vinculá y confirmá el correo desde **Guardar mi acceso** antes del paso 2; eso conserva el mismo jugador. Si el correo ya pertenece a otra cuenta, no hay fusión automática: entrar a esa cuenta por correo conserva cada jugador separado. El correo elegido para administración no se publica en Comunidad.

## Qué cambia en la carga

El HTML pasó de unos 18 MB a menos de 500 KB. El logo se solicita al entrar; el arte de cartas y el cupón son archivos separados que se solicitan cuando hacen falta. Las imágenes de cartas usan observación de visibilidad, incluso dentro de pantallas ocultas y modales. Al abrir un cofre se empieza a cargar el arte confirmado mientras termina la animación.

Las imágenes mantienen sus bytes y diseños originales aprobados: cuatro láminas compartidas de RE4, el logo y el cupón. No se han redibujado ni reemplazado. Al consultar una carta puede descargarse la lámina que comparte con otras; no se descargan las cuatro al entrar. Los nombres de archivo incluyen hash y `_headers` permite caché duradera sin quedarse con versiones antiguas de los artes. El HTML se revalida al actualizar.

Las cartas no obtenidas siguen ocultas en la interfaz. Los archivos de arte son públicos: esta carga bajo demanda no es un sistema de confidencialidad frente a inspección de recursos. No anunciar que los archivos están protegidos por propiedad.

Las exportaciones del cupón y de logros siguen generándose en el navegador con imágenes del mismo origen. Los datos de canje y las soluciones no están dentro del paquete estático.

## Revisión móvil

Accesos de inicio en dos columnas en celulares pequeños, etiquetas legibles, controles de al menos 44–48 px, formularios de 16 px para evitar zoom automático al escribir, diálogos con desplazamiento propio y espacio reservado para imágenes. Se conserva el progreso compacto, las miniaturas, el detalle con acciones, el avance al tocar una respuesta y el uso con movimiento reducido. No se agrega música; siguen los efectos.

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

La fixture local se inicia con `npm run test:fixture`. Servir el repositorio en el puerto 8085 y abrir `/dist/index.html`. Las pruebas que reinician esa fixture deben correr **secuencialmente**. `tests/admin-speed-v20.py` verifica peticiones diferidas, exportación de cupón, autorización, formulario/revisión/publicación, canje, moderación segura y revocación. La suite SQL incluye `admin-v20.mjs` para permisos, validación, borradores e idempotencia. Ninguna prueba envía correos, mensajes o cambios al proyecto real.

El paquete solo contiene el sitio público, estas instrucciones y licencias. No desplegar SQL, el banco JSON con soluciones, la fixture, tests, node_modules ni claves de servicio.

## Historial y pendientes

El historial de instalación anterior está en `docs/releases-through-v19.md`. Sus instrucciones de subir un único HTML corresponden a versiones anteriores: **para 0.20 se sube sitio completo**. No ejecutar reinicios viejos.

Siguen pendientes el desafío semanal real, su ranking y carta exclusiva; las imágenes de Metal Gear Solid, Silent Hill 2 y Parasite Eve II; y la automatización de canjes en Tienda Nube. Esta versión no agrega intercambios de cartas ni nuevos premios.
