import { Platform } from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { z } from 'zod';
import api from '../api';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { buildMultipartFormData, type UploadAsset } from '../../utils/multipartUpload';
import type {
  ClinicPatientConsentDetail,
  ClinicPatientConsentListFilters,
  ClinicPatientConsentListPage,
  ClinicPatientConsentRequestResult,
  ClinicGuestConsentAdminResult,
  ClinicPatientConsentResolution,
} from './types';

const clinicGuestConsentAdminResultSchema = z.object({
  requestId: z.string().min(8).max(64),
  requestKind: z.enum(['GRANT', 'WITHDRAWAL']),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED', 'CANCELLED']),
  linkDeliveryStatus: z.enum(['PENDING', 'PROVIDER_ACCEPTED', 'FAILED', 'UNKNOWN', 'CANCELLED']),
  expiresAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
}).strict();

export type ClinicGuestConsentAdminFailureClassification =
  | 'timeout'
  | 'network'
  | 'server'
  | 'definitive';

export class ClinicGuestConsentAdminRequestError extends Error {
  constructor(
    message: string,
    public readonly classification: ClinicGuestConsentAdminFailureClassification,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ClinicGuestConsentAdminRequestError';
  }
}

const guestAdminRequest = async (
  url: string,
  body: Record<string, never> | { channel: 'GUEST_EMAIL' },
  idempotencyKey?: string,
): Promise<ClinicGuestConsentAdminResult> => {
  try {
    const response = await api.post<{ success: boolean; data: ClinicGuestConsentAdminResult }>(
      url,
      body,
      {
        timeout: 30000,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      },
    );
    return clinicGuestConsentAdminResultSchema.parse(response.data.data);
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const classification: ClinicGuestConsentAdminFailureClassification = axios.isAxiosError(error)
      ? error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? 'timeout'
        : !error.response
          ? 'network'
          : status !== undefined && status >= 500
            ? 'server'
            : 'definitive'
      : error instanceof z.ZodError
        ? 'server'
        : 'definitive';
    throw new ClinicGuestConsentAdminRequestError(
      getClinicConsentErrorMessage(
        error,
        'No se pudo completar la solicitud de consentimiento invitado',
      ),
      classification,
      status,
      getErrorCode(error),
    );
  }
};

export const issueClinicGuestConsent = (
  clinicId: string,
  clinicPatientId: string,
  idempotencyKey: string,
): Promise<ClinicGuestConsentAdminResult> => guestAdminRequest(
  `/clinics/${clinicId}/patients/${clinicPatientId}/consent/guest-requests`,
  { channel: 'GUEST_EMAIL' },
  idempotencyKey,
);

export const resendClinicGuestConsent = (
  clinicId: string,
  clinicPatientId: string,
  requestId: string,
  idempotencyKey: string,
): Promise<ClinicGuestConsentAdminResult> => guestAdminRequest(
  `/clinics/${clinicId}/patients/${clinicPatientId}/consent/guest-requests/${requestId}/resend`,
  { channel: 'GUEST_EMAIL' },
  idempotencyKey,
);

export const cancelClinicGuestConsent = (
  clinicId: string,
  clinicPatientId: string,
  requestId: string,
): Promise<ClinicGuestConsentAdminResult> => guestAdminRequest(
  `/clinics/${clinicId}/patients/${clinicPatientId}/consent/guest-requests/${requestId}/cancel`,
  {},
);

export const issueClinicGuestConsentWithdrawal = (
  clinicId: string,
  clinicPatientId: string,
  idempotencyKey: string,
): Promise<ClinicGuestConsentAdminResult> => guestAdminRequest(
  `/clinics/${clinicId}/patients/${clinicPatientId}/consent/guest-withdrawal-requests`,
  { channel: 'GUEST_EMAIL' },
  idempotencyKey,
);

