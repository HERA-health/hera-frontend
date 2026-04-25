import api from './api';
import type { LegalDocumentKey } from '../constants/legal';

export interface LegalDocumentStatus {
  key: LegalDocumentKey;
  version: string;
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
  source = 'app'
): Promise<LegalAcceptanceStatus> => {
  const response = await api.post<{ success: boolean; data: LegalAcceptanceStatus }>('/legal/accept', {
    documentKeys,
    source,
  });

  return response.data.data;
};
