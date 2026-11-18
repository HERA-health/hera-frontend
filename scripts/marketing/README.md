# Landings profesionales y capturas de ERA

## Páginas y publicación

La portada conserva su primer bloque y orienta el resto de su contenido a pacientes. El enlace «Para profesionales» abre `/software-para-psicologos`. Las páginas `/agenda-para-psicologos`, `/gestion-pacientes-psicologos` y `/facturacion-para-psicologos` desarrollan cada necesidad. `/profesionales/recorrido` muestra ocho áreas reales del producto y `/planes` utiliza el catálogo vigente del backend y el formulario existente de solicitud.

El contenido está en `src/seo/professionalContent.ts`. El cuerpo de las páginas comparte el HTML y CSS de `professionalPresentation.ts` entre la respuesta inicial y la pantalla web. La cabecera montada reutiliza `LandingHeader`, `StyledLogo` y `ThemeToggleButton`, con una presentación inicial equivalente. No se debe crear una segunda maqueta para buscadores. La navegación nativa conserva pantallas compatibles con React Native.

Las seis páginas profesionales, incluidos el recorrido y los planes, comparten los enlaces de `src/constants/professionalNavigation.ts`. El recorrido usa selector lateral en escritorio y selector horizontal en móvil/tablet. Cambiar de pantalla conserva la posición de lectura; los enlaces directos y recargar recuperan la selección. Atrás vuelve a la página anterior, sin pasar por cada pantalla del selector. Las capturas se pueden ampliar con el tema actual.

`npm run build:web` exporta Expo y prepara las páginas públicas. Las cuatro páginas nuevas y el recorrido son estáticos. `/planes` conserva la pantalla original y obtiene el catálogo con el servicio habitual de la aplicación. No hay una segunda maqueta de precios en el servidor. Los canonical usan `https://www.health-hera.com`.

Publicar primero el frontend y después el backend, que incorpora las cuatro URL al sitemap. No hacen falta migraciones para las landings. El entorno de demostración descrito abajo es independiente del despliegue y no debe ejecutarse en producción. La configuración de campañas, conversiones y medición queda pendiente de una tarea posterior.

## Preparar los datos de demostración

Requisitos: dependencias npm de ambas aplicaciones, PostgreSQL local compatible con el proyecto, Python con Pillow y Chromium mediante Playwright CLI. Todos los datos son sintéticos. Las capturas se hacen con los formularios, permisos, cifrado y servicios de la aplicación; no se sustituyen las respuestas de su API.

Los scripts del backend aceptan únicamente una base local llamada `hera_marketing_demo`. Eliminan las credenciales heredadas, impiden cargar el `.env` habitual y bloquean conexiones externas del proceso. El servidor no arranca los workers y utiliza el puerto 3046 para no ocupar el 3000 del backend habitual. Al terminar las capturas, detenerlo con Ctrl+C. La vista previa normal utiliza el backend local del puerto 3000; HERA_PREVIEW_API_URL permite elegir explícitamente el de demostración. La contraseña y las claves se generan en `HERA/output/marketing-demo/local-secrets.json`, fuera de los repositorios. No añadir ese directorio al control de versiones.

En una instalación nueva, crear un clúster desechable con las herramientas de PostgreSQL disponibles en `PATH`. Los siguientes comandos se ejecutan desde `HERA`, solo cuando ese directorio de datos aún no existe:

```powershell
initdb -D ./output/marketing-demo/postgres -U postgres -A trust --encoding=UTF8
pg_ctl -D ./output/marketing-demo/postgres -l ./output/marketing-demo/postgres.log -o "-h 127.0.0.1 -p 55467" start
createdb -h 127.0.0.1 -p 55467 -U postgres hera_marketing_demo
```

Desde `hera-backend`, preparar el esquema:

```powershell
$env:HERA_MARKETING_DEMO = '1'
$env:HERA_MARKETING_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55467/hera_marketing_demo'
node scripts/marketing/migrate.cjs
node scripts/marketing/server.cjs
```

Mantener ese servidor abierto. Sirve la API en `127.0.0.1:3046` y el almacenamiento local en `127.0.0.1:3047`. En otra terminal de `hera-backend`, con las mismas dos variables:

```powershell
node scripts/marketing/seed.cjs
node scripts/marketing/verify.cjs
```

El seed crea la consulta de Elena García Vidal, doce pacientes ficticios y la clínica Sendero con tres profesionales y seis pacientes. Incluye agenda, disponibilidad, historia y documentos clínicos, facturas y cobros de demostración. El PIN clínico de esta consulta local es `482619`. Las direcciones usan `example.test`.

