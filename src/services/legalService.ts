import api from './api';
import { LEGAL_DOCUMENTS, type LegalDocumentContent, type LegalDocumentKey } from '../constants/legal';

export interface LegalDocumentStatus {
  key: LegalDocumentKey;
  version: string;
  contentHash?: string;
  title: string;
  publicPath: string;
}

export interface AcceptedLegalDocument {
  documentKey: LegalDocumentKey;
  version: string;
  acceptedAt: string;
  source: string;
}

export interface LegalAcceptanceStatus {
  notices?: LegalNotice[];
  documents: LegalDocumentStatus[];
  requiredDocumentKeys: LegalDocumentKey[];
  acceptedDocuments: AcceptedLegalDocument[];
  missingDocumentKeys: LegalDocumentKey[];
  requiresAcceptance: boolean;
}

export interface LegalNotice {
  id: string; documentKey: LegalDocumentKey; version: string; title: string; summary: string;
  kind: 'EDITORIAL' | 'PRIVACY_INFORMATION' | 'CONTRACT_NOTICE' | 'EXPLICIT';
  notifiedAt: string | null; appliesAt: string | null; requiresExplicitAcceptance: boolean;
}
export const dismissLegalNotice = async (id: string): Promise<void> => {
  await api.post(`/legal/notices/${encodeURIComponent(id)}/dismiss`);
};

export const getLegalStatus = async (): Promise<LegalAcceptanceStatus> => {
  const response = await api.get<{ success: boolean; data: LegalAcceptanceStatus }>('/legal/status');
  return response.data.data;
};

export const acceptLegalDocuments = async (
  documentKeys: LegalDocumentKey[],
  source = 'app',
  documents?: LegalDocumentStatus[]
): Promise<LegalAcceptanceStatus> => {
  const response = await api.post<{ success: boolean; data: LegalAcceptanceStatus }>('/legal/accept', {
    documentKeys,
    documents: documentKeys.map(key => { const doc = documents?.find(d => d.key === key) ?? LEGAL_DOCUMENTS[key]; return { documentKey: key, version: doc.version, contentHash: doc.contentHash }; }),
    source,
  });

  return response.data.data;
};

export const getLegalCatalog = async (userType?: 'CLIENT' | 'PROFESSIONAL' | 'CLINIC'): Promise<LegalDocumentContent[]> => (await api.get<LegalDocumentContent[]>('/legal/documents', { params: { userType } })).data;
export const getLegalDocument = async (key: LegalDocumentKey, version: string): Promise<LegalDocumentContent> => (await api.get<LegalDocumentContent>(`/legal/documents/${key}/${encodeURIComponent(version)}`)).data;
export const legalProofs = (keys: LegalDocumentKey[]) => keys.map(documentKey => ({ documentKey, version: LEGAL_DOCUMENTS[documentKey].version, contentHash: LEGAL_DOCUMENTS[documentKey].contentHash }));
