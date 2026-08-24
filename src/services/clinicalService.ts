import { api } from './api';
import axios from 'axios';
import { getErrorCode, getErrorMessage } from '../constants/errors';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { z } from 'zod';
import type { ClinicalGuestConsentEligibility } from './clinicalGuestConsentEligibility';
import type {
  ClinicalConsentMethod,
  ClinicalConsentStatus,
  Client,
  QuestionnaireSummary,
  QuestionnaireAvailability,
} from './professionalService';

export interface ClinicalAccessSessionStatus {
  active: boolean;
  sessionId: string | null;
  createdAt: string | null;
  absoluteExpiresAt: string | null;
  idleExpiresAt: string | null;
}

export interface ClinicalAccessStatus {
  hasPin: boolean;
  pinLockedUntil: string | null;
  pinUpdatedAt: string | null;
  acceptedDataProcessingAgreementAt: string | null;
  dataProcessingAgreementVersion: string | null;
  currentDataProcessingAgreementVersion?: string;
  requiresDataProcessingAgreementAcceptance?: boolean;
  session: ClinicalAccessSessionStatus;
}

export interface ClinicalUnlockResponse {
  token: string;
  sessionId: string;
  absoluteExpiresAt: string;
  idleExpiresAt: string;
}

export type ClinicalHeartbeatMode = 'ACTIVE' | 'WEB_HIDDEN' | 'NATIVE_BACKGROUND';

export interface ClinicalNote {
  id: string;
  sessionId?: string | null;
  createdAt: string;
  updatedAt: string;
  content: string;
}

export interface ClinicalDocument {
  id: string;
  sessionId?: string | null;
  category:
    | 'GENERAL'
    | 'CONSENT_EVIDENCE'
    | 'MEDICAL_REPORT'
    | 'SESSION_ATTACHMENT'
    | 'SESSION_EXERCISE';
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  sizeBytes: number | null;
}

export interface ClinicalConsentEvent {
  id: string;
  status: ClinicalConsentStatus;
  method: ClinicalConsentMethod;
  version: string;
  evidenceDocumentId?: string | null;
  eventType:
    | 'REQUESTED'
    | 'DELIVERY_UNKNOWN'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REVOKED'
    | 'CONSENT_RECORDED';
  requestKind: 'GRANT' | 'WITHDRAWAL' | null;
  channel: 'HERA_ACCOUNT_EMAIL' | 'GUEST_EMAIL' | null;
  createdAt: string;
}

export interface ClinicalQuestionnaireAnswers {
  [questionId: string]: string | string[];
}

export interface ClinicalRecordClient extends Client {
  completedQuestionnaire?: boolean;
  questionnaireAvailability?: QuestionnaireAvailability;
  questionnaireSummary?: QuestionnaireSummary | null;
  questionnaireAnswers?: ClinicalQuestionnaireAnswers | null;
}

export interface ClinicalPageInfo {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface ClinicalSessionFolder {
  session: {
    id: string;
    date: string;
    duration: number;
    bookedPrice?: number | null;
    bookedCurrency?: string | null;
    bookedTariffId?: string | null;
    bookedTariffName?: string | null;
    bookedDuration?: number | null;
    status: string;
    type: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
      total: number;
    } | null;
  };
  notes: ClinicalNote[];
  documents: ClinicalDocument[];
}

export interface ClinicalRecord {
  id: string;
  consentStatus: ClinicalConsentStatus;
  consentGivenAt: string | null;
  consentRequestedAt: string | null;
  consentVersion: string | null;
  consentMethod: ClinicalConsentMethod | null;
  retentionUntil: string | null;
  closedAt: string | null;
  eligibleForManualReview: boolean;
  client: ClinicalRecordClient;
  activeConsentRequest: ClinicalActiveConsentRequest | null;
  guestConsentActionsEnabled: boolean;
  guestConsentEligibility?: ClinicalGuestConsentEligibility;
  notes: ClinicalNote[];
  documents: ClinicalDocument[];
  consentEvents: ClinicalConsentEvent[];
  sessionFolders: ClinicalSessionFolder[];
  pagination: {
    notes: ClinicalPageInfo;
    documents: ClinicalPageInfo;
    consentEvents: ClinicalPageInfo;
    sessionFolders: ClinicalPageInfo;
  };
}


