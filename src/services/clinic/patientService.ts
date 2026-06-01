import api from '../api';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { clearRequestCache } from '../requestCache';
import type {
  AssignClinicPatientPayload,
  ClinicPatientAssignmentHistoryFilters,
  ClinicPatientAssignmentHistoryPage,
  ClinicPatientDetail,
  ClinicPatientListFilters,
  ClinicPatientListPage,
  ClinicPatientPayload,
  ClinicPatientStatus,
  CloseClinicPatientAssignmentPayload,
  UpdateClinicPatientPayload,
} from './types';

const CLINIC_PATIENT_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_PATIENT_DUPLICATE_EMAIL:
    'Ya existe un paciente de esta clínica con ese email administrativo.',
  CLINIC_PATIENT_NOT_FOUND:
    'No se encontró la ficha del paciente.',
  CLINIC_PATIENT_CONFLICT:
    'La ficha ha cambiado mientras guardabas. Revisa los datos e inténtalo de nuevo.',
  INVALID_CLINIC_PATIENT_DATA:
    'Revisa los datos del paciente antes de continuar.',
  INVALID_CLINIC_ASSIGNMENT_DATA:
    'Selecciona un especialista activo antes de guardar.',
  CLINIC_ASSIGNMENT_PATIENT_NOT_FOUND:
    'No se encontró la ficha del paciente.',
  CLINIC_ASSIGNMENT_SPECIALIST_NOT_FOUND:
    'No se encontró el especialista de la clínica.',
  CLINIC_ASSIGNMENT_PATIENT_ARCHIVED:
    'No se puede asignar un paciente archivado.',
  CLINIC_ASSIGNMENT_SPECIALIST_INACTIVE:
    'No se puede asignar un especialista inactivo.',
  CLINIC_ASSIGNMENT_NOT_FOUND:
    'Este paciente no tiene un responsable asistencial activo.',
  CLINIC_ASSIGNMENT_CONFLICT:
    'La asignación ha cambiado mientras guardabas. Revisa el responsable e inténtalo de nuevo.',
};

const getClinicPatientErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getErrorCode(error);
  if (code && CLINIC_PATIENT_ERROR_MESSAGES[code]) {
    return CLINIC_PATIENT_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const listClinicPatients = async (
  clinicId: string,
  filters: ClinicPatientListFilters = {},
): Promise<ClinicPatientListPage> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicPatientListPage;
    }>(`/clinics/${clinicId}/patients`, {
      params: {
        status: filters.status,
        search: filters.search,
        assignment: filters.assignment,
        clinicSpecialistId: filters.clinicSpecialistId,
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo cargar el listado de pacientes',
    ));
  }
};

export const getClinicPatient = async (
  clinicId: string,
  clinicPatientId: string,
): Promise<ClinicPatientDetail> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicPatientDetail;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo cargar la ficha del paciente',
    ));
  }
};

export const createClinicPatient = async (
  clinicId: string,
  payload: ClinicPatientPayload,
): Promise<ClinicPatientDetail> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicPatientDetail;
    }>(`/clinics/${clinicId}/patients`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo crear el paciente',
    ));
  }
};

export const updateClinicPatient = async (
  clinicId: string,
  clinicPatientId: string,
  payload: UpdateClinicPatientPayload,
): Promise<ClinicPatientDetail> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicPatientDetail;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo guardar la ficha del paciente',
    ));
  }
};

export const updateClinicPatientStatus = async (
  clinicId: string,
  clinicPatientId: string,
  status: ClinicPatientStatus,
): Promise<ClinicPatientDetail> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicPatientDetail;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}/status`, { status });

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo actualizar el estado del paciente',
    ));
  }
};

export const assignClinicPatient = async (
  clinicId: string,
  clinicPatientId: string,
  payload: AssignClinicPatientPayload,
): Promise<ClinicPatientDetail> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicPatientDetail;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}/assignment`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo asignar el responsable asistencial',
    ));
  }
};

export const closeClinicPatientAssignment = async (
  clinicId: string,
  clinicPatientId: string,
  payload: CloseClinicPatientAssignmentPayload = {},
): Promise<ClinicPatientDetail> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicPatientDetail;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}/assignment/close`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo retirar el responsable asistencial',
    ));
  }
};

export const listClinicPatientAssignmentHistory = async (
  clinicId: string,
  clinicPatientId: string,
  filters: ClinicPatientAssignmentHistoryFilters = {},
): Promise<ClinicPatientAssignmentHistoryPage> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicPatientAssignmentHistoryPage;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}/assignment/history`, {
      params: {
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicPatientErrorMessage(
      error,
      'No se pudo cargar el historial de responsables',
    ));
  }
};
