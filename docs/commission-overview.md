# Entrada profesional de comisiones

El encabezado delimita siempre el alcance: comisiones por pacientes del Directorio HERA; los pacientes propios quedan fuera. Los saldos corresponden a estas comisiones y «Abonos a HERA» muestra sus transferencias externas, sin presentarse como una gestión general de pagos de pacientes.

La pantalla muestra primero «Mis comisiones». Cada cuenta presenta los saldos reales del endpoint de detalle autorizado para el especialista y su acceso a sesiones y movimientos. Se priorizan pendiente documentado, recibido histórico y saldo a favor. No se suman cuentas de distintos titulares o modos; las de simulación están identificadas como tales.

La página y sus detalles se centran con un ancho máximo de 1120 px. Se reutilizan los encabezados, iconos y estados vacíos de Derivaciones y Colaboradores. Los tres saldos principales permanecen visibles; el vencido se avisa junto al pendiente. El resto se consulta en «Ver desglose de saldos». Los desplegables compactos permiten consultar cálculos, condiciones y estimaciones sin presentar todo el texto de entrada. En escritorio los filtros de sesiones se distribuyen en columnas; en móvil se apilan.

En OFF se mantiene el acceso al historial existente. Si no hay registro interno, se muestra «Todavía no tienes comisiones registradas» y se explica que por ahora no es necesario hacer nada, sin pedir al especialista que cree otra cuenta. No se inventan importes de cero ni se crea un registro para mostrar la interfaz. Durante la consulta se muestra carga; ante error se ofrece reintento sin representar el fallo como un saldo vacío. «Actualizar saldos» renueva los importes de la entrada.

Las condiciones siguen disponibles después del resumen. «Cómo se calculan las comisiones» está cerrado por defecto. Al abrirlo, el ejemplo de 80 € se identifica expresamente como orientativo, ajeno a la tarifa y al saldo del especialista; también lo explica la etiqueta accesible de cada fila.

Verificación: 24 pruebas dirigidas, TypeScript y exportación web. Navegador sobre exportación local con API interceptada: OFF sin cuenta, cuenta con saldos, acceso al detalle, apertura del ejemplo, escritorio/móvil y temas claro/oscuro. No se escribieron datos compartidos ni se probaron aplicaciones nativas instaladas.
