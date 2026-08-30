import api from '../api';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type {
  ClinicSessionListFilters,
  ClinicSessionListPage,
  ClinicAgenda,
  ClinicAgendaFilters,
  ClinicSessionDetail,
  ClinicSessionSummary,
  ClinicSessionSlotOptionsResult,
  ClinicSessionServiceOptionsResult,
  CreateClinicSessionPayload,
  GetClinicSessionSlotOptionsInput,
  GetClinicSessionServiceOptionsInput,
  UpdateClinicSessionStatusPayload,
} from './types';
import type { ClinicSessionConflictError } from './sessionErrors';
export {
  isClinicSessionConflictError,
  isClinicSessionInvalidSlotError,
  isClinicSessionServiceRefreshError,
} from './sessionErrors';
export type { ClinicSessionConflictError } from './sessionErrors';

export interface ClinicSessionChange {
  clinicId: string;
  clinicPatientId: string;
  clinicSpecialistId: string;
  sessionId: string;
  mutation: 'CREATED' | 'STATUS_UPDATED';
}

type ClinicSessionChangeListener = (change: ClinicSessionChange) => void;
const clinicSessionChangeListeners = new Set<ClinicSessionChangeListener>();

export const subscribeClinicSessionChanges = (
  listener: ClinicSessionChangeListener,
): (() => void) => {
  clinicSessionChangeListeners.add(listener);
  return () => clinicSessionChangeListeners.delete(listener);
};

const notifyClinicSessionChanged = (change: ClinicSessionChange): void => {
  clinicSessionChangeListeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      console.warn('No se pudo propagar una actualización local de cita de clínica.');
    }
  });
};

const CLINIC_SESSION_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_SESSION_NOT_FOUND:
    'No se encontró la cita de clínica.',
  CLINIC_SESSION_CONFLICT:
    'Ese horario ya no está disponible. Elige otro hueco.',
  CLINIC_SESSION_PATIENT_NOT_FOUND:
    'No se encontró la ficha del paciente.',
  CLINIC_SESSION_PATIENT_ARCHIVED:
    'No se pueden crear citas para pacientes archivados.',
  CLINIC_SESSION_SPECIALIST_NOT_FOUND:
    'No se encontró el profesional de la clínica.',
  CLINIC_SESSION_SPECIALIST_INACTIVE:
    'No se pueden crear citas con profesionales inactivos.',
  CLINIC_SESSION_ASSIGNMENT_REQUIRED:
    'El paciente debe estar asignado al profesional responsable.',
  CLINIC_SESSION_CARE_CONTEXT_REQUIRED:
    'No hay un contexto asistencial activo para esta asignación.',
  CLINIC_SESSION_VIDEO_DISABLED:
    'Las videollamadas de clínica no están activas todavía.',
  CLINIC_SESSION_SERVICE_REQUIRED:
    'Selecciona un servicio para crear la cita.',
  CLINIC_SESSION_SERVICE_UNAVAILABLE:
    'El servicio ya no está disponible para este profesional.',
  CLINIC_SESSION_SERVICE_CONFLICT:
    'El servicio ha cambiado. Revisa sus datos antes de guardar de nuevo.',
  CLINIC_SESSION_SERVICE_MODALITY_UNAVAILABLE:
    'La modalidad seleccionada ya no está disponible para este servicio.',
  CLINIC_SESSION_INVALID_SLOT:
    'Selecciona una hora entre las 07:00 y las 23:00, en intervalos de 15 minutos (hora peninsular).',
  CLINIC_SESSION_INVALID_STATUS:
    'Revisa el estado o la fecha de la cita antes de continuar.',
  CLINIC_AGENDA_INVALID_RANGE:
    'Selecciona un periodo de agenda válido de hasta 42 días.',
  CLINIC_AGENDA_SPECIALIST_REQUIRED:
    'Selecciona un profesional vinculado para consultar citas particulares.',
  CLINIC_AGENDA_SPECIALIST_NOT_AVAILABLE:
    'El profesional seleccionado ya no tiene una cuenta profesional activa vinculada.',
};

const getClinicSessionErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getErrorCode(error);
  if (code && CLINIC_SESSION_ERROR_MESSAGES[code]) {
    return CLINIC_SESSION_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const listClinicSessions = async (
  clinicId: string,
  filters: ClinicSessionListFilters = {},
): Promise<ClinicSessionListPage> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicSessionListPage;
    }>(`/clinics/${clinicId}/sessions`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clinicSpecialistId: filters.clinicSpecialistId,
        clinicPatientId: filters.clinicPatientId,
        status: filters.status,
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudo cargar la agenda de clínica',
    ));
  }
};

