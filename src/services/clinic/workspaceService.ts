import api from '../api';
import { getErrorMessage } from '../../constants/errors';
import { cachedGet, clearRequestCache } from '../requestCache';
import type {
  ClinicDashboard,
  ClinicDetail,
  ClinicMembershipSummary,
  UpdateClinicPayload,
} from './types';

export const getMyClinicMemberships = async (): Promise<ClinicMembershipSummary[]> => {
  try {
    return await cachedGet('clinic:memberships', async () => {
      const response = await api.get<{
        success: boolean;
        data: ClinicMembershipSummary[];
      }>('/clinics/me');

      return response.data.data;
    });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la cuenta de clínica'));
  }
};

export const getClinic = async (clinicId: string): Promise<ClinicDetail> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicDetail;
    }>(`/clinics/${clinicId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la clínica'));
  }
};

export const updateClinic = async (
  clinicId: string,
  payload: UpdateClinicPayload,
): Promise<ClinicDetail> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicDetail;
    }>(`/clinics/${clinicId}`, payload);

    clearRequestCache();
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron guardar los datos de la clínica'));
  }
};

export const getClinicDashboard = async (
  clinicId: string,
): Promise<ClinicDashboard> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicDashboard;
    }>(`/clinics/${clinicId}/dashboard`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el panel de clínica'));
  }
};
