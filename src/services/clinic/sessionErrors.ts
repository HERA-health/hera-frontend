export interface ClinicSessionConflictError extends Error {
  code: 'CLINIC_SESSION_CONFLICT';
}

export const isClinicSessionConflictError = (
  error: unknown,
): error is ClinicSessionConflictError => (
  error instanceof Error
  && 'code' in error
  && error.code === 'CLINIC_SESSION_CONFLICT'
);
