# Registro para el desafío semanal

## Qué queda instalado

- Las trivias normales siguen disponibles con personaje sin registro.
- Para iniciar un nuevo semanal se requiere una cuenta verificada. El servidor comprueba Supabase Auth, no un valor enviado por el navegador.
- Se admite confirmación de correo o identidad oficial de Google/Facebook. El botón de cada red solo aparece si el proveedor figura habilitado en la configuración pública de Supabase.
- Vincular usa `linkIdentity` y conserva el mismo jugador, apodo, XP y cartas. Si la identidad pertenece a otra cuenta, se informa el conflicto y no se cambia de cuenta ni se fusionan puntos.
- Abrir la pantalla de registro o confirmar el acceso no inicia un intento. Se vuelve al semanal y el jugador debe confirmar Comenzar.
- Los resultados previos se conservan. Los intentos ya iniciados antes de la instalación pueden terminar con su reloj original; la exigencia afecta a intentos nuevos.
- Es un intento por cuenta y edición. Una cuenta verificada no garantiza una persona única; varias cuentas sociales siguen siendo posibles. Seguir en redes no sustituye la verificación.

## Instalación

1. Ejecutar **todo** `supabase/upgrade-v46.sql` en Supabase SQL Editor.
2. Subir `sitio` completa de `loading-arcade-v46.zip` a Cloudflare.
3. En Supabase, Authentication → URL Configuration, establecer la URL pública de producción:
   `https://loading-arcade.tienda-somosloading.workers.dev/`
   Agregar esa URL a las Redirect URLs permitidas. Si se usa otro dominio o ruta, agregar también la URL exacta desde la que se juega.
4. Mantener habilitada la confirmación del correo; no activar auto-confirmación para los registros por correo.
5. Para convertir jugadores anónimos mediante redes, habilitar **manual identity linking / vinculación manual de identidades** en las opciones de Authentication. No es lo mismo que habilitar Google/Facebook.

El correo ya funciona con el mecanismo existente. Consultado el 27/10/2026: correo habilitado, auto-confirmación deshabilitada y Google/Facebook deshabilitados. La configuración puede cambiar en el panel del propietario.

## Activar Google

1. En Google Cloud, configurar la pantalla de consentimiento y un cliente OAuth de tipo aplicación web.
2. Agregar como URI de redirección autorizada el callback de Supabase:
   `https://epnflypuxcfeexaqwlba.supabase.co/auth/v1/callback`
3. Copiar el Client ID y Client Secret **solo a Supabase**, Authentication → Providers → Google. Habilitar y guardar.
4. Revisar el modo de publicación de Google: si está en pruebas, solo ingresan los usuarios autorizados para probar.
5. Habilitar la vinculación manual y recargar el Arcade. El botón aparecerá automáticamente.

Guía oficial: https://supabase.com/docs/guides/auth/social-login/auth-google

## Activar Facebook

1. Crear/configurar la aplicación en Meta for Developers y su producto Facebook Login.
2. Agregar el mismo callback de Supabase en Valid OAuth Redirect URIs:
   `https://epnflypuxcfeexaqwlba.supabase.co/auth/v1/callback`
3. Copiar App ID y App Secret **solo a Supabase**, Authentication → Providers → Facebook. Habilitar y guardar.
4. Completar las condiciones de Meta para acceso público. En modo desarrollo no puede asumirse que cualquier jugador pueda entrar; comprobar con una cuenta ajena al equipo de la app.
5. Habilitar la vinculación manual y recargar el Arcade.

Guía oficial: https://supabase.com/docs/guides/auth/social-login/auth-facebook
Vinculación de identidades: https://supabase.com/docs/guides/auth/auth-identity-linking

No pegar secretos de Google o Meta en el HTML, GitHub ni el chat. Las credenciales van en el proveedor de Supabase. Esta versión no instala SMS/WhatsApp ni genera gastos de mensajes.

## Comprobación real antes de anunciar redes disponibles

- Probar desde un jugador sin registrar que ya tenga XP/cartas. Vincular y confirmar que conserva el mismo personaje, nombre, XP y cartas.
- Probar desde otro navegador sin sesión el ingreso con una cuenta existente.
- Comprobar el correo de confirmación y el retorno en el mismo navegador; los códigos PKCE dependen de ese navegador.
- Si una red restringe los navegadores integrados de Instagram/Facebook, probar «Abrir en el navegador».
- Confirmar que el semanal no crea un intento antes del botón Comenzar y rechaza llamadas directas sin verificación.

Las pruebas automatizadas cubren SQL real local y el SDK con proveedores simulados. No sustituyen la prueba real después de configurar Google/Meta.

## Publicar en Google: Información de la marca

Google exige nombre de app, correo de asistencia, URL válida de página principal y URL válida de política de privacidad para pasar a producción externa (confirmado en la ayuda del botón Publicar app).

Después de subir v47 completa a Cloudflare y comprobar que ambas páginas abren sin sesión:

- Página principal: `https://loading-arcade.tienda-somosloading.workers.dev/`
- Política de privacidad: `https://loading-arcade.tienda-somosloading.workers.dev/privacidad.html`
- Dominios autorizados: `epnflypuxcfeexaqwlba.supabase.co` y `tienda-somosloading.workers.dev`. Los dominios base compartidos `supabase.co` y `workers.dev` figuran en la Public Suffix List; no son los dominios privados del proyecto.
- El callback en Clientes sigue siendo `https://epnflypuxcfeexaqwlba.supabase.co/auth/v1/callback`.

Revisar el contenido de privacidad y el correo de contacto antes de desplegar. No colocar enlaces a condiciones que no estén publicadas. Guardar y volver a Público; si queda otro bloqueo, revisar el mensaje concreto de Google.
