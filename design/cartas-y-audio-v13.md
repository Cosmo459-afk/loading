# Resident Evil 4 y audio — versión 0.13

El propietario aprobó la muestra Red Hawk / Matilda / Leon y pidió corregir la caja Red Hawk para que su frente fuese cuadrado. Se renovaron los catorce artes, manteniendo el marco HTML/CSS Archivo Retro: comunes azules, épicas violeta/rosa y legendarias doradas; imagen, título, juego y descripción breve, sin estadísticas inventadas.

Los objetos deben conservar su diseño reconocible. En envases importan la geometría, proporciones, etiquetas, colores y gráfica; no sustituirlos por cajas genéricas. Fondo, ángulo e iluminación pueden cambiar. En personajes se admiten nuevas poses y escenas conservando la apariencia de la entrega original. Las fuentes originales siguen intactas. La excepción autorizada del medallón de la captura del remake permanece. Los artes generados no son una fuente de metadatos del juego.

Producción: `assets/cards/re4/art-v13/` y `content/collections/re4-art-provenance-v13.json`. Prueba visual del marco real: `cartas-re4-v13-en-juego.png`. Los recortes de las cuatro láminas son declarativos en `content/collections/re4.json`; no hay texto rasterizado en la carta de producción.

El álbum sigue ocultando nombres y diseños pendientes; esta revisión no cambia las probabilidades, el inventario ni la economía. Tampoco publica el desafío semanal.

## Audio

`src/audio.js` compone música y efectos originales con osciladores y ruido filtrado de Web Audio. Sin música comercial ni archivos de juegos. Arreglo de menú y trivia, selección neutra sin pistas de acierto, resultados al cerrar la partida, nivel/cosméticos, ruido de apertura y campanas/fanfarria según el premio confirmado. Una consulta de un cofre ya abierto no reproduce una nueva fanfarria.

Controles independientes de música/efectos y sus volúmenes, guardados localmente. Sin autoplay antes de un gesto. Sin música en apertura ni resultados para que se destaquen los efectos. Pausa al pasar a segundo plano, eliminación de notas programadas y reanudación al volver. El juego funciona si el navegador no dispone de Web Audio.

Verificación: señal real de audio en Chromium, silencios y preferencias, pausa y reanudación, fallback sin AudioContext; recorrido completo con SQL local y Auth simulado; catorce artes decodificados dentro del marco. El backend remoto y Cloudflare no se modifican desde estas pruebas.
