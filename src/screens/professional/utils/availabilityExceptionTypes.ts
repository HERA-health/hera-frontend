import Ionicons from '@expo/vector-icons/Ionicons';

import {
  AVAILABILITY_ABSENCE_REASONS,
  type AvailabilityAbsenceReason,
} from '../../../services/availabilityContracts';
import type { Theme } from '../../../constants/theme';

type ExceptionTone = 'primary' | 'secondary' | 'warning' | 'muted';

interface ExceptionTypeMetadata {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: ExceptionTone;
}

export interface AvailabilityExceptionType extends ExceptionTypeMetadata {
  label: AvailabilityAbsenceReason;
}

const EXCEPTION_TYPE_BY_REASON = {
  Vacaciones: { id: 'vacation', icon: 'airplane-outline', tone: 'primary' },
  Formación: { id: 'training', icon: 'school-outline', tone: 'secondary' },
  Baja: { id: 'sick-leave', icon: 'medkit-outline', tone: 'warning' },
  Personal: { id: 'personal', icon: 'person-outline', tone: 'warning' },
  Festivo: { id: 'holiday', icon: 'calendar-outline', tone: 'warning' },
  Otro: { id: 'other', icon: 'ellipsis-horizontal-outline', tone: 'muted' },
} as const satisfies Record<AvailabilityAbsenceReason, ExceptionTypeMetadata>;

export type AvailabilityExceptionTypeId =
  (typeof EXCEPTION_TYPE_BY_REASON)[AvailabilityAbsenceReason]['id'];

export const AVAILABILITY_EXCEPTION_TYPES = AVAILABILITY_ABSENCE_REASONS.map((label) => ({
  label,
  ...EXCEPTION_TYPE_BY_REASON[label],
})) satisfies AvailabilityExceptionType[];

const FALLBACK_EXCEPTION_TYPE: ExceptionTypeMetadata = {
  id: 'unknown',
  icon: 'calendar-clear-outline',
  tone: 'muted',
};

export const getExceptionVisualType = (displayReason: string): ExceptionTypeMetadata => (
  AVAILABILITY_EXCEPTION_TYPES.find((type) =>
    displayReason.toLowerCase().includes(type.label.toLowerCase())
  ) ?? FALLBACK_EXCEPTION_TYPE
);

export const getExceptionToneColor = (
  theme: Theme,
  type: Pick<ExceptionTypeMetadata, 'tone'>
): string => {
  switch (type.tone) {
    case 'primary':
      return theme.primary;
    case 'secondary':
      return theme.secondary;
    case 'warning':
      return theme.warning;
    default:
      return theme.textMuted;
  }
};
