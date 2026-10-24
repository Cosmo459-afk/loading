# LOADING ARCADE 0.10 — Archivo Retro

**Actualización visual lista para instalar sobre 0.9.** No requiere SQL, no reinicia XP, partidas, cartas, cofres ni cuentas. No se ha desplegado Cloudflare desde el entorno de desarrollo.

El propietario confirmó la dirección «LOADING · Archivo Retro» de la primera propuesta y aclaró que las fotos son referencias para crear nuevas composiciones. Esta entrega contiene 14 artes nuevos, generados/editados a partir de esas referencias, con fondos oscuros y luz de inventario para objetos y armas, y ambientes del juego para los personajes. El marco es HTML/CSS reutilizable: bisel metálico, tipografía pixel Silkscreen, encabezado Archivo Retro, imagen protagonista, título/juego/descripción debajo y pie con rareza/número. Comunes azules, épicas violetas/rosas y legendarias doradas.

## Actualizar desde 0.9

Descargar `loading-arcade-v10.zip`, descomprimir y subir **solo `index.html`** a Cloudflare → Workers & Pages → loading-arcade → New deployment → Deploy. Confirmar «Versión 0.10» en el pie y refrescar con Ctrl+F5 si todavía aparece la anterior. No volver a ejecutar SQL para este cambio visual.

## Reglas implementadas

- Resident Evil 4 original: 14 coleccionables confirmados por el propietario, ocho comunes azules, cuatro épicos violetas/rosas y dos legendarios dorados. Arte y marco «Archivo Retro» uniformes; nombre y descripción siguen siendo texto accesible y editable. Progreso por colección y rareza, detalle ampliado y tres destacados en el perfil.
- **Las cartas solo se obtienen abriendo cofres**, nunca por XP directamente. Un cofre al subir cada nivel; **1.800 XP por nivel**. Una trivia perfecta entrega 900 XP: dos perfectas suben un nivel. El jugador comienza en nivel 1 y su primer cofre corresponde al nivel 2.
- Probabilidades iniciales **85% común, 10% épica y 5% legendaria**. Se reasignó a comunes el 15% de monedas descartado por el propietario. **Sin monedas y sin repetidas**. Al agotar una rareza se elimina del sorteo y se normalizan proporcionalmente los pesos restantes. Con la colección completa, los cofres pendientes permanecen cerrados para futuras incorporaciones.
- Sorteo en servidor; premio e inventario guardados en la misma transacción. Doble clic, recarga, corte de red y otro dispositivo devuelven el mismo resultado ya guardado. No hay pagos ni compra de cofres.
- Evento de apertura: cofre que se agita, tapa que se abre, brillo y revelación de la carta; respeta movimiento reducido. El premio queda consultable desde Mis cofres. Las probabilidades y la regla de no repetición se muestran antes de abrir.
- Cosméticos entre niveles: gafas neón 500 XP, fondo violeta 1.000, gafas hielo 1.500, gorra 2.000, fondo noche 3.500, corona 5.000. Se guardan al equiparlos; son únicamente visuales.
- Trivias por consola: aprobar con 3/5; reintentar hasta aprobar, sin mostrar soluciones al fallar. Recompensa única: 200 XP por aprobar + 100 por acierto + 200 por perfecta; totales 500/600/900. Una aprobada no se repite. Mix e invitado son práctica sin progreso guardado. PS1 y PS2 independientes; fáciles → medias → difíciles.
- Aviso de nivel y recompensas, botón con insignia persistente y contador de cofres sin abrir. Perfil solo con mascotas y cosméticos, sin foto.
- Carga de trivias por lotes sin actualizar HTML: ver `content/batches/README.md`. Las preguntas/soluciones/fuentes se guardan en esquema privado. Todavía no es un panel administrativo.

## Instalación histórica del backend 0.9 — solo si todavía falta

El propietario pidió eliminar todo el catálogo anterior y permitió reiniciar la experiencia. **`supabase/upgrade-v09.sql` borra XP, historial de partidas, dificultades desbloqueadas, destacados, cosméticos equipados y cartas anteriores**. Conserva cuentas, apodos, avatar elegido, vinculación de correo y preguntas publicadas. Instala únicamente las 14 cartas nuevas, inicialmente sin propietarios ni cofres.

Para actualizar, ejecutar **solo `supabase/upgrade-to-v09.sql`**: detecta si el proyecto está en 0.7 u 0.8 y aplica lo necesario en una transacción. En la primera instalación reinicia los datos de prueba; si se ejecuta otra vez tras una instalación correcta, conserva el progreso nuevo. El resultado debe mostrar common 8, epic 4 y legendary 2. No ejecutar además los upgrades individuales ni `migrations`.

