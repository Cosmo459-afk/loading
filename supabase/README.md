# Primera preparación de Supabase

Estado: el propietario confirmó la ejecución de `setup.sql` con 20 preguntas. No volver a ejecutarlo en ese proyecto. La conexión web está preparada en 0.4; falta una prueba real de correo/cuenta antes de publicar. Ver el README raíz para las URL de Auth y el proceso de despliegue. La clave publicable no da permisos de administración ni sirve para ejecutar esta migración.

## Paso del propietario

En el proyecto `epnflypuxcfeexaqwlba`:

1. Abrir **SQL Editor → New query**.
2. Copiar el contenido completo de `setup.sql` y pulsar **Run**, una sola vez, sobre el proyecto nuevo. Todo el script está en una transacción; no borra tablas existentes. Si encuentra objetos previos con los mismos nombres, se detiene para revisar su estado en lugar de reemplazarlos.
3. El resultado final debe mostrar `preguntas_cargadas = 20`.
4. En **Table Editor** aparecerán `arcade_profiles`, `arcade_games` y `arcade_cards`. Las preguntas y las respuestas están en el esquema privado `arcade_private` para que el cliente no pueda descargar las soluciones.

Si aparece un error, compartir el mensaje de error; no ejecutar fragmentos al azar ni repetir una migración que ya terminó correctamente.

## Qué guarda

- Perfiles vinculados al usuario real de Supabase Auth: apodo, avatar, foto opcional comprimida, XP, partidas, tres cromos destacados y fecha de alta.
- Cada partida: dueño, categoría, dificultad, fechas de inicio/finalización, aciertos y puntuación.
- Preguntas de cada partida: copia del enunciado, opciones, respuesta elegida, solución y explicación. Los cambios futuros al banco no alteran una partida ya iniciada.
- Catálogo de ocho cromos y umbrales de XP. La propiedad se deriva de XP, no de un dato modificable por el cliente.

Las fotos pequeñas se guardan como datos de imagen en el perfil privado por ahora; no se necesita crear un bucket público. No hay ranking público ni datos de correo expuestos en estas tablas. Los correos y sesiones los gestiona Supabase Auth.

## Permisos y puntuaciones

RLS permite a cada jugador leer solo su perfil y partidas. El navegador no puede insertar partidas, cambiar XP ni leer las soluciones. Las funciones autenticadas `arcade_save_profile`, `arcade_feature_cards`, `arcade_start_game` y `arcade_submit_game` validan las operaciones. El servidor selecciona cinco preguntas y calcula los puntos a partir de cinco respuestas; no acepta una puntuación enviada por el jugador. Reintentar un resultado no duplica XP. Un jugador no puede enviar la partida de otro.

La revisión de respuestas se entrega al finalizar la partida; el frontend de 0.4 ya muestra esa revisión al finalizar. Esto no elimina toda posibilidad de automatización o trampas; antes de un ranking competitivo harán falta controles adicionales. El banco local de la v0.3 ya contiene soluciones públicas, de modo que el servidor no convierte ese contenido conocido en secreto.

## Comprobación local

Desde `supabase/`, instalar dependencias con `npm ci` y ejecutar `npm test`. PGlite ejecuta PostgreSQL local con dos identidades de prueba y una simulación mínima de `auth.uid()`. Se verifica: creación del esquema, las 20 preguntas, perfiles autenticados, aislamiento entre usuarios, bloqueo de acceso anónimo, puntuación calculada, reintentos, respuestas inválidas, cromos bloqueados/duplicados y límite entre inicios de partida. Estas pruebas no verifican la configuración de Auth, correo o la red del proyecto Supabase real.

## Pendiente antes de publicar

- La instalación inicial de `setup.sql` fue confirmada por el propietario; no repetirla.
- El frontend de 0.4 ya incorpora acceso por correo. Configurar Site URL/redirects para el dominio de Cloudflare y un entorno de prueba. Revisar límites de correo de Supabase y configurar SMTP propio antes de abrir registros a muchos jugadores.
- El frontend de 0.4 ya usa los RPC. Falta validar partidas desde dos cuentas reales y dos dispositivos. No transferir XP local al servidor como puntuación competitiva verificada.
- Verificar envío y recepción de correo y políticas reales con la clave publicable. `src/config.js` contiene solo configuración pública y es incluido en el bundle de 0.4.
- Aprobar el despliegue en Cloudflare. Nada de esta carpeta publica ni cambia la versión pública automáticamente.

La red inicialmente bloqueó el proyecto. En la comprobación posterior, `/auth/v1/settings` respondió HTTP 200 y confirmó correo habilitado; la lectura de `arcade_cards` sin sesión fue rechazada con permiso denegado, según lo previsto. No se enviaron correos ni se crearon usuarios reales durante estas pruebas.

## Actualización 0.5

No requiere nueva migración. Las identidades anónimas de Supabase Auth tienen rol authenticated y las políticas existentes siguen aislando por auth.uid(). Habilitar Anonymous Sign-ins en Authentication → Sign In / Providers → User Signups. No desactivar la confirmación de correo; se usa solo al vincular. src/cloud.js usa signInAnonymously para el alta y updateUser para vincular sin cambiar de UID. La vinculación de dos cuentas existentes no está implementada. Ver README raíz para el detalle y los pendientes de validación real.
