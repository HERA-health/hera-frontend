import api from '../api';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type {
  ProfessionalClinicContext,
  ProfessionalClinicPatientDetail,
  ProfessionalClinicPatientListFilters,
  ProfessionalClinicPatientListPage,
} from './types';

const CLINIC_PROFESSIONAL_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_PROFESSIONAL_ACCESS_DENIED:
    'No tienes acceso profesional activo a esta clínica.',
  CLINIC_PROFESSIONAL_PATIENT_NOT_FOUND:
    'No se encontró este paciente entre tus asignaciones activas de clínica.',
};

const getClinicProfessionalErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getErrorCode(error);
  if (code && CLINIC_PROFESSIONAL_ERROR_MESSAGES[code]) {
    return CLINIC_PROFESSIONAL_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const getMyProfessionalClinicContexts = async (): Promise<ProfessionalClinicContext[]> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ProfessionalClinicContext[];
    }>('/clinics/specialist/me');

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicProfessionalErrorMessage(
      error,
      'No se pudieron cargar tus clínicas',
    ));
  }
};

export const listProfessionalClinicPatients = async (
  clinicId: string,
  filters: ProfessionalClinicPatientListFilters = {},
): Promise<ProfessionalClinicPatientListPage> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ProfessionalClinicPatientListPage;
    }>(`/clinics/${clinicId}/specialist/patients`, {
      params: {
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicProfessionalErrorMessage(
      error,
      'No se pudieron cargar tus pacientes de clínica',
    ));
  }
};

export const getProfessionalClinicPatient = async (
  clinicId: string,
  clinicPatientId: string,
): Promise<ProfessionalClinicPatientDetail> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ProfessionalClinicPatientDetail;
    }>(`/clinics/${clinicId}/specialist/patients/${clinicPatientId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicProfessionalErrorMessage(
      error,
      'No se pudo cargar el paciente de clínica',
    ));
  }
};
