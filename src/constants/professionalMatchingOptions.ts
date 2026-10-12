export * from './professionalMatchingCatalog';
import { PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS, type ProfessionalMatchingOption } from './professionalMatchingCatalog';
export const PROFESSIONAL_LANGUAGE_OPTIONS = [
  { value: 'spanish', aliases: [], label: 'Español' },
  { value: 'english', aliases: [], label: 'Inglés' },
  { value: 'catalan', aliases: [], label: 'Catalán' },
  { value: 'french', aliases: [], label: 'Francés' },
  { value: 'german', aliases: [], label: 'Alemán' },
  { value: 'portuguese', aliases: [], label: 'Portugués' },
] as const satisfies readonly ProfessionalMatchingOption[];

export type ProfessionalSpecialtyValue = typeof PROFESSIONAL_SPECIALTY_OPTIONS[number]['value'];
export type ProfessionalTherapeuticApproachValue = typeof PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS[number]['value'];

export const isProfessionalSpecialtyValue = (
  value: unknown
): value is ProfessionalSpecialtyValue =>
  typeof value === 'string'
  && PROFESSIONAL_SPECIALTY_OPTIONS.some((option) => option.value === value);
