# Aviso de condiciones del Directorio

El espacio profesional consulta la configuración de comisiones al entrar y al volver a la aplicación. En LIVE, si hay una versión publicada seleccionada que el profesional puede aceptar y aún no ha aceptado, abre un aviso explicando el cambio y su efecto sobre las nuevas captaciones del Directorio.

El aviso permite leer el texto contractual completo, titular, fecha efectiva y tratamiento fiscal. El identificador técnico de la versión se conserva internamente y en administración; el especialista ve la fecha de vigencia, sin ese ID, tanto en el aviso como en su historial de condiciones aceptadas. La casilla no está premarcada y la aceptación solo se envía al pulsar «Aceptar condiciones y continuar». Se utiliza el endpoint de aceptación existente y su clave de reintento; este cambio no publica ni sustituye condiciones.

El mensaje inicial es breve. La explicación sobre nuevos pacientes y continuidad de los actuales está en «Qué cambia para ti», un desplegable cerrado por defecto con indicador de expansión. «Leer las condiciones» abre el texto contractual y la casilla de aceptación de forma independiente.

«Ahora no» cierra el aviso y deja un recordatorio con acceso para revisarlo. Esa postergación solo dura durante el montaje del espacio profesional: puede volver a aparecer al iniciar otra sesión o recargar, mientras no se haya aceptado. No bloquea la agenda ni la atención a pacientes actuales. Las restricciones de nuevas reservas del Directorio siguen aplicándose en el backend.

La aceptación persistida se comprueba por versión, cuenta y modo. Después de aceptarla, no vuelve a solicitarse al recargar ni en otro dispositivo que reciba ese estado del servidor. Una nueva versión requiere una lectura y aceptación nuevas. Una versión terminada tampoco se vuelve a ofrecer: su reactivación requiere publicar otra versión.

No se muestra este aviso en OFF, SIMULATION, a pacientes, a clínicas, a profesionales no elegibles ni durante los pasos obligatorios previos de aceptación legal, verificación de correo/documentación o recuperación de PIN. La pantalla manual de Comisiones HERA conserva su funcionamiento en simulación. No se han activado comisiones ni modificado bases de datos.

Los errores de carga ofrecen reintento sin bloquear el espacio de trabajo. Los errores de aceptación mantienen el aviso y vuelven a consultar el estado persistido para resolver una respuesta perdida. La notificación entre vistas se emite solo tras una respuesta satisfactoria; sus receptores vuelven a consultar al servidor para no confundir una respuesta tardía de otra cuenta con una aceptación propia.

## Verificación

Tras añadir el desplegable: 15 pruebas del aviso correctas, incluida apertura/cierre y reinicio al volver a abrirlo; TypeScript y exportación web correctos. Revisión visual en escritorio y móvil, con comprobación de «Ahora no», reapertura, casilla obligatoria y reintento de aceptación tras un error simulado, utilizando únicamente la API interceptada.

30 pruebas dirigidas correctas entre el aviso (15), presentación de comisiones, servicio de aceptación y navegación/verificación profesional. Incluyen OFF/simulación, perfiles no elegibles, versiones aceptadas o terminadas, nueva versión, postergación, casilla obligatoria, envío único, errores recuperables, respuesta perdida y aceptación desde otra vista. TypeScript y exportación web correctos.

Playwright sobre la exportación real con API interceptada: escritorio y móvil, temas claro y oscuro, lectura desplazable, botones accesibles, postergación y recordatorio, rechazo simulado del servidor, reintento satisfactorio y recarga sin volver a mostrar la versión aceptada. Capturas en `../../output/playwright/notice-*.png`. No se guardaron aceptaciones reales ni se probaron aplicaciones nativas instaladas.
