import { legalProofs } from './legalService';
import { api } from './api';
import { ClinicalPinError } from './clinicalPinService';
import axios from 'axios';
import { getErrorCode, getErrorMessage } from '../constants/errors';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as sharing from 'expo-sharing';
import { z } from 'zod';
import { beginClinicalDownload } from './clinicalDownloads';
import type { ClinicalGuestConsentEligibility } from './clinicalGuestConsentEligibility';
import { createSecureRandomUuid } from '../utils/secureRandom';
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

export class ClinicalRequestError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(error: unknown, fallback: string) {
    let source = error;
    if (axios.isAxiosError(error) && error.response?.data instanceof ArrayBuffer) {
      try {
        const body: unknown = JSON.parse(new TextDecoder().decode(error.response.data));
        const parsed = z.object({ code: z.string().optional(), error: z.string().optional(), message: z.string().optional() }).safeParse(body);
        if (parsed.success) source = { response: { data: parsed.data } };
      } catch { /* A binary error body must never be shown as document contents. */ }
    }
    super(getErrorMessage(source, fallback));
    this.name = 'ClinicalRequestError';
    this.status = axios.isAxiosError(error) ? error.response?.status : undefined;
    this.code = getErrorCode(source) ?? (axios.isAxiosError(error) && error.response?.status === 423 ? 'CLINICAL_UNLOCK_REQUIRED' : undefined);
  }
}

export const isClinicalSaveUncertain = (error: unknown): boolean => {
  const code = getErrorCode(error);
  if (code && ['CLINICAL_CLIENT_UPDATE_REQUIRED', 'CLINICAL_VERSION_CONFLICT', 'CLINICAL_OPERATION_CONFLICT', 'CLINICAL_CONSENT_REQUIRED', 'CLINICAL_UNLOCK_REQUIRED', 'CLINICAL_PROCESS_CLOSED', 'CLINICAL_WORKSPACE_INVALID_INPUT'].includes(code)) return false;
  return !(error instanceof ClinicalRequestError) || error.status === undefined || error.status >= 500 || error.status === 408;
};

export interface ClinicalNote {
  documents?: ClinicalDocument[];
  id: string;
  sessionId?: string | null;
  createdAt: string;
  updatedAt: string;
  content: string;
}

export interface ClinicalDocument {
  noteId?: string | null;
  exerciseId?: string | null;
  archivedAt?: string | null;
  id: string;
  sessionId?: string | null;
  category:
    | 'GENERAL'
    | 'CONSENT_EVIDENCE'
    | 'MEDICAL_REPORT'
    | 'SESSION_ATTACHMENT'
    | 'SESSION_EXERCISE'
    | 'NOTE_ATTACHMENT'
    | 'EXERCISE_ATTACHMENT';
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
  exercises?: ClinicalExercise[];
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
  consentRenewalRequiredAfter?: string | null;
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
  | 'SESSION_EXERCISE'
  | 'NOTE_ATTACHMENT'
  | 'EXERCISE_ATTACHMENT';

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
    throw new ClinicalRequestError(error, 'No se pudo obtener el estado del acceso clínico');
  }
};

export const acceptDataProcessingAgreement = async (version?: string): Promise<void> => {
  try {
    await api.post('/clinical/access/dpa/accept', version ? { version } : {});
  } catch (error: unknown) {
    throw new ClinicalRequestError(error, 'No se pudo aceptar el encargo de tratamiento');
  }
};

export const setupClinicalPin = async (pin: string): Promise<void> => {
  try {
    await api.post('/clinical/access/pin/setup', { pin });
  } catch (error: unknown) {
    throw new ClinicalPinError(getErrorMessage(error, 'No se pudo configurar el PIN clínico'), getErrorCode(error));
  }
};

export const rotateClinicalPin = async (currentPin: string, nextPin: string): Promise<void> => {
  try {
    await api.post('/clinical/access/pin/rotate', { currentPin, nextPin });
  } catch (error: unknown) {
    throw new ClinicalPinError(getErrorMessage(error, 'No se pudo actualizar el PIN clínico'), getErrorCode(error));
  }
};

export const unlockClinicalArea = async (pin: string): Promise<ClinicalUnlockResponse> => {
  try {
    const response = await api.post('/clinical/access/unlock', { pin });
    return response.data.data;
  } catch (error: unknown) {
    throw new ClinicalRequestError(error, 'No se pudo desbloquear el área clínica');
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
    throw new ClinicalRequestError(error, 'No se pudo bloquear el área clínica');
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
    throw new ClinicalRequestError(error, 'La sesión clínica ya no está disponible');
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
    throw new ClinicalRequestError(error, 'No se pudo cargar el historial clínico');
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
    throw new ClinicalRequestError(error, 'No se pudieron cargar más notas clínicas');
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
    throw new ClinicalRequestError(error, 'No se pudieron cargar más documentos clínicos');
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
    throw new ClinicalRequestError(error, 'No se pudieron cargar más eventos de consentimiento');
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
    throw new ClinicalRequestError(error, 'No se pudieron cargar más sesiones clínicas');
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
    throw new ClinicalRequestError(error, 'No se pudo abrir la carpeta clinica de la sesion');
  }
};

