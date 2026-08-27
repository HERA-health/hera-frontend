import api from '../api';
import { getErrorMessage } from '../../constants/errors';
import { clearRequestCache } from '../requestCache';
import type {
  ClinicServiceCatalog,
  ClinicServiceCatalogItem,
  ClinicServiceErrorField,
  ClinicServiceListFilters,
  CreateClinicServicePayload,
  UpdateClinicServicePayload,
  UpdateClinicServiceStatusPayload,
} from './types';

const ERROR_MESSAGES: Partial<Record<string, string>> = {
  INVALID_CLINIC_SERVICE_DATA: 'Revisa los datos del servicio antes de continuar.',
  CLINIC_SERVICE_NOT_FOUND: 'No se encontró el servicio de esta clínica.',
  CLINIC_SERVICE_NAME_CONFLICT: 'Ya existe un servicio con ese nombre, también entre los archivados.',
  CLINIC_SERVICE_CONFLICT: 'El servicio ha cambiado mientras guardabas.',
  CLINIC_SERVICE_ACTIVE_SPECIALIST_REQUIRED: 'Asocia al menos un profesional activo.',
  CLINIC_SERVICE_DEFAULT_REPLACEMENT_REQUIRED: 'Selecciona el servicio predeterminado sustituto.',
  CLINIC_SERVICE_INVALID_REPLACEMENT: 'El servicio sustituto seleccionado no es válido.',
};

export class ClinicServiceRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly field?: ClinicServiceErrorField,
  ) {
    super(message);
    this.name = 'ClinicServiceRequestError';
  }
}

const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  return typeof response?.data?.code === 'string' ? response.data.code : undefined;
};

const ERROR_FIELDS = new Set<ClinicServiceErrorField>([
  'name',
  'description',
  'durationMinutes',
  'price',
  'modalities',
  'clinicSpecialistIds',
  'replacementDefaultServiceId',
]);

const getErrorField = (error: unknown): ClinicServiceErrorField | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const response = (error as { response?: { data?: { field?: unknown } } }).response;
  const field = response?.data?.field;
  return typeof field === 'string' && ERROR_FIELDS.has(field as ClinicServiceErrorField)
    ? field as ClinicServiceErrorField
    : undefined;
};

const toRequestError = (error: unknown, fallback: string): ClinicServiceRequestError => {
  const code = getErrorCode(error);
  const message = code && ERROR_MESSAGES[code]
    ? ERROR_MESSAGES[code]
    : getErrorMessage(error, fallback);
  return new ClinicServiceRequestError(message, code, getErrorField(error));
};

export const listClinicServices = async (
  clinicId: string,
  filters: ClinicServiceListFilters = {},
): Promise<ClinicServiceCatalog> => {
  try {
    const response = await api.get<{ success: boolean; data: ClinicServiceCatalog }>(
      `/clinics/${clinicId}/services`,
      { params: filters },
    );
    return response.data.data;
  } catch (error: unknown) {
    throw toRequestError(error, 'No se pudo cargar el catálogo de servicios');
  }
};

export const createClinicService = async (
  clinicId: string,
  payload: CreateClinicServicePayload,
): Promise<ClinicServiceCatalogItem> => {
  try {
    const response = await api.post<{ success: boolean; data: ClinicServiceCatalogItem }>(
      `/clinics/${clinicId}/services`,
      payload,
    );
    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw toRequestError(error, 'No se pudo crear el servicio');
  }
};

export const updateClinicService = async (
  clinicId: string,
  clinicServiceId: string,
  payload: UpdateClinicServicePayload,
): Promise<ClinicServiceCatalogItem> => {
  try {
    const response = await api.patch<{ success: boolean; data: ClinicServiceCatalogItem }>(
      `/clinics/${clinicId}/services/${clinicServiceId}`,
      payload,
    );
    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw toRequestError(error, 'No se pudo actualizar el servicio');
  }
};

export const updateClinicServiceStatus = async (
  clinicId: string,
  clinicServiceId: string,
  payload: UpdateClinicServiceStatusPayload,
): Promise<ClinicServiceCatalogItem> => {
  try {
    const response = await api.patch<{ success: boolean; data: ClinicServiceCatalogItem }>(
      `/clinics/${clinicId}/services/${clinicServiceId}/status`,
      payload,
    );
    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw toRequestError(error, 'No se pudo cambiar el estado del servicio');
  }
};

export const setDefaultClinicService = async (
  clinicId: string,
  clinicServiceId: string,
  version: number,
): Promise<ClinicServiceCatalogItem> => {
  try {
    const response = await api.patch<{ success: boolean; data: ClinicServiceCatalogItem }>(
      `/clinics/${clinicId}/services/${clinicServiceId}/default`,
      { version },
    );
    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw toRequestError(error, 'No se pudo cambiar el servicio predeterminado');
  }
};
