# Reserva pública: datos y confirmación en el mismo bloque

La reserva sin cuenta sitúa su única acción principal al final del apartado de datos, dentro del contenido desplazable en todos los tamaños de pantalla. El resumen compacto muestra modalidad, fecha, hora, duración, precio y zona horaria antes de la verificación. El botón inicial se llama «Continuar con mi reserva»; al completar los datos, su ayuda explica que el siguiente paso comprueba el correo con un código para confirmar la cita.

- «Continuar con mi reserva» exige una cita seleccionada, precio disponible, datos válidos y aceptación de privacidad. Los campos muestran su error al perder el foco y lo retiran al editar. El teléfono continúa siendo opcional.
- Tras solicitar el código, el mismo bloque muestra la verificación y «Confirmar cita», deshabilitado hasta completar el código. Se conserva la compatibilidad de códigos anteriores, los estados de envío y la recuperación ante errores.
- El resumen lateral de escritorio es informativo para reservas sin cuenta. Su columna ocupa la altura del contenido para permitir el comportamiento sticky existente cuando la tarjeta cabe en la ventana; si no cabe, se desplaza normalmente.
- El móvil no tiene un segundo botón fijo para este flujo. Las reservas con cuenta o por derivación mantienen sus acciones existentes.

## Verificación del 13 de septiembre de 2026

25 pruebas de pantalla, resumen y servicio correctas; TypeScript y exportación web correctos. Revisión con Playwright sobre el bundle exportado en anchos de 1440, 900, 390 y 320 px, con temas claro y oscuro. Se comprobaron aceptación requerida, código vacío/incompleto/completo, botón único, error de código, conservación de datos, nueva solicitud y resultado satisfactorio. Las capturas se encuentran en `../../output/playwright/booking-*.png`.

Las llamadas de API se interceptaron con datos ficticios: no se crearon reservas ni se enviaron correos reales. No se probaron aplicaciones nativas instaladas. Este cambio no requiere migraciones ni modifica el backend.