export const createClinicalNote = async (
  clientId: string,
  content: string,
  clinicalAccessToken: string,
  sessionId?: string,
  operationKey = createSecureRandomUuid(),
): Promise<ClinicalNote> => {
  try {
    const response = await api.post(
      `/clinical/records/${clientId}/notes`,
      { content, sessionId },
      { headers: { ...buildClinicalHeaders(clinicalAccessToken), 'Idempotency-Key': operationKey } }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new ClinicalRequestError(error, 'No se pudo guardar la nota clínica');
  }
};

export const updateClinicalNote = async (
  noteId: string,
  content: string,
  clinicalAccessToken: string,
  expectedUpdatedAt: string,
  operationKey = createSecureRandomUuid(),
): Promise<ClinicalNote> => {
  try {
    const response = await api.put(
      `/clinical/notes/${noteId}`,
      { content, expectedUpdatedAt },
      { headers: { ...buildClinicalHeaders(clinicalAccessToken), 'Idempotency-Key': operationKey } }
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new ClinicalRequestError(error, 'No se pudo actualizar la nota clínica');
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
    throw new ClinicalRequestError(error, 'No se pudo eliminar la nota clínica');
  }
};

const uploadOperationKeys = new WeakMap<UploadAsset, string>();
const clinicalUploadOperationKey = (file: UploadAsset) => {
  let key = uploadOperationKeys.get(file);
  if (!key) { key = createSecureRandomUuid(); uploadOperationKeys.set(file, key); }
  return key;
};

export const uploadClinicalDocument = async (
  clientId: string,
  file: UploadAsset,
  clinicalAccessToken: string,
  category: ClinicalDocumentCategory = 'GENERAL',
  sessionId?: string,
  parent?: { noteId?: string; exerciseId?: string },
  operationKey = clinicalUploadOperationKey(file),
): Promise<ClinicalDocument> => {
  try {
    const formData = await buildMultipartFormData(
      'document',
      file,
      {
        category,
        ...parent,
        ...(sessionId ? { sessionId } : {}),
      },
      'clinical-document'
    );
    const response = await api.post(`/clinical/records/${clientId}/documents`, formData, {
      headers: {
        ...buildClinicalHeaders(clinicalAccessToken),
        'Idempotency-Key': operationKey,
      },
      timeout: 30000,
    });
    return parseClinicalResponse(clinicalDocumentSchema, response.data.data);
  } catch (error: unknown) {
    throw new ClinicalRequestError(error, 'No se pudo subir el documento clínico');
  }
};

export const openClinicalDocument = async (
  documentId: string,
  fileName: string,
  mimeType: string,
  clinicalAccessToken: string
): Promise<void> => {
  const operation = beginClinicalDownload(clinicalAccessToken);
  try {
    const response = await api.get<ArrayBuffer>(`/clinical/documents/${documentId}/download`, {
      headers: buildClinicalHeaders(clinicalAccessToken),
      responseType: 'arraybuffer',
      signal: operation.signal,
      timeout: 30000,
    });

    if (!operation.isActive()) return;
    const contentType =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : mimeType || 'application/octet-stream';

    if (Platform.OS === 'web') {
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    if (!await sharing.isAvailableAsync()) throw new Error('No se pueden abrir archivos en este dispositivo.');
    if (!operation.isActive()) return;
    const safeName = fileName.replace(/[\\/]/g, '-');
    const localFile = new File(Paths.cache, `clinical-${createSecureRandomUuid()}-${safeName}`);
    try {
      localFile.create();
      localFile.write(new Uint8Array(response.data));
      await sharing.shareAsync(localFile.uri, { mimeType: contentType, dialogTitle: fileName });
    } finally {
      if (localFile.exists) localFile.delete();
    }
  } catch (error: unknown) {
    if (operation.isActive()) throw new ClinicalRequestError(error, 'No se pudo abrir el documento clínico');
  } finally {
    operation.release();
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
    throw new ClinicalRequestError(error, 'No se pudo enviar la autorización por email');
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
    throw new ClinicalRequestError(error, 'No se pudo abrir la solicitud de consentimiento');
  }
};

export const acceptDigitalConsent = async (
  requestId: string,
  token: string
): Promise<ClinicalConsentRequestResolution> => {
  try {
    const response = await api.post(`/clinical/consent/requests/${requestId}/accept`, { token, documents: legalProofs(['CLINICAL_PATIENT_CONSENT']) });
    return response.data.data;
  } catch (error: unknown) {
    throw new ClinicalRequestError(error, 'No se pudo registrar el consentimiento');
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
    throw new ClinicalRequestError(error, 'No se pudo retirar el consentimiento');
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
    throw new ClinicalRequestError(error, 'No se pudo registrar el consentimiento en poder del profesional');
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
    throw new ClinicalRequestError(error, 'No se pudo cerrar el proceso asistencial');
  }
};

export interface ClinicalExercise {
  id: string; sessionId: string | null; title: string; instructions: string;
  createdAt: string; updatedAt: string; documents: ClinicalDocument[];
}
export type ClinicalTimelineFilter = 'ALL' | 'WITH_NOTES' | 'WITHOUT_NOTES' | 'WITH_FILES' | 'GENERAL_NOTES';
export type ClinicalTimelineItem =
  | { kind: 'SESSION'; id: string; date: string; folder: ClinicalSessionFolder }
  | { kind: 'NOTE'; id: string; date: string; note: ClinicalNote };
export interface ClinicalTimelinePage {
  items: ClinicalTimelineItem[];
  pageInfo: { limit: number; hasMore: boolean; nextCursor: string | null };
  counters: { completed: number; withoutNotes: number; activeFiles: number; withNotes: number; withFiles: number; generalNotes: number };
  nextSession: ClinicalSessionFolder | null;
}
const clinicalDocumentSchema: z.ZodType<ClinicalDocument> = z.object({
  id: z.string().min(1), sessionId: z.string().nullable().optional(),
  noteId: z.string().nullable().optional(), exerciseId: z.string().nullable().optional(), archivedAt: z.string().datetime().nullable().optional(),
  category: z.enum(['GENERAL', 'CONSENT_EVIDENCE', 'MEDICAL_REPORT', 'SESSION_ATTACHMENT', 'SESSION_EXERCISE', 'NOTE_ATTACHMENT', 'EXERCISE_ATTACHMENT']),
  fileName: z.string(), mimeType: z.string(), uploadedAt: z.string().datetime(), sizeBytes: z.number().int().nonnegative().nullable(),
});
const clinicalNoteSchema: z.ZodType<ClinicalNote> = z.object({
  id: z.string().min(1), sessionId: z.string().nullable().optional(), content: z.string(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), documents: z.array(clinicalDocumentSchema).optional(),
});
const clinicalExerciseSchema: z.ZodType<ClinicalExercise> = z.object({
  id: z.string().min(1), sessionId: z.string().nullable(), title: z.string(), instructions: z.string(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), documents: z.array(clinicalDocumentSchema),
});
const clinicalFolderSchema: z.ZodType<ClinicalSessionFolder> = z.object({
  session: z.object({
    id: z.string().min(1), date: z.string().datetime(), duration: z.number(), status: z.string(), type: z.string(),
    bookedPrice: z.number().nullable().optional(), bookedCurrency: z.string().nullable().optional(), bookedTariffId: z.string().nullable().optional(),
    bookedTariffName: z.string().nullable().optional(), bookedDuration: z.number().nullable().optional(),
    invoice: z.object({ id: z.string(), invoiceNumber: z.string(), status: z.string(), total: z.number() }).nullable(),
  }),
  notes: z.array(clinicalNoteSchema), documents: z.array(clinicalDocumentSchema), exercises: z.array(clinicalExerciseSchema).optional(),
});
const pageInfoSchema = z.object({ limit: z.number().int().positive(), total: z.number().int().nonnegative(), nextCursor: z.string().nullable(), hasMore: z.boolean() });
const timelineSchema: z.ZodType<ClinicalTimelinePage> = z.object({
  items: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('SESSION'), id: z.string(), date: z.string().datetime(), folder: clinicalFolderSchema }),
    z.object({ kind: z.literal('NOTE'), id: z.string(), date: z.string().datetime(), note: clinicalNoteSchema }),
  ])),
  pageInfo: pageInfoSchema.omit({ total: true }),
  counters: z.object({ completed: z.number().int().nonnegative(), withoutNotes: z.number().int().nonnegative(), activeFiles: z.number().int().nonnegative(),
    withNotes: z.number().int().nonnegative(), withFiles: z.number().int().nonnegative(), generalNotes: z.number().int().nonnegative() }),
  nextSession: clinicalFolderSchema.nullable(),
});
const parseClinicalResponse = <T>(schema: z.ZodType<T>, payload: unknown): T => {
  const result = schema.safeParse(payload);
  if (!result.success) throw new Error('La respuesta del expediente no tiene el formato esperado. Actualiza la vista o inténtalo de nuevo.');
  return result.data;
};

