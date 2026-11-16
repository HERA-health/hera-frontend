import type { SubscriptionCatalog } from '../../services/subscriptionService';
import { storageLabel, trialLabel } from '../../services/subscriptionService';
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

export const pricingAvailability = (trial: SubscriptionCatalog['trial']) => `Solicita tu plan con ${trialLabel(trial)} de prueba gratuita desde la activación. HERA te contactará para confirmarla; si después deseas continuar, podrás pagar externamente.`;
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

export function pricingPlansFromCatalog(catalog: SubscriptionCatalog): PricingPlan[] {
  const ids = { CALMA: 'calma', CRECIMIENTO: 'crecimiento', HORIZONTE: 'horizonte' } as const;
  return catalog.plans.flatMap(plan => plan.id === 'DIRECTORIO' ? [] : [{
    id: ids[plan.id], name: plan.name, monthlyPrice: (plan.monthlyCents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
    ownPatients: plan.ownPatientLimit === null ? 'Ilimitados' : 'Hasta ' + plan.ownPatientLimit,
    storageLabel: storageLabel(plan.storageBytes), statistics: 'Completas', ...plan.presentation,
  }]);
}

export const SUBSCRIPTION_ESSENTIALS = [
  'Agenda y calendario', 'Pacientes e historiales', 'Facturación',
  'Recordatorios por email', 'Videollamadas con Google Meet', 'Enlace para compartir',
] as const;

export const SUBSCRIPTION_TOOL_GROUPS = [
  { title: 'Organiza tu día', icon: 'calendar-outline', items: [SUBSCRIPTION_ESSENTIALS[0], SUBSCRIPTION_ESSENTIALS[3]] },
  { title: 'Gestiona tu consulta', icon: 'folder-open-outline', items: [SUBSCRIPTION_ESSENTIALS[1], SUBSCRIPTION_ESSENTIALS[2]] },
  { title: 'Mantén la conexión', icon: 'videocam-outline', items: [SUBSCRIPTION_ESSENTIALS[4], SUBSCRIPTION_ESSENTIALS[5]] },
] as const;

export const pricingFaqs = (plans: readonly PricingPlan[], directoryStorage: string, trial: SubscriptionCatalog['trial'], activityDays: number, enforced: boolean) => [
  {
    question: '¿Qué diferencia hay entre directorio y suscripción?',
    answer: enforced
      ? 'El directorio te permite recibir y atender a pacientes que llegan desde HERA, con las herramientas necesarias para su seguimiento y sin cuota mensual fija. La suscripción añade la gestión de tus pacientes propios y amplía el almacenamiento y las prestaciones de tu consulta.'
      : 'El directorio te permite recibir pacientes de HERA sin cuota mensual fija. En esta etapa también puedes gestionar pacientes propios sin suscripción. Los planes son opcionales y sus límites de pacientes y almacenamiento todavía no se aplican.',
  },
  {
    question: '¿Puedo combinar el directorio con una suscripción?',
    answer: 'Sí. Puedes atender a pacientes de HERA y gestionar tus pacientes propios en el mismo espacio. Los pacientes procedentes de HERA no consumen el cupo de pacientes propios de tu plan. La presencia en el directorio está sujeta a la verificación profesional y a la aceptación de sus condiciones.',
  },
  {
    question: '¿Qué pacientes cuentan para el límite del plan?',
    answer: `${enforced ? '' : 'Estos límites todavía no se aplican. Cuando se activen: '}Cuentan los pacientes propios con una sesión individual completada y atendida en los últimos ${activityDays} días, una cita futura o un bono utilizable pendiente. Cada paciente ocupa una sola plaza. Una ficha sin actividad ni compromisos no consume plaza. Los pacientes del directorio están excluidos.`,
  },
  {
    question: '¿Todos los planes incluyen publicaciones en redes?',
    answer: `Sí, los tres planes de suscripción incluyen publicaciones que prepara y publica el equipo de HERA en sus redes sociales. ${plans.map(plan => `${plan.name}: ${plan.publications.toLowerCase()}`).join('; ')}. Son una forma de dar a conocer tu práctica profesional a través de HERA.`,
  },
  {
    question: '¿Cuándo se aplican las comisiones?',
    answer: `${PRICING_COMMISSION_NOTE} La escala se cuenta para cada relación entre paciente y especialista: ${DIRECTORY_OFFER.commissions.map(item => `${item.session.toLowerCase()}, ${item.rate}`).join('; ')}.`,
  },
  {
    question: '¿Qué significa el almacenamiento de cada modalidad?',
    answer: `${enforced ? '' : 'Los límites de almacenamiento todavía no se aplican. Estas son las capacidades previstas de cada plan. '}${PRICING_STORAGE_NOTE} Directorio incluye ${directoryStorage}; ${plans.map(plan => `${plan.name}, ${plan.storageLabel}`).join('; ')}. En las suscripciones, tus pacientes propios y los procedentes de HERA comparten esa capacidad.`,
  },
  {
    question: '¿Puedo contratar un plan desde esta página?',
    answer: `Puedes solicitar la activación desde la tarjeta o el detalle de cualquier plan, sin crear una cuenta ni pagar ahora. HERA te contactará por email para confirmar el inicio de tu prueba gratuita de ${trialLabel(trial)}. Si después deseas continuar, te facilitaremos las instrucciones de transferencia bancaria. Ver los detalles o enviar una solicitud no activa un plan ni cambia las condiciones de tu cuenta.`,
  },
] as const;
