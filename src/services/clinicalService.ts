import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
  activeConsentRequest: ClinicalConsentRequestResolution | null;
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

export interface ClinicalConsentRequestResult {
  requestId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
}

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

export const acceptDataProcessingAgreement = async (version: string = 'v1'): Promise<void> => {
  try {
    await api.post('/clinical/access/dpa/accept', { version });
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
    throw new Error(getErrorMessage(error, 'No se pudo solicitar el consentimiento digital'));
  }
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