export const getClinicalTimeline = async (clientId: string, token: string, filter: ClinicalTimelineFilter = 'ALL', cursor?: string): Promise<ClinicalTimelinePage> => {
  try {
    const response = await api.get<{ data: unknown }>(`/clinical/records/${clientId}/timeline`, { headers: buildClinicalHeaders(token), params: { filter, cursor } });
    return parseClinicalResponse(timelineSchema, response.data.data);
  } catch (error) { throw new ClinicalRequestError(error, 'No se pudo cargar la actividad clínica.'); }
};
export const getClinicalExercises = async (clientId: string, token: string, cursor?: string): Promise<{ items: ClinicalExercise[]; pageInfo: ClinicalPageInfo }> => {
  try {
    const response = await api.get<{ data: unknown }>(`/clinical/records/${clientId}/exercises`, { headers: buildClinicalHeaders(token), params: { cursor } });
    return parseClinicalResponse(z.object({ items: z.array(clinicalExerciseSchema), pageInfo: pageInfoSchema }), response.data.data);
  } catch (error) { throw new ClinicalRequestError(error, 'No se pudieron cargar los ejercicios.'); }
};
export const saveClinicalExercise = async (clientId: string, token: string, input: { title: string; instructions: string; sessionId?: string | null; expectedUpdatedAt?: string }, exerciseId?: string, operationKey = createSecureRandomUuid()): Promise<ClinicalExercise> => {
  const url = `/clinical/records/${clientId}/exercises${exerciseId ? `/${exerciseId}` : ''}`;
  const config = { headers: { ...buildClinicalHeaders(token), 'Idempotency-Key': operationKey } };
  try {
    const response = exerciseId ? await api.put<{ data: unknown }>(url, input, config) : await api.post<{ data: unknown }>(url, input, config);
    return parseClinicalResponse(clinicalExerciseSchema, response.data.data);
  } catch (error) { throw new ClinicalRequestError(error, 'No se pudo guardar el ejercicio.'); }
};
export const updateClinicalDocument = async (documentId: string, token: string, input: { fileName?: string; archived?: boolean }): Promise<ClinicalDocument> => {
  try {
    const response = await api.patch<{ data: unknown }>(`/clinical/documents/${documentId}`, input, { headers: buildClinicalHeaders(token) });
    return parseClinicalResponse(clinicalDocumentSchema, response.data.data);
  } catch (error) { throw new ClinicalRequestError(error, 'No se pudo actualizar el archivo.'); }
};
export const searchClinicalDocuments = async (clientId: string, token: string, options: { category?: ClinicalDocumentCategory; archived?: boolean; search?: string; cursor?: string; scope?: 'general' | 'all' }): Promise<{ items: ClinicalDocument[]; pageInfo: ClinicalPageInfo }> => {
  try {
    const response = await api.get<{ data: unknown }>(`/clinical/records/${clientId}/documents`, { headers: buildClinicalHeaders(token), params: { ...options, excludeConsent: true, limit: 15 } });
    return parseClinicalResponse(z.object({ items: z.array(clinicalDocumentSchema), pageInfo: pageInfoSchema }), response.data.data);
  } catch (error) { throw new ClinicalRequestError(error, 'No se pudieron cargar los archivos.'); }
};

