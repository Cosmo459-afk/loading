# LOADING ARCADE 0.9 — coleccionables y cofres

**Entrega en preparación: faltan los 14 archivos de imagen originales.** Las referencias se ven en el chat, pero esos adjuntos inline no aparecen como archivos accesibles en este entorno. No publicar la previsualización. No se ha aplicado SQL remoto ni desplegado Cloudflare.

## Reglas implementadas

- Resident Evil 4 original: 14 coleccionables confirmados por el propietario, ocho comunes azules, cuatro épicos violetas/rosas y dos legendarios dorados. Título → imagen → descripción breve. Progreso por colección y rareza, detalle ampliado y tres destacados en el perfil.
- **Las cartas solo se obtienen abriendo cofres**, nunca por XP directamente. Un cofre al subir cada nivel; **1.800 XP por nivel**. Una trivia perfecta entrega 900 XP: dos perfectas suben un nivel. El jugador comienza en nivel 1 y su primer cofre corresponde al nivel 2.
- Probabilidades iniciales **85% común, 10% épica y 5% legendaria**. Se reasignó a comunes el 15% de monedas descartado por el propietario. **Sin monedas y sin repetidas**. Al agotar una rareza se elimina del sorteo y se normalizan proporcionalmente los pesos restantes. Con la colección completa, los cofres pendientes permanecen cerrados para futuras incorporaciones.
- Sorteo en servidor; premio e inventario guardados en la misma transacción. Doble clic, recarga, corte de red y otro dispositivo devuelven el mismo resultado ya guardado. No hay pagos ni compra de cofres.
- Evento de apertura: cofre que se agita, tapa que se abre, brillo y revelación de la carta; respeta movimiento reducido. El premio queda consultable desde Mis cofres. Las probabilidades y la regla de no repetición se muestran antes de abrir.
- Cosméticos entre niveles: gafas neón 500 XP, fondo violeta 1.000, gafas hielo 1.500, gorra 2.000, fondo noche 3.500, corona 5.000. Se guardan al equiparlos; son únicamente visuales.
- Trivias por consola: aprobar con 3/5; reintentar hasta aprobar, sin mostrar soluciones al fallar. Recompensa única: 200 XP por aprobar + 100 por acierto + 200 por perfecta; totales 500/600/900. Una aprobada no se repite. Mix e invitado son práctica sin progreso guardado. PS1 y PS2 independientes; fáciles → medias → difíciles.
- Aviso de nivel y recompensas, botón con insignia persistente y contador de cofres sin abrir. Perfil solo con mascotas y cosméticos, sin foto.
- Carga de trivias por lotes sin actualizar HTML: ver `content/batches/README.md`. Las preguntas/soluciones/fuentes se guardan en esquema privado. Todavía no es un panel administrativo.

## Reinicio autorizado de las pruebas

El propietario pidió eliminar todo el catálogo anterior y permitió reiniciar la experiencia. **`supabase/upgrade-v09.sql` borra XP, historial de partidas, dificultades desbloqueadas, destacados, cosméticos equipados y cartas anteriores**. Conserva cuentas, apodos, avatar elegido, vinculación de correo y preguntas publicadas. Instala únicamente las 14 cartas nuevas, inicialmente sin propietarios ni cofres.

No aplicar esta migración hasta contar con el paquete final con imágenes. Requiere 0.8. Los archivos de `migrations` duplican los upgrades: ejecutar solo una copia, una vez.

La corrección del límite SQL de puntuación a 900 está en `upgrade-v08.sql` y también en 0.9 para proyectos que ya habían aplicado la revisión previa de 0.8.

## Estado de las imágenes y entrega

Catálogo en `content/collections/re4.json`; originales pendientes en `assets/cards/re4`. El usuario puede adjuntar un ZIP sin renombrar archivos; el mapeo y la revisión visual se hacen en desarrollo. No reemplazar sus referencias por otras ediciones, imágenes inventadas ni sustitutos de internet.

El build incorpora los originales en el HTML, sin servidor de imágenes externo. Las capturas se encuadran mediante SVG sin modificar los archivos originales ni borrar créditos. Los encuadres necesitan revisión con los archivos reales.

- `npm run build:preview`: previsualización marcada «Imágenes pendientes · No publicar».
- `npm run build`: rechaza la entrega si falta un original. No crear un ZIP de producción a partir de una previsualización.
- No existe todavía `loading-arcade-v09.zip`. Los ZIP anteriores se conservan como entregas históricas.

Al recibir las imágenes: verificar las 14, revisar encuadres/legibilidad, ejecutar build y pruebas, preparar ZIP final y dar instrucciones de SQL + Cloudflare. Desplegar solo el `index.html` independiente de `dist` al Worker existente `loading-arcade`; nunca los JSON con respuestas, SQL, tests, fixture ni node_modules.

## Desarrollo y validación

Node >=22, npm, Python, Playwright y Chromium del sistema. Checkout `/workspace/loading`.

```sh
npm ci
npm ci --prefix supabase
npm run build:preview
npm run test:database
python -m http.server 8080 --bind 0.0.0.0
```

En otra terminal: `npm run test:fixture`. Luego `npm run test:browser` y `python tests/smoke.py`. `ARCADE_URL` cambia el puerto. La fixture usa PGlite y Auth simulado; las solicitudes de integración se interceptan y no escriben en Supabase remoto ni envían correos. Nunca desplegar la fixture.

Pruebas de servidor: reinicio autorizado conserva identidades; catálogo 8/4/2; dos perfectas entregan 1.800 XP y un solo cofre; XP sin cartas; partición exacta de probabilidades 85/10/5; normalización de rarezas agotadas; 14 premios únicos; colección completa no consume cofres; reintentos idempotentes, aislamiento por usuario y rechazo de escrituras/invocaciones privadas.

Pruebas de navegador: perfil, aprobación, recuperación de guardado interrumpido, avisos, dos perfectas/nivel, vestuario, álbum y contadores, apertura animada, recuperación tras abrir en servidor pero recibir error de red, consulta del mismo premio, destacados, detalle y 36 combinaciones de pantalla/ancho. El arte real no está validado porque aún faltan los archivos.

Mantener Anonymous Sign-ins habilitado y Confirm email para vinculación opcional. Site URL/Redirect URL: `https://loading-arcade.tienda-somosloading.workers.dev/`. Configuración pública en `src/config.js`; no usar service_role ni contraseñas en el navegador. Correo real y despliegue remoto necesitan comprobación posterior.

## Pendientes posteriores

- Imágenes de las siguientes colecciones: Metal Gear Solid PS1, Silent Hill 2 PS2 y Parasite Eve 2 PS1, todos originales.
- Más trivias: el catálogo actual tiene seis; todas perfectas permiten tres cofres. Para completar la colección harán falta nuevos desafíos, sin habilitar repetición de trivias aprobadas.
- Desafío semanal temático de unas 20 preguntas, un intento, ranking por aciertos/tiempo y carta exclusiva por perfect score. Encuesta de cuatro juegos en Instagram con enlace desde la app.
- Beneficio de compra accesible por progreso; porcentaje, condiciones y validación pendientes. No anunciar descuentos inexistentes.
