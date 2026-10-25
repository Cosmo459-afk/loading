# Revisión del lote retro 0.15

`retro-v15-audit.json` registra 30 manuales originales y 480 localizadores. Las fuentes son escaneos de manuales de las ediciones estadounidenses de PS1/PS2, conservados en mirrors públicos con revisión fijada por commit y SHA-256 del archivo. El número `scan` cuenta desde 1 dentro del CBZ; no siempre coincide con la página impresa (incluye portada y publicidad). Shadow of the Colossus necesita rotar su escaneo para leerlo; Jak y Ratchet usan un desplegable de una sola imagen.

Cada pregunta se redactó a partir del contexto del manual, con explicación en español y opciones diferenciadas. Las anclas breves permiten localizar el dato; su coincidencia OCR comprueba el localizador, **no sustituye la revisión contextual**. Se descartaron datos ambiguos y diferencias regionales conocidas: rango S de RE2, total de gemas de Crash 2, mínimo de cartas de Triple Triad y licencias de GT2. La versión original estadounidense es el ámbito de las preguntas que especifican edición o controles.

Los escaneos y transcripciones completas quedan fuera de este repositorio y del paquete. El lote canónico `content/batches/retro-v15.json` guarda referencia, evidencia parafraseada, escaneo y hash por pregunta. Solo se publica en las tablas privadas de Supabase; el HTML no lleva soluciones. El repositorio de desarrollo sí contiene el lote y no debe confundirse con el artefacto público de Cloudflare.

Dificultad fácil/media/difícil asignada editorialmente según reconocimiento, mecánica y detalle; aún debe calibrarse con resultados reales. Cualquier corrección futura de una trivia ya jugada se publica con ID nuevo: nunca cambiar retroactivamente la partida o sus puntos.

## Registro histórico 0.7 (catálogo archivado)

Se consultaron registros concretos del proyecto abierto libretro/libretro-database, ruta metadat/developer, para obtener desarrolladores de diez juegos de PS1/PS2. `metadata-facts.json` conserva el valor literal, el registro y su URL; `../question-batch-v07.json` contiene las diez preguntas, opciones, solución y referencia por pregunta. Solo se utilizaron esos datos concretos, no descripciones extensas del repositorio.

Es una fuente secundaria. Las páginas oficiales de PlayStation y Resident Evil y la API de Wikipedia devolvieron 403 del proxy de red de este entorno; no se afirma haberlas verificado. Se descartaron fechas exactas, recuentos de discos y etiquetas de estudio dudosas que aparecían en los datos. Las búsquedas por prefijo no equivalen a una auditoría completa de la base original.

Normalizaciones explícitas: Naughty Dog, Inc → Naughty Dog; Squaresoft → Square; SCE Studio Santa Monica → Santa Monica Studio; Capcom Co., Ltd → Capcom. No se cambiaron fechas ni plataformas. Los nuevos packs se titulan «Detrás del juego · PS1/PS2» y agrupan cinco preguntas sobre desarrolladores en nivel medio.

Para cada futuro lote, conservar referencias, revisar región/versión y preguntar al propietario sobre datos desconocidos. No inferir el juego o nombre de un objeto solo por su apariencia. Para imágenes y cromos, `design/card-references.json` distingue lo confirmado de lo pendiente.