export interface ClinicalContentHistory {
  current: { updatedAt: string; title: string | null; content: string };
  items: Array<{ id: string; versionAt: string; replacedAt: string; title: string | null; content: string }>;
  nextCursor: string | null;
}
export const getClinicalContentHistory = async (clientId: string, token: string, kind: 'NOTE' | 'EXERCISE', resourceId: string, cursor?: string): Promise<ClinicalContentHistory> => {
  try {
    const response = await api.get<{ data: unknown }>(`/clinical/records/${clientId}/history/${kind}/${resourceId}`, { headers: buildClinicalHeaders(token), params: { cursor } });
    return parseClinicalResponse(z.object({
      current: z.object({ updatedAt: z.string().datetime(), title: z.string().nullable(), content: z.string() }),
      items: z.array(z.object({ id: z.string(), versionAt: z.string().datetime(), replacedAt: z.string().datetime(), title: z.string().nullable(), content: z.string() })),
      nextCursor: z.string().nullable(),
    }), response.data.data);
  } catch (error) { throw new ClinicalRequestError(error, 'No se pudo cargar el historial de cambios.'); }
};

export const getClinicalAuthorization = async (clientId: string, token: string) => {
  try {
    const response = await api.get(`/clinical/records/${clientId}/authorization`, { headers: buildClinicalHeaders(token) });
    return z.object({ consentStatus: z.enum(['PENDING', 'GRANTED', 'REVOKED']), closedAt: z.string().nullable() }).parse(response.data.data);
  } catch (error: unknown) { throw new ClinicalRequestError(error, 'No se pudo comprobar la autorización clínica.'); }
};
