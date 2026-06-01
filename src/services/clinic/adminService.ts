import api from '../api';
import { getErrorMessage } from '../../constants/errors';
import type {
  AddClinicAdministratorPayload,
  ClinicAdministrator,
  UpdateClinicAdministratorRolePayload,
  UpdateClinicAdministratorStatusPayload,
} from './types';

const CLINIC_ADMIN_ERROR_MESSAGES: Partial<Record<string, string>> = {
  INVALID_CLINIC_ADMIN_DATA:
    'Revisa los datos del administrador antes de continuar.',
  CLINIC_ADMIN_USER_NOT_FOUND:
    'No existe una cuenta HERA con ese email.',
  CLINIC_ADMIN_USER_NOT_ALLOWED:
    'Solo cuentas profesionales o de clínica pueden administrar una clínica.',
  CLINIC_ADMIN_USER_INACTIVE:
    'La cuenta existe, pero no está activa.',
  CLINIC_ADMIN_ALREADY_ACTIVE:
    'Este usuario ya administra la clínica.',
  CLINIC_ADMIN_NOT_FOUND:
    'No se encontró el administrador de esta clínica.',
  CLINIC_ADMIN_MEMBERSHIP_INACTIVE:
    'Reactiva este administrador antes de cambiar su rol.',
  CLINIC_ADMIN_OWNER_REQUIRES_CLINIC_ACCOUNT:
    'Solo una cuenta de clínica puede ser propietaria.',
  CLINIC_ADMIN_LAST_OWNER:
    'La clínica debe conservar al menos un propietario activo.',
  CLINIC_ADMIN_CONFLICT:
    'La administración de la clínica ha cambiado mientras guardabas. Actualiza la lista e inténtalo de nuevo.',
};

const getClinicAdminErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  return typeof response?.data?.code === 'string' ? response.data.code : undefined;
};

const getClinicAdminErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getClinicAdminErrorCode(error);
  if (code && CLINIC_ADMIN_ERROR_MESSAGES[code]) {
    return CLINIC_ADMIN_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const listClinicAdministrators = async (
  clinicId: string,
): Promise<ClinicAdministrator[]> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicAdministrator[];
    }>(`/clinics/${clinicId}/admins`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicAdminErrorMessage(
      error,
      'No se pudo cargar la administración de la clínica',
    ));
  }
};

export const addClinicAdministrator = async (
  clinicId: string,
  payload: AddClinicAdministratorPayload,
): Promise<ClinicAdministrator> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicAdministrator;
    }>(`/clinics/${clinicId}/admins`, payload);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicAdminErrorMessage(
      error,
      'No se pudo añadir el administrador',
    ));
  }
};

export const updateClinicAdministratorRole = async (
  clinicId: string,
  membershipId: string,
  payload: UpdateClinicAdministratorRolePayload,
): Promise<ClinicAdministrator> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicAdministrator;
    }>(`/clinics/${clinicId}/admins/${membershipId}/role`, payload);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicAdminErrorMessage(
      error,
      'No se pudo cambiar el rol del administrador',
    ));
  }
};

export const updateClinicAdministratorStatus = async (
  clinicId: string,
  membershipId: string,
  payload: UpdateClinicAdministratorStatusPayload,
): Promise<ClinicAdministrator> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicAdministrator;
    }>(`/clinics/${clinicId}/admins/${membershipId}/status`, payload);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicAdminErrorMessage(
      error,
      'No se pudo cambiar el estado del administrador',
    ));
  }
};
