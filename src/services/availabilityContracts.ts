export const AVAILABILITY_ABSENCE_REASONS = [
  'Vacaciones',
  'Formación',
  'Baja',
  'Personal',
  'Festivo',
  'Otro',
] as const;

export type AvailabilityAbsenceReason = typeof AVAILABILITY_ABSENCE_REASONS[number];

export interface AvailabilityExceptionRangeImpact {
  activeSessionCount: number;
}

export interface AvailabilityExceptionRangeResult {
  startDate: string;
  endDate: string;
  reason: AvailabilityAbsenceReason;
  dayCount: number;
  createdCount: number;
  updatedCount: number;
  activeSessionCount: number;
}

export interface RemoveAvailabilityExceptionRangeResult {
  deletedCount: number;
}
