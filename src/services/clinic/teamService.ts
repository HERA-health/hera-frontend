import api from '../api';
import { getErrorMessage } from '../../constants/errors';
import { clearRequestCache } from '../requestCache';
import type {
  ClinicSpecialist,
  ClinicSpecialistListFilters,
  ClinicSpecialistPayload,
  ClinicSpecialistStatus,
  LinkClinicSpecialistPayload,
  LinkedProfessional,
  UpdateClinicSpecialistPayload,
} from './types';

const CLINIC_SPECIALIST_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_SPECIALIST_NOT_FOUND:
    'No se encontró la ficha del especialista de la clínica.',
  CLINIC_SPECIALIST_INACTIVE:
    'No se puede vincular una ficha de especialista inactiva.',
  CLINIC_PROFESSIONAL_NOT_FOUND:
    'No se encontró una cuenta profesional activa con ese email.',
  CLINIC_PROFESSIONAL_ALREADY_LINKED:
    'Ese profesional ya está vinculado a otra ficha de esta clínica.',
  CLINIC_SPECIALIST_CONFLICT:
    'La ficha del especialista ha cambiado mientras guardabas. Revisa el estado e inténtalo de nuevo.',
  INVALID_CLINIC_SPECIALIST_DATA:
    'Revisa los datos del especialista antes de continuar.',
};

const getClinicSpecialistErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  return typeof response?.data?.code === 'string' ? response.data.code : undefined;
};

const getClinicSpecialistErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getClinicSpecialistErrorCode(error);
  if (code && CLINIC_SPECIALIST_ERROR_MESSAGES[code]) {
    return CLINIC_SPECIALIST_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const listClinicSpecialists = async (
  clinicId: string,
  filters: ClinicSpecialistListFilters = {},
): Promise<ClinicSpecialist[]> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicSpecialist[];
    }>(`/clinics/${clinicId}/specialists`, {
      params: {
        status: filters.status,
        search: filters.search,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(error, 'No se pudo cargar el equipo de clínica'));
  }
};

export const getClinicSpecialist = async (
  clinicId: string,
  clinicSpecialistId: string,
): Promise<ClinicSpecialist> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicSpecialist;
    }>(`/clinics/${clinicId}/specialists/${clinicSpecialistId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(error, 'No se pudo cargar la ficha del especialista'));
  }
};

export const createClinicSpecialist = async (
  clinicId: string,
  payload: ClinicSpecialistPayload,
): Promise<ClinicSpecialist> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicSpecialist;
    }>(`/clinics/${clinicId}/specialists`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(error, 'No se pudo crear el especialista'));
  }
};

export const updateClinicSpecialist = async (
  clinicId: string,
  clinicSpecialistId: string,
  payload: UpdateClinicSpecialistPayload,
): Promise<ClinicSpecialist> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicSpecialist;
    }>(`/clinics/${clinicId}/specialists/${clinicSpecialistId}`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(error, 'No se pudo guardar la ficha del especialista'));
  }
};

export const updateClinicSpecialistStatus = async (
  clinicId: string,
  clinicSpecialistId: string,
  status: ClinicSpecialistStatus,
): Promise<ClinicSpecialist> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicSpecialist;
    }>(`/clinics/${clinicId}/specialists/${clinicSpecialistId}/status`, { status });

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(error, 'No se pudo actualizar el estado del especialista'));
  }
};

export const lookupClinicProfessionalByEmail = async (
  clinicId: string,
  email: string,
): Promise<LinkedProfessional> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: LinkedProfessional;
    }>(`/clinics/${clinicId}/specialists/professional-lookup`, {
      params: { email },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(
      error,
      'No se pudo buscar la cuenta profesional',
    ));
  }
};

export const linkClinicSpecialist = async (
  clinicId: string,
  clinicSpecialistId: string,
  payload: LinkClinicSpecialistPayload,
): Promise<ClinicSpecialist> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicSpecialist;
    }>(`/clinics/${clinicId}/specialists/${clinicSpecialistId}/link`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(
      error,
      'No se pudo vincular la cuenta profesional',
    ));
  }
};

export const unlinkClinicSpecialist = async (
  clinicId: string,
  clinicSpecialistId: string,
): Promise<ClinicSpecialist> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicSpecialist;
    }>(`/clinics/${clinicId}/specialists/${clinicSpecialistId}/unlink`);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicSpecialistErrorMessage(
      error,
      'No se pudo desvincular la cuenta profesional',
    ));
  }
};
