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
  documents: LegalDocumentStatus[];
  requiredDocumentKeys: LegalDocumentKey[];
  acceptedDocuments: AcceptedLegalDocument[];
  missingDocumentKeys: LegalDocumentKey[];
  requiresAcceptance: boolean;
}

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

export const getLegalCatalog = async (): Promise<LegalDocumentContent[]> => (await api.get<LegalDocumentContent[]>('/legal/documents')).data;
export const getLegalDocument = async (key: LegalDocumentKey, version: string): Promise<LegalDocumentContent> => (await api.get<LegalDocumentContent>(`/legal/documents/${key}/${encodeURIComponent(version)}`)).data;
export const legalProofs = (keys: LegalDocumentKey[]) => keys.map(documentKey => ({ documentKey, version: LEGAL_DOCUMENTS[documentKey].version, contentHash: LEGAL_DOCUMENTS[documentKey].contentHash }));
