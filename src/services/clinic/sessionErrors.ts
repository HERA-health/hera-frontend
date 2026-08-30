export type ClinicSessionRefreshErrorCode =
  | 'CLINIC_SESSION_CONFLICT'
  | 'CLINIC_SESSION_INVALID_SLOT'
  | 'CLINIC_SESSION_SERVICE_REQUIRED'
  | 'CLINIC_SESSION_SERVICE_UNAVAILABLE'
  | 'CLINIC_SESSION_SERVICE_CONFLICT'
  | 'CLINIC_SESSION_SERVICE_MODALITY_UNAVAILABLE';

export interface ClinicSessionConflictError extends Error {
  code: ClinicSessionRefreshErrorCode;
  field?: 'clinicServiceId' | 'type' | 'date';
}

export const isClinicSessionConflictError = (
  error: unknown,
): error is ClinicSessionConflictError => (
  error instanceof Error
  && 'code' in error
  && error.code === 'CLINIC_SESSION_CONFLICT'
);

export const isClinicSessionInvalidSlotError = (
  error: unknown,
): error is ClinicSessionConflictError => (
  error instanceof Error
  && 'code' in error
  && error.code === 'CLINIC_SESSION_INVALID_SLOT'
);

export const isClinicSessionServiceRefreshError = (
  error: unknown,
): error is ClinicSessionConflictError => (
  error instanceof Error
  && 'code' in error
  && (
    error.code === 'CLINIC_SESSION_SERVICE_REQUIRED'
    || error.code === 'CLINIC_SESSION_SERVICE_UNAVAILABLE'
    || error.code === 'CLINIC_SESSION_SERVICE_CONFLICT'
    || error.code === 'CLINIC_SESSION_SERVICE_MODALITY_UNAVAILABLE'
  )
);
