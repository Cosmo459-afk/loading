# Carga desde Administración (0.20)

El dueño puede crear una trivia desde formulario o importar un JSON desde **Administración → Trivias**. Las cargas quedan en borrador, se revisan las cinco preguntas y sus fuentes, y luego se publican. No requiere modificar HTML ni ejecutar SQL por cada lote. Se pueden editar borradores sin partidas; nunca se sobrescriben trivias ya jugadas.

Los lotes usan el formato descrito abajo, hasta 100 trivias/2 MB. `publish:true` se ignora en el panel: siempre exige revisión y publicación posterior. No subir estos JSON con soluciones a la carpeta pública `sitio`.

## Flujo manual de desarrollo

La app obtiene el catálogo desde Supabase. No hace falta subir un HTML nuevo por cada lote.

1. Preparar un JSON con `quizzes` (lista). Cada trivia incluye `id` único, `category` (`ps1`/`ps2`), `difficulty` (`easy`/`medium`/`hard`), `title`, `sort_order` (entero positivo), `publish` (booleano, por defecto borrador) y cinco `questions`.
2. Cada pregunta incluye `prompt`, cuatro `choices`, `correct_index` (0 a 3), `explanation` y `source: {reference, evidence}`. La referencia puede ser manual, documentación adjunta o URL; la evidencia debe indicar la sección o hecho respaldado. La validación no reemplaza la revisión factual humana.
3. Ejecutar `node scripts/import-trivias.mjs lote.json lote.sql`. Rechaza errores antes de generar SQL. No conecta a Supabase.
4. Revisar contenido y SQL; ejecutar el SQL en el editor de Supabase una vez aplicada `upgrade-v08.sql`. Todo el lote se aplica en una transacción; los IDs existentes provocan rechazo sin sobrescribir partidas ni preguntas anteriores.
5. Para publicar un borrador revisado: `update public.arcade_quizzes set published=true where id='ID-EXACTO';`.

Las soluciones y fuentes se guardan en el esquema privado. No se debe subir el JSON con respuestas ni el SQL al Worker público. No alterar preguntas de trivias ya jugadas: crear otra trivia con ID nuevo.

Este primer flujo evita tocar código pero todavía requiere preparar el lote y ejecutar SQL; no es un panel administrativo. Podés entregar documentos en el chat para que preparemos el lote.

## Lote retro 0.15

`retro-v15.json`: 96 trivias, 480 preguntas, 16 por consola/dificultad. Registro de fuentes en `../research/retro-v15-audit.json`. Se instala dentro de `supabase/upgrade-v15.sql`, no ejecutando además una importación separada del mismo lote. `node scripts/assemble-v15.mjs` regenera la migración completa; admite reejecución sin sobrescribir IDs ni perder progreso y rechaza un lote parcialmente instalado.
