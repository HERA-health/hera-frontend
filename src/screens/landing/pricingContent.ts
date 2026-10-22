// Presentation only. These values do not grant permissions or enforce quotas.
export type PricingPlanId = 'calma' | 'crecimiento' | 'horizonte';

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  description: string;
  monthlyPrice: string;
  ownPatients: string;
  storageLabel: string;
  statistics: string;
  documents: string;
  supervision: string;
  templates: string;
  directoryProfile: string;
  publications: string;
  support: string;
}

export const PRICING_AVAILABILITY = 'Conoce nuestras modalidades. La contratación de los planes de suscripción estará disponible próximamente.';
export const PRICING_STORAGE_NOTE = 'El almacenamiento es el espacio total para tus archivos por especialista. No se suma entre modalidades ni se renueva cada mes.';
export const PRICING_COMMISSION_NOTE = 'Las comisiones se aplican a los pacientes captados por HERA, también si tienes una suscripción. Tus pacientes propios no generan comisión de captación de HERA.';

export const DIRECTORY_OFFER = {
  storageLabel: '5 GB',
  commissions: [
    { session: 'Primera sesión', rate: '20 %' },
    { session: 'Segunda y tercera sesión', rate: '10 %' },
    { session: 'Desde la cuarta sesión', rate: '5 %' },
  ],
} as const;

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'calma', name: 'Calma', description: 'Organiza tu consulta con apoyo para empezar.',
    monthlyPrice: '29,99', ownPatients: 'Hasta 20', storageLabel: '20 GB', statistics: 'Básicas',
    documents: 'Básicos', supervision: '1 al mes', templates: 'Básicas; avanzadas aparte',
    directoryProfile: 'Incluido', publications: '3 estándar', support: 'Estándar',
  },
  {
    id: 'crecimiento', name: 'Crecimiento', description: 'Más supervisión y publicaciones personalizadas.',
    monthlyPrice: '49,99', ownPatients: 'Hasta 60', storageLabel: '50 GB', statistics: 'Completas',
    documents: 'Incluidos', supervision: '3 al mes', templates: 'Ampliadas',
    directoryProfile: 'Incluido', publications: '5 personalizadas', support: 'Priorizado',
  },
  {
    id: 'horizonte', name: 'Horizonte', description: 'Pacientes propios sin límite y un perfil destacado.',
    monthlyPrice: '89,99', ownPatients: 'Ilimitados', storageLabel: '2 TB', statistics: 'Completas',
    documents: 'Incluidos', supervision: 'Incluida', templates: 'Todas',
    directoryProfile: 'Destacado', publications: 'Incluidas', support: 'Priorizado',
  },
];

export const SUBSCRIPTION_ESSENTIALS = [
  'Agenda y calendario', 'Pacientes e historiales', 'Facturación',
  'Recordatorios por email', 'Videollamadas con Google Meet', 'Enlace para compartir',
] as const;

export const SUBSCRIPTION_TOOL_GROUPS = [
  { title: 'Organiza tu día', icon: 'calendar-outline', items: [SUBSCRIPTION_ESSENTIALS[0], SUBSCRIPTION_ESSENTIALS[3]] },
  { title: 'Gestiona tu consulta', icon: 'folder-open-outline', items: [SUBSCRIPTION_ESSENTIALS[1], SUBSCRIPTION_ESSENTIALS[2]] },
  { title: 'Mantén la conexión', icon: 'videocam-outline', items: [SUBSCRIPTION_ESSENTIALS[4], SUBSCRIPTION_ESSENTIALS[5]] },
] as const;

export const PRICING_FAQS = [
  {
    question: '¿Qué diferencia hay entre directorio y suscripción?',
    answer: 'El directorio te permite recibir y atender a pacientes que llegan desde HERA, con las herramientas necesarias para su seguimiento y sin cuota mensual fija. La suscripción añade la gestión de tus pacientes propios y amplía el almacenamiento y las prestaciones de tu consulta.',
  },
  {
    question: '¿Puedo combinar el directorio con una suscripción?',
    answer: 'Sí. Puedes atender a pacientes de HERA y gestionar tus pacientes propios en el mismo espacio. Los pacientes procedentes de HERA no consumen el cupo de pacientes propios de tu plan. La presencia en el directorio está sujeta a la verificación profesional y a la aceptación de sus condiciones.',
  },
  {
    question: '¿Qué pacientes cuentan para el límite del plan?',
    answer: 'El cupo corresponde a tus pacientes propios activos. Los pacientes que llegan desde HERA no consumen ese cupo. Así puedes recibir nuevos pacientes desde el directorio y gestionar también tu consulta en el mismo espacio.',
  },
  {
    question: '¿Todos los planes incluyen publicaciones en redes?',
    answer: `Sí, los tres planes de suscripción incluyen publicaciones que prepara y publica el equipo de HERA en sus redes sociales. ${PRICING_PLANS.map(plan => `${plan.name}: ${plan.publications.toLowerCase()}`).join('; ')}. Son una forma de dar a conocer tu práctica profesional a través de HERA.`,
  },
  {
    question: '¿Cuándo se aplican las comisiones?',
    answer: `${PRICING_COMMISSION_NOTE} La escala se cuenta para cada relación entre paciente y especialista: ${DIRECTORY_OFFER.commissions.map(item => `${item.session.toLowerCase()}, ${item.rate}`).join('; ')}.`,
  },
  {
    question: '¿Qué significa el almacenamiento de cada modalidad?',
    answer: `${PRICING_STORAGE_NOTE} Directorio incluye ${DIRECTORY_OFFER.storageLabel}; ${PRICING_PLANS.map(plan => `${plan.name}, ${plan.storageLabel}`).join('; ')}. En las suscripciones, tus pacientes propios y los procedentes de HERA comparten esa capacidad.`,
  },
  {
    question: '¿Puedo contratar un plan desde esta página?',
    answer: 'Todavía no. Esta página permite conocer el catálogo y consultar sus prestaciones. La contratación de los planes de suscripción estará disponible próximamente. Ver los detalles no activa un plan ni cambia las condiciones de tu cuenta.',
  },
] as const;