export interface ClinicalActiveConsentRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED';
  channel: 'HERA_ACCOUNT_EMAIL' | 'GUEST_EMAIL' | null;
  requestKind: 'GRANT' | 'WITHDRAWAL' | null;
  linkDeliveryStatus: 'PENDING' | 'PROVIDER_ACCEPTED' | 'FAILED' | 'UNKNOWN' | 'CANCELLED' | null;
  expiresAt: string;
  createdAt: string;
  version: string;
}

export interface ClinicalConsentRequestResult {
  requestId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
}

const clinicalGuestAdminResultSchema = z.object({
  requestId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  channel: z.literal('GUEST_EMAIL'),
  requestKind: z.enum(['GRANT', 'WITHDRAWAL']),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED', 'CANCELLED']),
  linkDeliveryStatus: z.enum(['PENDING', 'PROVIDER_ACCEPTED', 'FAILED', 'UNKNOWN', 'CANCELLED']),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  redeemedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  expiredAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
}).strict();
export type ClinicalGuestConsentAdminResult = z.infer<typeof clinicalGuestAdminResultSchema>;

export type ClinicalGuestConsentAdminFailureClassification =
  | 'timeout'
  | 'network'
  | 'server'
  | 'definitive';

export class ClinicalGuestConsentAdminRequestError extends Error {
  constructor(
    message: string,
    public readonly classification: ClinicalGuestConsentAdminFailureClassification,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ClinicalGuestConsentAdminRequestError';
  }
}

