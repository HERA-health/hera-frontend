import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import api from '../api';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type {
  ClinicBillingConfig,
  ClinicBillingSummary,
  ClinicInvoiceDetail,
  ClinicInvoiceListFilters,
  ClinicInvoiceListPage,
  ClinicRevenueShareSummary,
  ClinicRevenueShareSummaryFilters,
  CreateClinicInvoicePayload,
  UpdateClinicBillingConfigPayload,
  UpdateClinicInvoicePayload,
} from './types';

const CLINIC_BILLING_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_BILLING_CONFIG_INVALID:
    'Revisa la configuración fiscal antes de continuar.',
  CLINIC_BILLING_PATIENT_NOT_FOUND:
    'No se encontró la ficha del paciente.',
  CLINIC_BILLING_PATIENT_ARCHIVED:
    'No se pueden crear facturas manuales para pacientes archivados.',
  CLINIC_BILLING_SPECIALIST_NOT_FOUND:
    'No se encontró el profesional de la clínica.',
  CLINIC_BILLING_SESSION_NOT_FOUND:
    'No se encontró la cita de clínica.',
  CLINIC_BILLING_SESSION_INVALID_STATUS:
    'Solo se pueden facturar citas de clínica completadas.',
  CLINIC_BILLING_SESSION_ALREADY_INVOICED:
    'Esta cita ya tiene una factura activa.',
  CLINIC_BILLING_INVOICE_NOT_FOUND:
    'No se encontró la factura.',
  CLINIC_BILLING_INVOICE_INVALID_STATUS:
    'El estado de la factura no permite esta acción.',
  CLINIC_BILLING_EMAIL_REQUIRED:
    'El paciente no tiene email disponible para enviar la factura.',
  CLINIC_BILLING_EMAIL_FAILED:
    'No se pudo enviar el email de la factura.',
  CLINIC_INVOICE_EMAIL_FAILED:
    'No se pudo enviar el email de la factura.',
  CLINIC_BILLING_STORAGE_FAILED:
    'No se pudo guardar o recuperar el PDF de la factura.',
};

const getClinicBillingErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getErrorCode(error);
  if (code && CLINIC_BILLING_ERROR_MESSAGES[code]) {
    return CLINIC_BILLING_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const getClinicBillingSummary = async (
  clinicId: string,
): Promise<ClinicBillingSummary> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicBillingSummary;
    }>(`/clinics/${clinicId}/billing/summary`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo cargar el resumen de facturación',
    ));
  }
};

export const getClinicRevenueShareSummary = async (
  clinicId: string,
  filters: ClinicRevenueShareSummaryFilters = {},
): Promise<ClinicRevenueShareSummary> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicRevenueShareSummary;
    }>(`/clinics/${clinicId}/billing/revenue-share`, {
      params: {
        year: filters.year,
        month: filters.month,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo cargar el resumen de reparto',
    ));
  }
};

export const getClinicBillingConfig = async (
  clinicId: string,
): Promise<ClinicBillingConfig> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicBillingConfig;
    }>(`/clinics/${clinicId}/billing/config`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo cargar la configuración de facturación',
    ));
  }
};

export const updateClinicBillingConfig = async (
  clinicId: string,
  payload: UpdateClinicBillingConfigPayload,
): Promise<ClinicBillingConfig> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicBillingConfig;
    }>(`/clinics/${clinicId}/billing/config`, payload);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo guardar la configuración de facturación',
    ));
  }
};

export const listClinicInvoices = async (
  clinicId: string,
  filters: ClinicInvoiceListFilters = {},
): Promise<ClinicInvoiceListPage> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicInvoiceListPage;
    }>(`/clinics/${clinicId}/billing/invoices`, {
      params: {
        status: filters.status,
        invoiceKind: filters.invoiceKind,
        month: filters.month,
        year: filters.year,
        clinicPatientId: filters.clinicPatientId,
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudieron cargar las facturas',
    ));
  }
};

export const createClinicInvoice = async (
  clinicId: string,
  payload: CreateClinicInvoicePayload,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/invoices`, payload);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo crear la factura',
    ));
  }
};

export const createClinicInvoiceFromSession = async (
  clinicId: string,
  sessionId: string,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/sessions/${sessionId}/invoice`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo generar la factura desde la cita',
    ));
  }
};

export const getClinicInvoice = async (
  clinicId: string,
  invoiceId: string,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/invoices/${invoiceId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo cargar la factura',
    ));
  }
};

export const updateClinicInvoice = async (
  clinicId: string,
  invoiceId: string,
  payload: UpdateClinicInvoicePayload,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.put<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/invoices/${invoiceId}`, payload);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo actualizar la factura',
    ));
  }
};

export const sendClinicInvoice = async (
  clinicId: string,
  invoiceId: string,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/invoices/${invoiceId}/send`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo enviar la factura',
    ));
  }
};

export const markClinicInvoiceAsPaid = async (
  clinicId: string,
  invoiceId: string,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/invoices/${invoiceId}/paid`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo marcar la factura como pagada',
    ));
  }
};

export const cancelClinicInvoice = async (
  clinicId: string,
  invoiceId: string,
): Promise<ClinicInvoiceDetail> => {
  try {
    const response = await api.delete<{
      success: boolean;
      data: ClinicInvoiceDetail;
    }>(`/clinics/${clinicId}/billing/invoices/${invoiceId}`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo cancelar la factura',
    ));
  }
};

export const openClinicInvoicePdf = async (
  clinicId: string,
  invoiceId: string,
): Promise<void> => {
  try {
    const response = await api.get(
      `/clinics/${clinicId}/billing/invoices/${invoiceId}/pdf`,
      {
        responseType: 'blob',
        timeout: 30000,
      },
    );

    const contentType =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });

    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      await WebBrowser.openBrowserAsync(dataUrl);
    };
    reader.readAsDataURL(blob);
  } catch (error: unknown) {
    throw new Error(getClinicBillingErrorMessage(
      error,
      'No se pudo abrir el PDF de la factura',
    ));
  }
};
