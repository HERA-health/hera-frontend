export const PROFESSIONAL_SHOWCASE_STEP_IDS = [
  'home',
  'agenda',
  'patients',
  'record',
  'documents',
  'billing',
  'availability',
  'statistics',
] as const;

export type ProfessionalShowcaseStepId =
  (typeof PROFESSIONAL_SHOWCASE_STEP_IDS)[number];
