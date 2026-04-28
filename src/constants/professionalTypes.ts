import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export type ProfessionalType =
  | 'PSYCHOLOGIST_HEALTH'
  | 'PSYCHOLOGIST_CLINICAL'
  | 'PSYCHIATRIST'
  | 'OCCUPATIONAL_THERAPIST'
  | 'MENTAL_HEALTH_NURSE';

export interface ProfessionalTypeOption {
  id: ProfessionalType;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

export const DEFAULT_PROFESSIONAL_TYPE_LABEL = 'Profesional de salud mental';

export const PROFESSIONAL_TYPE_OPTIONS: ProfessionalTypeOption[] = [
  {
    id: 'PSYCHOLOGIST_HEALTH',
    label: 'Psicólogo/a sanitario/a',
    icon: 'medkit-outline',
  },
  {
    id: 'PSYCHOLOGIST_CLINICAL',
    label: 'Psicólogo/a clínico/a',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'PSYCHIATRIST',
    label: 'Psiquiatra',
    icon: 'medical-outline',
  },
  {
    id: 'OCCUPATIONAL_THERAPIST',
    label: 'Terapeuta ocupacional',
    icon: 'accessibility-outline',
  },
  {
    id: 'MENTAL_HEALTH_NURSE',
    label: 'Enfermero/a especialista en salud mental',
    icon: 'heart-circle-outline',
  },
];

export const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = Object.fromEntries(
  PROFESSIONAL_TYPE_OPTIONS.map((option) => [option.id, option.label]),
) as Record<ProfessionalType, string>;

export const getProfessionalTypeLabel = (
  professionalType?: ProfessionalType | null,
  providedLabel?: string | null,
): string => (
  providedLabel?.trim()
    || (professionalType ? PROFESSIONAL_TYPE_LABELS[professionalType] : DEFAULT_PROFESSIONAL_TYPE_LABEL)
);
