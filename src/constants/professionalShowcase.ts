export const PROFESSIONAL_SHOWCASE_STEP_IDS = [
  'home',
  'patients',
  'agenda',
  'availability',
  'billing',
  'statistics',
] as const;

export type ProfessionalShowcaseStepId =
  (typeof PROFESSIONAL_SHOWCASE_STEP_IDS)[number];