La primera ejecución guarda la fecha de referencia en `seed-owner.json`, tomando el día de Madrid. Las siguientes la conservan. Para renovar la semana de las capturas, utilizar una base vacía y otro directorio `HERA_MARKETING_OUTPUT`; no cambiar la fecha sobre datos ya emitidos. El seed rechaza una base poblada que no tenga su marcador. `verify.cjs` comprueba también el cifrado, los documentos y la integridad e idempotencia de la emisión de facturas.

## Capturar y exportar imágenes

Desde `hera-frontend`, crear una compilación destinada exclusivamente al entorno local. Estas variables pertenecen a la terminal; no modificar el `.env` del proyecto ni desplegar este `dist`:

```powershell
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_API_URL_DEV = 'http://localhost:3046/api'
npm run build:web
$env:HERA_PREVIEW_API_URL = 'http://localhost:3046/api'
node scripts/preview-public.cjs
```

Mantener la vista previa en `http://localhost:8088`. Desde otra terminal de `hera-frontend`, generar los scripts de acceso y capturar en sesiones nuevas del navegador:

```powershell
node scripts/marketing/prepare-captures.cjs
npx --yes --package @playwright/cli playwright-cli -s=marketing-pro open http://localhost:8088
npx --yes --package @playwright/cli playwright-cli -s=marketing-pro run-code --filename=../output/marketing-demo/login-professional.browser.js
npx --yes --package @playwright/cli playwright-cli -s=marketing-pro run-code --filename=../output/marketing-demo/capture-professional.browser.js
npx --yes --package @playwright/cli playwright-cli -s=marketing-pro run-code --filename=../output/marketing-demo/capture-clinical.browser.js
npx --yes --package @playwright/cli playwright-cli -s=marketing-clinic open http://localhost:8088
npx --yes --package @playwright/cli playwright-cli -s=marketing-clinic run-code --filename=../output/marketing-demo/login-clinic.browser.js
npx --yes --package @playwright/cli playwright-cli -s=marketing-clinic run-code --filename=../output/marketing-demo/capture-clinic.browser.js
python scripts/marketing/encode-captures.py
```

Si se utiliza `HERA_MARKETING_OUTPUT`, establecer el mismo valor absoluto en ambas aplicaciones y adaptar las rutas de los comandos de navegador. Las plantillas guardan 24 PNG a 1600 × 1000 en `HERA/output/playwright/product`: doce pantallas en claro y oscuro. El codificador produce 48 WebP, en anchos de 960 y 1600, y un manifiesto con tamaños y hashes en `public/marketing/product`. Revisar visualmente los PNG antes de sustituir las imágenes publicadas. No modificar las capturas con ilustraciones o datos sobreimpresos.

Después de exportar las imágenes, repetir `npm run build:web` y reiniciar la vista previa para actualizar también el HTML del servidor. La compilación de producción debe ejecutarse en su entorno habitual, sin las variables locales anteriores.

## Comprobaciones antes de publicar

Ejecutar `npm run typecheck` y `npm run test:seo` en el frontend. Revisar en escritorio y móvil, en claro y oscuro:

- Portada intacta en su primer vistazo; enlaces antiguos `?section=forSpecialists` funcionales.
- Cuatro páginas comerciales, recorrido, planes y enlaces cruzados sin errores ni desbordamientos.
- Primera respuesta con JavaScript retrasado y transición a la aplicación sin cambio de maqueta; conservar el desplazamiento y las preguntas abiertas.
- Recorrido manual, ampliación de capturas, navegación por teclado y formulario real de solicitud.
- Planes con catálogo disponible y no disponible, con el servicio original.
- Canonical, títulos, sitemap y respuestas reales de las rutas, incluido un 404 desconocido.

Las pruebas automatizadas del HTML cubren las intenciones de búsqueda, los enlaces, las imágenes, el tema inicial y los estados del catálogo. La revisión visual complementa esas pruebas; no se sustituye por una puntuación de PageSpeed.

Con la vista previa y una sesión de Playwright abiertas, la regresión de navegador verifica enlaces directos, recarga, historial, ampliación de imágenes y conservación de una pregunta abierta cuando JavaScript llega tarde:

```powershell
npx --yes --package @playwright/cli playwright-cli -s=marketing-pro run-code --filename=scripts/marketing/verify-public.browser.js
npx --yes --package @playwright/cli playwright-cli -s=marketing-pro run-code --filename=scripts/marketing/verify-navigation.browser.js
```

La segunda prueba verifica que la cabecera y los enlaces comerciales navegan dentro de React Navigation, sin reiniciar el documento, y conserva historial y canonical. Las duraciones son orientativas del entorno local; para medirlas, usar una sesión sin `--headed` evita la ralentización de pestañas en segundo plano.

En `hera-backend`, `node --test scripts/marketing/environment.test.cjs` comprueba que el entorno rechaza destinos remotos, otra base local y ejecuciones sin activación explícita.
