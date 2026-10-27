# Acceso por código dentro de la app

En iPhone la app instalada y Safari/Chrome pueden mantener sesiones separadas. El enlace por correo puede abrirse fuera de la app; en PKCE además debe volver al contexto que solicitó el acceso. No copiar sesiones ni tokens de una ventana a otra.

## Configuración necesaria en Supabase (no SQL)

1. Authentication → Emails → Templates (en algunas vistas, Authentication → Email Templates).
2. Abrir **Magic Link**. Reemplazar el cuerpo por el contenido de `assets/legal/email-access-code.html`, incluido `{{ .Token }}`. Asunto sugerido: «Tu código de Loading Arcade». Guardar.
3. Repetir para **Confirm signup** / **Confirm sign up**, para usuarios nuevos que entren por correo.
4. Repetir para **Change Email Address**, que confirma el correo al vincular un jugador invitado. No desactivar la confirmación de correos ni la seguridad de cambio de correo.
5. Publicar toda la carpeta sitio de v51. No ejecutar SQL ni reinicios.

El archivo `email-access-code.html` se incluye también en la carpeta docs del ZIP; se pega en Supabase, no se sube como página pública. Los cambios de plantilla afectan los correos nuevos; descartar enlaces/códigos anteriores.

## Persistencia de sesión

La app ya usa persistSession y autoRefreshToken. No se promete transferir automáticamente la sesión de Safari/Chrome al contenedor instalado de iOS: puede ser necesario ingresar una vez dentro de la app. Después se conserva el acceso en ese contenedor hasta cerrar sesión explícitamente, revocación/vencimiento no renovable o eliminación de sus datos por el usuario/sistema. No desinstalar para resolverlo.

## Prueba desde iPhone

Abrir la app instalada → Entrar por correo → Enviar código. Leer el código en el correo, volver a la misma app desde su ícono y pegarlo. Confirmar. Cerrar y reabrir la app, comprobar el mismo apodo, XP y cartas. Probar también el jugador invitado → vincular correo sin crear otra cuenta. Un código erróneo no debe cambiar la sesión; se puede solicitar otro con el botón de envío.

La app usa verifyOtp de Supabase (`email` para acceso, `email_change` para vincular) y guarda la sesión en el contexto de la app. No almacena el código en URLs, localStorage ni registros. Se mantienen vencimientos, límites de envío y validaciones de Supabase. Google/Facebook siguen siendo opciones independientes; esta corrección resuelve el acceso por correo, no promete controlar dónde abre OAuth iOS.