const clinicalGuestAdminRequest = async (
  url: string,
  body: Record<string, never> | { channel: 'GUEST_EMAIL'; confirmsAdultAndSelfActing: true },
  clinicalAccessToken: string,
  idempotencyKey?: string
): Promise<ClinicalGuestConsentAdminResult> => {
  try {
    const response = await api.post(
      url,
      body,
      {
        headers: {
          ...buildClinicalHeaders(clinicalAccessToken),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        timeout: 30000,
      }
    );
    return clinicalGuestAdminResultSchema.parse(response.data.data);
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const classification: ClinicalGuestConsentAdminFailureClassification = axios.isAxiosError(error)
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
    throw new ClinicalGuestConsentAdminRequestError(
      getErrorMessage(error, 'No se pudo completar la solicitud de consentimiento por email'),
      classification,
      status,
      getErrorCode(error)
    );
  }
};

export interface ClinicalConsentRequestResolution {
  id: string;
  clinicalRecordId: string;
  version: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  consentStatus: ClinicalConsentStatus;
  requiresLogin: boolean;
  alreadyUsed: boolean;
}

export type ClinicalDocumentCategory =
  | 'GENERAL'
  | 'CONSENT_EVIDENCE'
  | 'MEDICAL_REPORT'
  | 'SESSION_ATTACHMENT'
  | 'SESSION_EXERCISE';

const buildClinicalHeaders = (clinicalAccessToken?: string) =>
  clinicalAccessToken
    ? {
        'x-clinical-access-token': clinicalAccessToken,
      }
    : undefined;

const mapPage = <T>(payload: { items: T[]; pageInfo: ClinicalPageInfo }) => payload;

export const hasAcceptedCurrentDataProcessingAgreement = (
  status: ClinicalAccessStatus
): boolean => {
  if (typeof status.requiresDataProcessingAgreementAcceptance === 'boolean') {
    return Boolean(
      status.acceptedDataProcessingAgreementAt
        && !status.requiresDataProcessingAgreementAcceptance
    );
  }

  if (status.currentDataProcessingAgreementVersion) {
    return Boolean(
      status.acceptedDataProcessingAgreementAt
        && status.dataProcessingAgreementVersion === status.currentDataProcessingAgreementVersion
    );
  }

  return Boolean(status.acceptedDataProcessingAgreementAt);
};

export const getClinicalAccessStatus = async (
  clinicalAccessToken?: string | null
): Promise<ClinicalAccessStatus> => {
  try {
    const response = await api.get('/clinical/access/status', {
      headers: buildClinicalHeaders(clinicalAccessToken || undefined),
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo obtener el estado del acceso clínico'));
  }
};

export const acceptDataProcessingAgreement = async (version?: string): Promise<void> => {
  try {
    await api.post('/clinical/access/dpa/accept', version ? { version } : {});
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo aceptar el encargo de tratamiento'));
  }
};

export const setupClinicalPin = async (pin: string): Promise<void> => {
  try {
    await api.post('/clinical/access/pin/setup', { pin });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo configurar el PIN clínico'));
  }
};

export const rotateClinicalPin = async (currentPin: string, nextPin: string): Promise<void> => {
  try {
    await api.post('/clinical/access/pin/rotate', { currentPin, nextPin });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el PIN clínico'));
  }
};

export const unlockClinicalArea = async (pin: string): Promise<ClinicalUnlockResponse> => {
  try {
    const response = await api.post('/clinical/access/unlock', { pin });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo desbloquear el área clínica'));
  }
};

export const lockClinicalArea = async (clinicalAccessToken: string): Promise<void> => {
  try {
    await api.post(
      '/clinical/access/lock',
      {},
      {
        headers: buildClinicalHeaders(clinicalAccessToken),
      }
    );
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo bloquear el área clínica'));
  }
};

export const heartbeatClinicalArea = async (
  clinicalAccessToken: string,
  mode: ClinicalHeartbeatMode = 'ACTIVE'
): Promise<ClinicalUnlockResponse> => {
  try {
    const response = await api.post(
      '/clinical/access/heartbeat',
      { mode },
      {
        headers: buildClinicalHeaders(clinicalAccessToken),
      }
    );

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'La sesión clínica ya no está disponible'));
  }
};

export const getClinicalRecord = async (
  clientId: string,
  clinicalAccessToken: string
): Promise<ClinicalRecord> => {
  try {
    const response = await api.get(`/clinical/records/${clientId}`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el historial clínico'));
  }
};

export const listClinicalNotes = async (
  clientId: string,
  clinicalAccessToken: string,
  options: {
    cursor?: string | null;
    limit?: number;
  } = {}
) => {
  try {
    const response = await api.get(`/clinical/records/${clientId}/notes`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
      params: options,
    });
    return mapPage<ClinicalNote>(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar más notas clínicas'));
  }
};

export const listClinicalDocuments = async (
  clientId: string,
  clinicalAccessToken: string,
  options: {
    cursor?: string | null;
    limit?: number;
    scope?: 'general' | 'all';
  } = {}
) => {
  try {
    const response = await api.get(`/clinical/records/${clientId}/documents`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
      params: options,
    });
    return mapPage<ClinicalDocument>(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar más documentos clínicos'));
  }
};

export const listClinicalConsentEvents = async (
  clientId: string,
  clinicalAccessToken: string,
  options: {
    cursor?: string | null;
    limit?: number;
  } = {}
) => {
  try {
    const response = await api.get(`/clinical/records/${clientId}/consent-events`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
      params: options,
    });
    return mapPage<ClinicalConsentEvent>(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar más eventos de consentimiento'));
  }
};

export const listClinicalSessionFolders = async (
  clientId: string,
  clinicalAccessToken: string,
  options: {
    cursor?: string | null;
    limit?: number;
  } = {}
) => {
  try {
    const response = await api.get(`/clinical/records/${clientId}/session-folders`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
      params: options,
    });
    return mapPage<ClinicalSessionFolder>(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar más sesiones clínicas'));
  }
};

export const getClinicalSessionFolder = async (
  clientId: string,
  sessionId: string,
  clinicalAccessToken: string
): Promise<ClinicalSessionFolder> => {
  try {
    const response = await api.get(`/clinical/records/${clientId}/session-folders/${sessionId}`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo abrir la carpeta clinica de la sesion'));
  }
};

export const createClinicalNote = async (
  clientId: string,
  content: string,
  clinicalAccessToken: string,
  sessionId?: string
): Promise<ClinicalNote> => {
  try {
    const response = await api.post(
      `/clinical/records/${clientId}/notes`,
      { content, sessionId },
      { headers: buildClinicalHeaders(clinicalAccessToken) }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo guardar la nota clínica'));
  }
};

export const updateClinicalNote = async (
  noteId: string,
  content: string,
  clinicalAccessToken: string
): Promise<ClinicalNote> => {
  try {
    const response = await api.put(
      `/clinical/notes/${noteId}`,
      { content },
      { headers: buildClinicalHeaders(clinicalAccessToken) }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar la nota clínica'));
  }
};

export const deleteClinicalNote = async (
  noteId: string,
  clinicalAccessToken: string
): Promise<void> => {
  try {
    await api.delete(`/clinical/notes/${noteId}`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
    });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo eliminar la nota clínica'));
  }
};

export const uploadClinicalDocument = async (
  clientId: string,
  file: UploadAsset,
  clinicalAccessToken: string,
  category: ClinicalDocumentCategory = 'GENERAL',
  sessionId?: string
): Promise<ClinicalDocument> => {
  try {
    const formData = await buildMultipartFormData(
      'document',
      file,
      {
        category,
        ...(sessionId ? { sessionId } : {}),
      },
      'clinical-document'
    );
    const response = await api.post(`/clinical/records/${clientId}/documents`, formData, {
      headers: {
        ...buildClinicalHeaders(clinicalAccessToken),
      },
      timeout: 30000,
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo subir el documento clínico'));
  }
};

export const openClinicalDocument = async (
  documentId: string,
  _fileName: string,
  mimeType: string,
  clinicalAccessToken: string
): Promise<void> => {
  try {
    const response = await api.get(`/clinical/documents/${documentId}/download`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
      responseType: 'blob',
      timeout: 30000,
    });

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
    throw new Error(getErrorMessage(error, 'No se pudo abrir el documento clínico'));
  }
};

export const requestDigitalConsent = async (
  clientId: string,
  version: string = 'v1'
): Promise<ClinicalConsentRequestResult> => {
  try {
    const response = await api.post(
      `/clinical/records/${clientId}/consent/request`,
      { version },
      { timeout: 30000 }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo enviar la autorización por email'));
  }
};

export const requestClinicalGuestConsent = async (
  clientId: string,
  clinicalAccessToken: string,
  idempotencyKey: string
): Promise<ClinicalGuestConsentAdminResult> => {
  return clinicalGuestAdminRequest(
    `/clinical/records/${clientId}/consent/guest-requests`,
    { channel: 'GUEST_EMAIL', confirmsAdultAndSelfActing: true },
    clinicalAccessToken,
    idempotencyKey
  );
};

export const resendClinicalGuestConsent = async (
  clientId: string,
  requestId: string,
  clinicalAccessToken: string,
  idempotencyKey: string
): Promise<ClinicalGuestConsentAdminResult> => {
  return clinicalGuestAdminRequest(
    `/clinical/records/${clientId}/consent/guest-requests/${requestId}/resend`,
    {},
    clinicalAccessToken,
    idempotencyKey
  );
};

export const cancelClinicalGuestConsent = async (
  clientId: string,
  requestId: string,
  clinicalAccessToken: string
): Promise<ClinicalGuestConsentAdminResult> => {
  return clinicalGuestAdminRequest(
    `/clinical/records/${clientId}/consent/guest-requests/${requestId}/cancel`,
    {},
    clinicalAccessToken
  );
};

export const requestClinicalGuestWithdrawal = async (
  clientId: string,
  clinicalAccessToken: string,
  idempotencyKey: string
): Promise<ClinicalGuestConsentAdminResult> => {
  return clinicalGuestAdminRequest(
    `/clinical/records/${clientId}/consent/guest-withdrawal-requests`,
    { channel: 'GUEST_EMAIL', confirmsAdultAndSelfActing: true },
    clinicalAccessToken,
    idempotencyKey
  );
};

export const resolveDigitalConsentRequest = async (
  requestId: string,
  token: string
): Promise<ClinicalConsentRequestResolution> => {
  try {
    const response = await api.get(`/clinical/consent/requests/${requestId}/resolve`, {
      params: { token },
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo abrir la solicitud de consentimiento'));
  }
};

export const acceptDigitalConsent = async (
  requestId: string,
  token: string
): Promise<ClinicalConsentRequestResolution> => {
  try {
    const response = await api.post(`/clinical/consent/requests/${requestId}/accept`, { token });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo registrar el consentimiento'));
  }
};

export const revokeDigitalConsent = async (
  requestId: string,
  token: string
): Promise<ClinicalConsentRequestResolution> => {
  try {
    const response = await api.post(`/clinical/consent/requests/${requestId}/revoke`, { token });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo retirar el consentimiento'));
  }
};

export const attestClinicalConsent = async (
  clientId: string,
  clinicalAccessToken: string,
  version: string = 'v1',
  evidenceDocumentId?: string
): Promise<{ success: boolean; clinicalRecordId: string; consentStatus: ClinicalConsentStatus; consentGivenAt: string }> => {
  try {
    const response = await api.post(
      `/clinical/records/${clientId}/consent/attest`,
      { version, evidenceDocumentId },
      { headers: buildClinicalHeaders(clinicalAccessToken) }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo registrar el consentimiento en poder del profesional'));
  }
};

export const closeClinicalProcess = async (
  clientId: string,
  clinicalAccessToken: string
) => {
  try {
    const response = await api.post(
      `/clinical/records/${clientId}/close-process`,
      {},
      { headers: buildClinicalHeaders(clinicalAccessToken) }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cerrar el proceso asistencial'));
  }
};