export const getClinicAgenda = async (
  clinicId: string,
  filters: ClinicAgendaFilters,
): Promise<ClinicAgenda> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicAgenda;
    }>(`/clinics/${clinicId}/agenda`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clinicSpecialistId: filters.clinicSpecialistId,
        clinicPatientId: filters.clinicPatientId,
        status: filters.status,
        origin: filters.origin,
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudo cargar la agenda de clínica',
    ));
  }
};

export const getClinicSessionDetail = async (
  clinicId: string,
  sessionId: string,
): Promise<ClinicSessionDetail> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicSessionDetail;
    }>(`/clinics/${clinicId}/sessions/${sessionId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudo cargar la cita de clínica',
    ));
  }
};

export const getClinicSessionSlotOptions = async (
  clinicId: string,
  input: GetClinicSessionSlotOptionsInput,
): Promise<ClinicSessionSlotOptionsResult> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicSessionSlotOptionsResult;
    }>(`/clinics/${clinicId}/sessions/slot-options`, {
      params: input,
    });

    return response.data.data;
  } catch (error: unknown) {
    const code = getErrorCode(error);
    if (
      code === 'CLINIC_SESSION_SERVICE_REQUIRED'
      || code === 'CLINIC_SESSION_SERVICE_UNAVAILABLE'
      || code === 'CLINIC_SESSION_SERVICE_CONFLICT'
    ) {
      const refreshError = new Error(getClinicSessionErrorMessage(
        error,
        'El servicio ha cambiado. Revisa sus datos antes de continuar.',
      )) as ClinicSessionConflictError;
      refreshError.code = code;
      refreshError.field = 'clinicServiceId';
      throw refreshError;
    }

    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudieron comprobar los huecos disponibles',
    ));
  }
};

export const getClinicSessionServiceOptions = async (
  clinicId: string,
  input: GetClinicSessionServiceOptionsInput,
): Promise<ClinicSessionServiceOptionsResult> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicSessionServiceOptionsResult;
    }>(`/clinics/${clinicId}/sessions/service-options`, { params: input });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudieron cargar los servicios disponibles',
    ));
  }
};

export const createClinicSession = async (
  clinicId: string,
  payload: CreateClinicSessionPayload,
): Promise<ClinicSessionSummary> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicSessionSummary;
    }>(`/clinics/${clinicId}/sessions`, payload);

    const session = response.data.data;
    notifyClinicSessionChanged({
      clinicId,
      clinicPatientId: session.patient.id,
      clinicSpecialistId: session.specialist.id,
      sessionId: session.id,
      mutation: 'CREATED',
    });
    return session;
  } catch (error: unknown) {
    const code = getErrorCode(error);
    if (
      code === 'CLINIC_SESSION_CONFLICT'
      || code === 'CLINIC_SESSION_INVALID_SLOT'
      || code === 'CLINIC_SESSION_SERVICE_REQUIRED'
      || code === 'CLINIC_SESSION_SERVICE_UNAVAILABLE'
      || code === 'CLINIC_SESSION_SERVICE_CONFLICT'
      || code === 'CLINIC_SESSION_SERVICE_MODALITY_UNAVAILABLE'
    ) {
      const conflict = new Error(getClinicSessionErrorMessage(
        error,
        'Ese horario ya no está disponible. Elige otro hueco.',
      )) as ClinicSessionConflictError;
      conflict.code = code;
      conflict.field = code === 'CLINIC_SESSION_SERVICE_MODALITY_UNAVAILABLE'
        ? 'type'
        : code === 'CLINIC_SESSION_INVALID_SLOT'
          ? 'date'
          : code === 'CLINIC_SESSION_CONFLICT'
            ? undefined
            : 'clinicServiceId';
      throw conflict;
    }

    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudo crear la cita',
    ));
  }
};

export const updateClinicSessionStatus = async (
  clinicId: string,
  sessionId: string,
  payload: UpdateClinicSessionStatusPayload,
): Promise<ClinicSessionSummary> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicSessionSummary;
    }>(`/clinics/${clinicId}/sessions/${sessionId}/status`, payload);

    const session = response.data.data;
    notifyClinicSessionChanged({
      clinicId,
      clinicPatientId: session.patient.id,
      clinicSpecialistId: session.specialist.id,
      sessionId: session.id,
      mutation: 'STATUS_UPDATED',
    });
    return session;
  } catch (error: unknown) {
    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudo actualizar la cita',
    ));
  }
};
