import api from './api';
import { getErrorMessage } from '../constants/errors';

export type ClinicStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type ClinicMembershipRole = 'OWNER' | 'ADMIN' | 'SPECIALIST';
export type ClinicMembershipStatus = 'ACTIVE' | 'INACTIVE';
export type ClinicSpecialistStatus = 'ACTIVE' | 'INACTIVE';
export type ClinicSpecialistStatusFilter = ClinicSpecialistStatus | 'ALL';

export interface ClinicSummary {
  id: string;
  commercialName: string;
  legalName: string | null;
  status: ClinicStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicDetail extends ClinicSummary {
  email: string | null;
  phone: string | null;
  taxId: string | null;
  fiscalAddress: string | null;
  fiscalPostalCode: string | null;
  fiscalCity: string | null;
  fiscalCountry: string | null;
}

export interface ClinicMembershipSummary {
  id: string;
  role: ClinicMembershipRole;
  status: ClinicMembershipStatus;
  createdAt: string;
  updatedAt: string;
  clinic: ClinicSummary;
}

export type ClinicDashboardMetricKey =
  | 'activeSpecialists'
  | 'activePatients'
  | 'upcomingSessions'
  | 'pendingConsents';

export interface ClinicDashboardMetric {
  key: ClinicDashboardMetricKey;
  label: string;
  value: number | null;
  available: boolean;
  helperText: string;
}

export interface ClinicDashboard {
  clinic: ClinicSummary;
  metrics: ClinicDashboardMetric[];
}

export interface ClinicSpecialist {
  id: string;
  clinicId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  professionalTitle: string | null;
  licenseNumber: string | null;
  specialization: string | null;
  status: ClinicSpecialistStatus;
  baseSessionPrice: number | null;
  revenueSharePercentage: number | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
}

export interface UpdateClinicPayload {
  commercialName?: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  fiscalAddress?: string | null;
  fiscalPostalCode?: string | null;
  fiscalCity?: string | null;
  fiscalCountry?: string | null;
}

export interface ClinicSpecialistPayload {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  professionalTitle?: string | null;
  licenseNumber?: string | null;
  specialization?: string | null;
  baseSessionPrice?: number | null;
  revenueSharePercentage?: number | null;
}

export type UpdateClinicSpecialistPayload = Partial<ClinicSpecialistPayload>;

export interface ClinicSpecialistListFilters {
  status?: ClinicSpecialistStatusFilter;
  search?: string;
}

export const getMyClinicMemberships = async (): Promise<ClinicMembershipSummary[]> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicMembershipSummary[];
    }>('/clinics/me');

    return response.data.data;
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
    throw new Error(getErrorMessage(error, 'No se pudo cargar el equipo de clínica'));
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
    throw new Error(getErrorMessage(error, 'No se pudo cargar la ficha del especialista'));
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

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo crear el especialista'));
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

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo guardar la ficha del especialista'));
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

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el estado del especialista'));
  }
};