const CLINIC_CONSENT_ERROR_MESSAGES: Partial<Record<string, string>> = {
  CLINIC_CONSENT_PATIENT_NOT_FOUND:
    'No se encontró la ficha del paciente.',
  CLINIC_CONSENT_PATIENT_ARCHIVED:
    'No se puede gestionar consentimiento de un paciente archivado.',
  CLINIC_CONSENT_DIGITAL_UNAVAILABLE:
    'Este paciente necesita una cuenta HERA enlazada para usar el consentimiento digital.',
  CLINIC_CONSENT_EMAIL_FAILED:
    'No se pudo enviar el email de consentimiento. Revisa la configuración del correo de la clínica.',
  CLINIC_CONSENT_ALREADY_GRANTED:
    'El consentimiento de este paciente ya está concedido.',
  CLINIC_CONSENT_REQUEST_NOT_FOUND:
    'No se encontró la solicitud de consentimiento.',
  CLINIC_CONSENT_REQUEST_INVALID:
    'La solicitud de consentimiento no es válida.',
  CLINIC_CONSENT_REQUEST_EXPIRED:
    'La solicitud de consentimiento ha caducado.',
  CLINIC_CONSENT_REQUEST_USED:
    'Esta solicitud de consentimiento ya ha sido utilizada.',
  CLINIC_CONSENT_CLIENT_MISMATCH:
    'Debes entrar con la cuenta de paciente vinculada a esta ficha.',
  CLINIC_CONSENT_DOCUMENT_REQUIRED:
    'Adjunta el consentimiento firmado en PDF.',
  CLINIC_CONSENT_DOCUMENT_NOT_FOUND:
    'No se encontró el documento de consentimiento.',
  CLINIC_CONSENT_STORAGE_FAILED:
    'No se pudo acceder al documento en el almacenamiento privado.',
};

const getClinicConsentErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const code = getErrorCode(error);
  if (code && CLINIC_CONSENT_ERROR_MESSAGES[code]) {
    return CLINIC_CONSENT_ERROR_MESSAGES[code];
  }

  return getErrorMessage(error, fallbackMessage);
};

export const listClinicPatientConsents = async (
  clinicId: string,
  filters: ClinicPatientConsentListFilters = {},
): Promise<ClinicPatientConsentListPage> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicPatientConsentListPage;
    }>(`/clinics/${clinicId}/consents`, {
      params: {
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
      },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo cargar el estado de consentimientos',
    ));
  }
};

export const getClinicPatientConsent = async (
  clinicId: string,
  clinicPatientId: string,
): Promise<ClinicPatientConsentDetail> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicPatientConsentDetail;
    }>(`/clinics/${clinicId}/patients/${clinicPatientId}/consent`);

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo cargar el consentimiento del paciente',
    ));
  }
};

export const requestClinicPatientConsent = async (
  clinicId: string,
  clinicPatientId: string,
  version?: string,
): Promise<ClinicPatientConsentRequestResult> => {
  try {
    const payload: Record<string, string> = version ? { version } : {};
    const response = await api.post<{
      success: boolean;
      data: ClinicPatientConsentRequestResult;
    }>(
      `/clinics/${clinicId}/patients/${clinicPatientId}/consent/request`,
      payload,
      { timeout: 30000 },
    );

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo solicitar el consentimiento digital',
    ));
  }
};

export const uploadClinicPatientConsentEvidence = async (
  clinicId: string,
  clinicPatientId: string,
  file: UploadAsset,
  version?: string,
): Promise<ClinicPatientConsentDetail> => {
  try {
    const fields: Record<string, string> = version ? { version } : {};
    const formData = await buildMultipartFormData(
      'document',
      file,
      fields,
      'consentimiento-clinica',
    );
    const response = await api.post<{
      success: boolean;
      data: ClinicPatientConsentDetail;
    }>(
      `/clinics/${clinicId}/patients/${clinicPatientId}/consent/evidence`,
      formData,
      { timeout: 30000 },
    );

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo subir el consentimiento firmado',
    ));
  }
};

export const openClinicPatientConsentDocument = async (
  clinicId: string,
  clinicPatientId: string,
  documentId: string,
  _fileName: string,
  mimeType: string,
): Promise<void> => {
  try {
    const response = await api.get(
      `/clinics/${clinicId}/patients/${clinicPatientId}/consent/documents/${documentId}/download`,
      {
        responseType: 'blob',
        timeout: 30000,
      },
    );

    const contentType =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : mimeType || 'application/octet-stream';
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
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo abrir el documento de consentimiento',
    ));
  }
};

export const resolveClinicPatientConsentRequest = async (
  requestId: string,
  token: string,
): Promise<ClinicPatientConsentResolution> => {
  try {
    const response = await api.get<{
      success: boolean;
      data: ClinicPatientConsentResolution;
    }>(`/clinics/consent/requests/${requestId}/resolve`, {
      params: { token },
    });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo abrir la solicitud de consentimiento',
    ));
  }
};

export const acceptClinicPatientConsentRequest = async (
  requestId: string,
  token: string,
): Promise<ClinicPatientConsentResolution> => {
  try {
    const response = await api.post<{
      success: boolean;
      data: ClinicPatientConsentResolution;
    }>(`/clinics/consent/requests/${requestId}/accept`, { token });

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getClinicConsentErrorMessage(
      error,
      'No se pudo aceptar el consentimiento',
    ));
  }
};
