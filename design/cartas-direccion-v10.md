# Cartas LOADING — dirección visual 0.10 en revisión

El propietario pidió retomar la identidad de la primera propuesta gráfica: `cromos-propuesta.png` (LOADING · Archivo Retro). La galería de la versión 0.9 se considera una integración funcional, pero no el diseño gráfico definitivo. Evitar publicar otro catálogo de fotografías en cajas con texto.

## Formato

Carta vertical, proporción cercana a 59:86, con jerarquía reconocible de un juego de cartas coleccionables. Referencia de formato: Yu-Gi-Oh; identidad, marco y composición propios de LOADING. No inventar estadísticas, estrellas, ATK/DEF ni reglas de combate.

1. Encabezado pequeño «LOADING · Archivo Retro» y número de carta.
2. Ventana central de arte, protagonista de la carta.
3. Panel inferior con nombre grande, juego y descripción breve.
4. Pie con rareza y número en la colección.

Esta distribución sigue la referencia que el propietario volvió a adjuntar y confirmar; reemplaza la variante explorada con nombre en placa superior.

Misma silueta, bordes, tipografía y posiciones en las 14 cartas. El color de rareza cambia el acabado, no la plantilla: comunes azules; épicas violetas con rosa; legendarias doradas. Marco metálico con bisel, doble borde fino, detalles discretos, fondo oscuro y textura de carta impresa. Evitar sobrecarga de ornamentos.

## Tratamiento de las imágenes

Las fotos aportadas son referencias del sujeto, no el arte final para pegar sin intervención. Quitar los fondos y la interfaz de inventario; conservar la identidad, silueta y apariencia de los objetos/personajes. Componer arte nuevo con luz, sombra y fondo coherentes. No convertirlos en dibujos ni modernizar los modelos por defecto.

- Objetos y armas: fondo negro o muy oscuro, iluminación de inventario/exhibición; acentos contenidos según rareza. No agregar accesorios que no pertenecen al objeto.
- Personajes: fondos ambientales relacionados con su juego. Para Leon, aldea rural y ambiente de Resident Evil 4, manteniendo chaqueta y apariencia de la referencia original.
- No inventar procedencia, nombres, funciones o datos históricos. Mantener metadatos confirmados separados de las imágenes generadas.

La primera muestra fue Espinela, Matilda y Leon. Después, el propietario confirmó el formato «Archivo Retro» original y aclaró expresamente que las fotos son referencias para generar nuevas composiciones, incluso cambiando postura y ángulo de los sujetos. Se trabaja sobre los 14 artes para incorporar este diseño en la versión 0.10 sin cambiar reglas ni reiniciar progreso.

## Implementación posterior

Conservar los originales del ZIP y su manifiesto de procedencia. Guardar por separado los nuevos artes y el diseño de la carta. Para la aplicación, favorecer marco y textos HTML/CSS reutilizables con arte tratado en la ventana central, de modo que nombres y descripciones sigan legibles y accesibles. Un mockup rasterizado de tres cartas no sustituye esos recursos de producción.

Las reglas ya implementadas en 0.9 siguen siendo: cartas solo por cofres, 1.800 XP por nivel, sin monedas ni repetidas, pesos iniciales 85/10/5 con normalización al agotar rarezas. No imprimir requisitos de XP en las cartas.