Después subir el HTML actual. Probar dos trivias perfectas para recibir un cofre de nivel 2, abrirlo y verificar el contador 1/14 en el álbum. Este paso SQL es únicamente para instalar el backend 0.9 que aún falte; no es parte de la actualización visual 0.10.

Base nueva: `setup.sql` → `upgrade-v06.sql` → `upgrade-v07.sql` → `upgrade-to-v09.sql`. No ejecutar también 0.8/0.9 individuales: el archivo único ya los incluye.

La corrección del límite SQL de puntuación a 900 está en `upgrade-v08.sql` y también en 0.9 para proyectos que ya habían aplicado la revisión previa de 0.8.

## Imágenes y paquete

Catálogo en `content/collections/re4.json`. Los 14 archivos originales aportados por el propietario se conservan sin cambios como referencias; su procedencia y hashes están en `content/collections/re4-image-provenance.json`. La autorización para mantener la referencia del medallón del remake sigue documentada, sin atribuir esa captura a la edición original.

Los artes de producción están en `assets/cards/re4/art-v10/`: cuatro láminas de arte que la UI presenta como 14 imágenes individuales mediante recortes SVG. El marco y textos se generan por separado en `src/cards.css` y `cardMarkup`, evitando texto rasterizado. `content/collections/re4-art-provenance-v10.json` registra los originales generados y hashes; `originalImageFile` conserva el vínculo con la referencia. No usar el arte como fuente de nombres, funciones o lore: esos metadatos confirmados no cambiaron.

El build incrusta cada lámina una sola vez, junto con Silkscreen Bold (OFL) y los estilos; sin CDN ni fuentes externas. El HTML final es independiente y está dentro del límite de tamaño de assets estáticos. El build falla si falta arte. `npm run build:preview` solo sirve para desarrollo y no debe empaquetarse.

`loading-arcade-v10.zip` contiene el HTML independiente, README y licencias. No subir al Worker los JSON con respuestas, SQL, tests, fixture ni node_modules. Para reconstruir: `npm run build` y `node scripts/package-release.mjs`. Los ZIP previos se conservan como versiones históricas. No aplicar de nuevo la migración 0.9 al actualizar solo el diseño.

## Desarrollo y validación

Node >=22, npm, Python, Playwright y Chromium del sistema. Checkout `/workspace/loading`.

```sh
npm ci
npm ci --prefix supabase
npm run build
npm run test:database
python -m http.server 8080 --bind 0.0.0.0
```

En otra terminal: `npm run test:fixture`. Luego `npm run test:browser` y `python tests/smoke.py`. `ARCADE_URL` cambia el puerto. La fixture usa PGlite y Auth simulado; las solicitudes de integración se interceptan y no escriben en Supabase remoto ni envían correos. Nunca desplegar la fixture.

Pruebas de servidor: reinicio autorizado conserva identidades; catálogo 8/4/2; dos perfectas entregan 1.800 XP y un solo cofre; XP sin cartas; partición exacta de probabilidades 85/10/5; normalización de rarezas agotadas; 14 premios únicos; colección completa no consume cofres; reintentos idempotentes, aislamiento por usuario y rechazo de escrituras/invocaciones privadas.

Pruebas de navegador: perfil, aprobación, recuperación de guardado interrumpido, avisos, dos perfectas/nivel, vestuario, álbum y contadores, apertura animada, recuperación tras abrir en servidor pero recibir error de red, consulta del mismo premio, destacados, detalle y 36 combinaciones de pantalla/ancho. Los 14 artes se decodifican durante la prueba; se comprueban cuatro láminas compartidas, encabezados/pies/números uniformes, fuente local cargada, arte visible en cartas pendientes y ausencia de imágenes faltantes en la galería. También se comprueba el upgrade desde 0.7 y 0.8 y su reejecución sin otro reinicio.

Mantener Anonymous Sign-ins habilitado y Confirm email para vinculación opcional. Site URL/Redirect URL: `https://loading-arcade.tienda-somosloading.workers.dev/`. Configuración pública en `src/config.js`; no usar service_role ni contraseñas en el navegador. Correo real y despliegue remoto necesitan comprobación posterior.

## Pendientes posteriores

- Imágenes de las siguientes colecciones: Metal Gear Solid PS1, Silent Hill 2 PS2 y Parasite Eve 2 PS1, todos originales.
- Más trivias: el catálogo actual tiene seis; todas perfectas permiten tres cofres. Para completar la colección harán falta nuevos desafíos, sin habilitar repetición de trivias aprobadas.
- Desafío semanal temático de unas 20 preguntas, un intento, ranking por aciertos/tiempo y carta exclusiva por perfect score. Encuesta de cuatro juegos en Instagram con enlace desde la app.
- Beneficio de compra accesible por progreso; porcentaje, condiciones y validación pendientes. No anunciar descuentos inexistentes.
