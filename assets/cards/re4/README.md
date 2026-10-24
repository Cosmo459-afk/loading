# Imágenes de Resident Evil 4

14 archivos aportados por el propietario en `resident evil 4.zip`. Se conservaron exactamente sus bytes; los JFIF JPEG solo recibieron extensión `.jpg`. Hashes y nombres de origen en `content/collections/re4-image-provenance.json`.

`content/collections/re4.json` define el mapeo, tamaño real y encuadre SVG de cada imagen. Los recortes afectan únicamente la presentación, no el archivo. Mantener créditos y no reemplazar las referencias sin consultar al propietario. Se autorizó expresamente conservar por ahora la captura del medallón azul del remake.

El build incrusta los originales en el HTML final. `npm run build` falla si falta una imagen. Para una colección nueva, agregar manifiesto, referencias confirmadas y pruebas antes de publicarla.


## Arte de producción 0.10

Los originales son referencias de partida, no las imágenes que se pegan en las cartas. El propietario autorizó expresamente generar nuevas composiciones, iluminación, ángulos y fondos manteniendo la identidad del sujeto. Los artes están en `art-v10/`; el manifiesto `re4-art-provenance-v10.json` documenta los archivos generados. El `imageFile` del catálogo apunta al arte nuevo y `originalImageFile` a la referencia.

Cada lámina contiene cuatro objetos o dos personajes. Los recortes SVG separan sus ilustraciones; el marco, textos y rareza se dibujan como UI reutilizable. No modificar nombres, descripciones o reglas a partir de detalles inventados por el generador.
