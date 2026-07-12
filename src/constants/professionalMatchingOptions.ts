export interface ProfessionalMatchingOption {
  value: string;
  label: string;
}

// Keep these canonical values aligned with the backend matching choice contract.
export const PROFESSIONAL_SPECIALTY_OPTIONS = [
  { value: 'anxiety', label: 'Ansiedad y estrés' },
  { value: 'depression', label: 'Depresión' },
  { value: 'couples', label: 'Terapia de pareja' },
  { value: 'trauma', label: 'Trauma (EMDR)' },
  { value: 'self-esteem', label: 'Autoestima' },
  { value: 'grief', label: 'Duelo' },
  { value: 'addiction', label: 'Adicciones' },
  { value: 'eating', label: 'Trastornos alimentarios' },
  { value: 'sleep', label: 'Problemas de sueño' },
  { value: 'phobias', label: 'Fobias' },
] as const satisfies readonly ProfessionalMatchingOption[];

export const PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS = [
  { value: 'cbt', label: 'Cognitivo-Conductual (TCC)' },
  { value: 'act', label: 'Terapia de Aceptación y Compromiso' },
  { value: 'emdr', label: 'EMDR' },
  { value: 'psychodynamic', label: 'Psicodinámico' },
  { value: 'humanistic', label: 'Humanista' },
  { value: 'systemic', label: 'Sistémico' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'gestalt', label: 'Gestalt' },
] as const satisfies readonly ProfessionalMatchingOption[];

export const PROFESSIONAL_LANGUAGE_OPTIONS = [
  { value: 'spanish', label: 'Español' },
  { value: 'english', label: 'Inglés' },
  { value: 'catalan', label: 'Catalán' },
  { value: 'french', label: 'Francés' },
  { value: 'german', label: 'Alemán' },
  { value: 'portuguese', label: 'Portugués' },
] as const satisfies readonly ProfessionalMatchingOption[];

export type ProfessionalSpecialtyValue = typeof PROFESSIONAL_SPECIALTY_OPTIONS[number]['value'];
export type ProfessionalTherapeuticApproachValue = typeof PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS[number]['value'];
