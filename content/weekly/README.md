# Banco semanal privado

El archivo `.encrypted.json` se importa desde Administración → Semanal. Su clave se entregó al dueño por chat y no está en el repositorio ni en el sitio. No publicar preguntas ni claves. El manual fuente es público, pero la lista de esta edición y sus opciones solo se descifran en el navegador del administrador antes de guardar el borrador.

Formato: PBKDF2-SHA256, 150000 iteraciones, sal de 16 bytes; AES-256-GCM con IV de 12 bytes; ciphertext incluye la etiqueta GCM de 16 bytes al final. El JSON interior tiene `id`, `title`, `game`, `seconds`, `reward_name` y 20 `questions`, cada una con `prompt`, cuatro `choices`, `correct_index`, `explanation` y `source:{reference,evidence}`. Los borradores se revisan antes de activarlos; una edición publicada es inmutable.

Las pruebas usan preguntas sintéticas, no este banco real ni su clave.
