import api from '../api';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { clearRequestCache } from '../requestCache';
import type {
  ClinicSessionListFilters,
  ClinicSessionListPage,
  ClinicSessionSummary,
  CreateClinicSessionPayload,
  UpdateClinicSessionStatusPayload,
} from './types';

const CLINIC_SESSION_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_SESSION_NOT_FOUND:
    'No se encontró la cita de clínica.',
  CLINIC_SESSION_CONFLICT:
    'Ese horario ya no está disponible para el profesional seleccionado.',
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
  CLINIC_SESSION_INVALID_STATUS:
    'Revisa el estado o la fecha de la cita antes de continuar.',
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

export const createClinicSession = async (
  clinicId: string,
  payload: CreateClinicSessionPayload,
): Promise<ClinicSessionSummary> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicSessionSummary;
    }>(`/clinics/${clinicId}/sessions`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
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

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSessionErrorMessage(
      error,
      'No se pudo actualizar la cita',
    ));
  }
};
