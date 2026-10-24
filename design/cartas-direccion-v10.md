# Cartas LOADING — dirección visual 0.10 en revisión

El propietario pidió retomar la identidad de la primera propuesta gráfica: `cromos-propuesta.png` (LOADING · Archivo Retro). La galería de la versión 0.9 se considera una integración funcional, pero no el diseño gráfico definitivo. Evitar publicar otro catálogo de fotografías en cajas con texto.

## Formato

Carta vertical, proporción cercana a 59:86, con jerarquía reconocible de un juego de cartas coleccionables. Referencia de formato: Yu-Gi-Oh; identidad, marco y composición propios de LOADING. No inventar estadísticas, estrellas, ATK/DEF ni reglas de combate.

1. Nombre en placa superior legible.
2. Ventana central de arte, protagonista de la carta.
3. Panel inferior con descripción breve.
4. Identificación pequeña del juego, marca LOADING, rareza y número en la colección.

Misma silueta, bordes, tipografía y posiciones en las 14 cartas. El color de rareza cambia el acabado, no la plantilla: comunes azules; épicas violetas con rosa; legendarias doradas. Marco metálico con bisel, doble borde fino, detalles discretos, fondo oscuro y textura de carta impresa. Evitar sobrecarga de ornamentos.

## Tratamiento de las imágenes

Las fotos aportadas son referencias del sujeto, no el arte final para pegar sin intervención. Quitar los fondos y la interfaz de inventario; conservar la identidad, silueta y apariencia de los objetos/personajes. Componer arte nuevo con luz, sombra y fondo coherentes. No convertirlos en dibujos ni modernizar los modelos por defecto.

- Objetos y armas: fondo negro o muy oscuro, iluminación de inventario/exhibición; acentos contenidos según rareza. No agregar accesorios que no pertenecen al objeto.
- Personajes: fondos ambientales relacionados con su juego. Para Leon, aldea rural y ambiente de Resident Evil 4, manteniendo chaqueta y apariencia de la referencia original.
- No inventar procedencia, nombres, funciones o datos históricos. Mantener metadatos confirmados separados de las imágenes generadas.

Muestra inicial: Espinela (común), Matilda (épica), Leon S. Kennedy (legendaria). Es una propuesta gráfica para revisar el lenguaje común antes de producir el resto. No se ha cambiado la web ni el paquete 0.9 con esta exploración.

## Implementación posterior

Conservar los originales del ZIP y su manifiesto de procedencia. Guardar por separado los nuevos artes y el diseño de la carta. Para la aplicación, favorecer marco y textos HTML/CSS reutilizables con arte tratado en la ventana central, de modo que nombres y descripciones sigan legibles y accesibles. Un mockup rasterizado de tres cartas no sustituye esos recursos de producción.

Las reglas ya implementadas en 0.9 siguen siendo: cartas solo por cofres, 1.800 XP por nivel, sin monedas ni repetidas, pesos iniciales 85/10/5 con normalización al agotar rarezas. No imprimir requisitos de XP en las cartas.
