// Content generated from the backend's immutable legal catalog.
import generated from '../generated/legalDocuments.json';
export type LegalDocumentKey =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'PROFESSIONAL_DATA_PROCESSING_TERMS'
  | 'CLINICAL_MODULE_TERMS'
  | 'CLINICAL_PATIENT_CONSENT';

export const LEGAL_DOCUMENT_VERSION = '2026-04-26';

export const LEGAL_ENTITY = {
  // Identidad provisional indicada por el titular; completar antes de publicación definitiva.
  responsibleName: 'Sara Herrer Fernández',
  tradeName: 'HERA',
  taxId: 'Pendiente de completar antes de publicación definitiva',
  address: 'Pendiente de completar antes de publicación definitiva',
  privacyEmail: 'herahealthtech@gmail.com',
  supportEmail: 'herahealthtech@gmail.com',
  securityEmail: 'herahealthtech@gmail.com',
  dpo: 'Pendiente de designación o confirmación',
  country: 'España',
} as const;

export interface LegalDocumentContent {
  key: LegalDocumentKey;
  version: string;
  contentHash: string;
  changeSummary: string;
  effectiveAt: string;
  status: string;
  title: string;
  slug: string;
  routePath: string;
  summary: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
}

export const LEGAL_DOCUMENT_SLUGS: Record<LegalDocumentKey, string> = {
  TERMS_OF_SERVICE: 'terminos',
  PRIVACY_POLICY: 'privacidad',
  PROFESSIONAL_DATA_PROCESSING_TERMS: 'condiciones-profesionales',
  CLINICAL_MODULE_TERMS: 'modulo-clinico',
  CLINICAL_PATIENT_CONSENT: 'consentimiento-clinico',
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocumentContent> = {
  TERMS_OF_SERVICE: { ...generated.TERMS_OF_SERVICE, key: 'TERMS_OF_SERVICE' },
  PRIVACY_POLICY: { ...generated.PRIVACY_POLICY, key: 'PRIVACY_POLICY' },
  PROFESSIONAL_DATA_PROCESSING_TERMS: { ...generated.PROFESSIONAL_DATA_PROCESSING_TERMS, key: 'PROFESSIONAL_DATA_PROCESSING_TERMS' },
  CLINICAL_MODULE_TERMS: { ...generated.CLINICAL_MODULE_TERMS, key: 'CLINICAL_MODULE_TERMS' },
  CLINICAL_PATIENT_CONSENT: { ...generated.CLINICAL_PATIENT_CONSENT, key: 'CLINICAL_PATIENT_CONSENT' },
};

export const getRequiredRegistrationDocumentKeys = (
  userType: 'CLIENT' | 'PROFESSIONAL' | 'CLINIC'
): LegalDocumentKey[] => {
  const base: LegalDocumentKey[] = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'];
  return userType === 'PROFESSIONAL'
    ? [...base, 'PROFESSIONAL_DATA_PROCESSING_TERMS']
    : base;
};

export const getLegalDocumentKeyFromSlug = (slug: string): LegalDocumentKey => {
  const matchingEntry = Object.entries(LEGAL_DOCUMENT_SLUGS).find(([, value]) => value === slug);
  return (matchingEntry?.[0] as LegalDocumentKey | undefined) ?? 'PRIVACY_POLICY';
};

export const getLegalDocumentUrl = (key: LegalDocumentKey): string =>
  LEGAL_DOCUMENTS[key].routePath;

export const getLegalDocumentByPath = (path?: string): LegalDocumentContent =>
  Object.values(LEGAL_DOCUMENTS).find((document) => document.routePath === path)
  || LEGAL_DOCUMENTS.PRIVACY_POLICY;
