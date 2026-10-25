# Banco semanal privado

El archivo `.encrypted.json` se importa desde Administración → Semanal. Su clave se entregó al dueño por chat y no está en el repositorio ni en el sitio. No publicar preguntas ni claves. El manual fuente es público, pero la lista de esta edición y sus opciones solo se descifran en el navegador del administrador antes de guardar el borrador.

Formato: PBKDF2-SHA256, 150000 iteraciones, sal de 16 bytes; AES-256-GCM con IV de 12 bytes; ciphertext incluye la etiqueta GCM de 16 bytes al final. El JSON interior tiene `id`, `title`, `game`, `seconds`, `reward_name` y 20 `questions`, cada una con `prompt`, cuatro `choices`, `correct_index`, `explanation` y `source:{reference,evidence}`. Los borradores se revisan antes de activarlos; una edición publicada es inmutable.

Las pruebas usan preguntas sintéticas, no este banco real ni su clave.

## Banco de recuerdos del juego original

`re4-recuerdos-original.encrypted.json` es la alternativa centrada en escenas y mecánicas de la campaña: se evitan datos técnicos, memoria de manuales y preguntas de producción. Usa un ID distinto del banco inicial y la misma clave del dueño. La selección concreta de preguntas se revisa en Administración antes de activar. Las referencias apuntan a escenas/mecánicas del juego original; no se presentan como citas de guías web consultadas recientemente. No contiene preguntas del remake.

El ZIP `banco-semanal-re4-original.zip` permite descargar solo el banco y sus instrucciones; no requiere reconstruir ni desplegar el sitio.

## Revisión de redacción

Usar `re4-recuerdos-original-revisada.encrypted.json` (ZIP `banco-semanal-re4-original-revisado.zip`) en lugar del banco de recuerdos anterior. Mantiene 20 preguntas y el premio de Ada; corrige la descripción de la campana, simplifica expresiones como «castellano» y sustituye la pregunta del edificio por el uso del ojo artificial de Méndez. Se revisaron opciones y explicaciones y se probó la importación en una base local. Tiene un ID distinto para no alterar una edición ya publicada; conserva la misma clave privada del dueño.
