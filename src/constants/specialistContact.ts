import type {
  SpecialistFeedbackCategory,
  SpecialistFeedbackStatus,
  SpecialistHelpCategory,
  SpecialistHelpImpact,
  SpecialistHelpStatus,
} from '../services/specialistContactService';

export const HELP_CATEGORY_OPTIONS: Array<{
  value: SpecialistHelpCategory;
  label: string;
}> = [
  { value: 'TECHNICAL', label: 'Problema técnico' },
  { value: 'ACCOUNT_ACCESS', label: 'Acceso o cuenta' },
  { value: 'AGENDA_SESSIONS', label: 'Agenda o sesiones' },
  { value: 'BILLING', label: 'Facturación' },
  { value: 'PROFILE', label: 'Perfil profesional' },
  { value: 'CLINIC_MANAGEMENT', label: 'Gestión de clínica' },
  { value: 'PRIVACY_SECURITY', label: 'Privacidad o seguridad' },
  { value: 'OTHER', label: 'Otro' },
];

export const HELP_IMPACT_OPTIONS: Array<{
  value: SpecialistHelpImpact;
  label: string;
}> = [
  { value: 'BLOCKING', label: 'Me impide trabajar' },
  { value: 'DEGRADED', label: 'Dificulta mi trabajo' },
  { value: 'NON_BLOCKING', label: 'No me bloquea' },
];

export const FEEDBACK_CATEGORY_OPTIONS: Array<{
  value: SpecialistFeedbackCategory;
  label: string;
}> = [
  { value: 'IMPROVEMENT_IDEA', label: 'Idea de mejora' },
  { value: 'CONFUSING_EXPERIENCE', label: 'Experiencia confusa' },
  { value: 'GENERAL_COMMENT', label: 'Comentario general' },
  { value: 'POSITIVE_FEEDBACK', label: 'Comentario positivo' },
];

export const HELP_STATUS_LABELS: Record<SpecialistHelpStatus, string> = {
  NEW: 'Nueva',
  IN_PROGRESS: 'En curso',
  WAITING_FOR_SPECIALIST: 'Esperando tu respuesta',
  RESOLVED: 'Resuelta',
};

export const FEEDBACK_STATUS_LABELS: Record<SpecialistFeedbackStatus, string> = {
  RECEIVED: 'Recibido',
  REVIEWED: 'Revisado',
  CONSIDERING: 'En valoración',
  PLANNED: 'Planificado',
  IMPLEMENTED: 'Aplicado',
  CLOSED: 'Cerrado',
};

export const HELP_CATEGORY_LABELS = Object.fromEntries(
  HELP_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
) as Record<SpecialistHelpCategory, string>;

export const HELP_IMPACT_LABELS = Object.fromEntries(
  HELP_IMPACT_OPTIONS.map((option) => [option.value, option.label])
) as Record<SpecialistHelpImpact, string>;

export const FEEDBACK_CATEGORY_LABELS = Object.fromEntries(
  FEEDBACK_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
) as Record<SpecialistFeedbackCategory, string>;
