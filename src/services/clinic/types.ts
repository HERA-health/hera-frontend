export type ClinicStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type ClinicMembershipRole = 'OWNER' | 'ADMIN' | 'SPECIALIST';
export type ClinicMembershipStatus = 'ACTIVE' | 'INACTIVE';
export type ClinicSpecialistStatus = 'ACTIVE' | 'INACTIVE';
export type ClinicSpecialistStatusFilter = ClinicSpecialistStatus | 'ALL';
export type ClinicPatientStatus = 'ACTIVE' | 'ARCHIVED';
export type ClinicPatientStatusFilter = ClinicPatientStatus | 'ALL';
export type ClinicPatientAssignmentFilter = 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
export type ClinicPatientConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED';
export type ClinicPatientConsentMethod = 'DIGITAL_SIGNATURE' | 'CLINIC_ADMIN_ATTESTATION';
export type ClinicPatientConsentRequestStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export type ClinicSessionStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type ClinicSessionType = 'IN_PERSON' | 'PHONE_CALL' | 'VIDEO_CALL';
export type ClinicInvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
export type ClinicInvoiceKind = 'SIMPLIFIED' | 'FULL';
export type ClinicSettlementStatus = 'PENDING' | 'REVIEWED' | 'PAID';
export type ClinicPatientConsentEventType =
  | 'REQUESTED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DOWNLOADED'
  | 'GRANTED'
  | 'ACCEPTED';
export type ClinicPatientConsentActorType = 'CLINIC_ADMIN' | 'CLIENT' | 'SYSTEM';

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
  linkedProfessional: LinkedProfessional | null;
}

export interface LinkedProfessional {
  name: string;
  email: string;
  professionalTitle: string | null;
  specialization: string | null;
  verificationStatus: string;
  accountStatus: string;
}

export interface ClinicPatientAssignmentSummary {
  id: string;
  clinicSpecialistId: string;
  clinicSpecialistDisplayName: string;
  clinicSpecialistProfessionalTitle: string | null;
  clinicSpecialistStatus: ClinicSpecialistStatus;
  startedAt: string;
  reason: string | null;
}

export interface ClinicPatientSummary {
  id: string;
  status: ClinicPatientStatus;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  billingDataComplete: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  activeAssignment: ClinicPatientAssignmentSummary | null;
}

export interface ClinicPatientDetail extends ClinicPatientSummary {
  billingFullName: string | null;
  billingTaxId: string | null;
  billingAddress: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  billingCountry: string | null;
}

export type ClinicPatientAssignmentHistoryStatus = 'ACTIVE' | 'ENDED';

export interface ClinicPatientAssignmentHistoryActor {
  id: string;
  name: string;
}

export interface ClinicPatientAssignmentHistorySpecialist {
  id: string;
  displayName: string;
  professionalTitle: string | null;
  status: ClinicSpecialistStatus;
}

export interface ClinicPatientAssignmentHistoryItem {
  id: string;
  status: ClinicPatientAssignmentHistoryStatus;
  startedAt: string;
  endedAt: string | null;
  reason: string | null;
  endedReason: string | null;
  clinicSpecialist: ClinicPatientAssignmentHistorySpecialist;
  assignedBy: ClinicPatientAssignmentHistoryActor | null;
  endedBy: ClinicPatientAssignmentHistoryActor | null;
}

export interface ClinicPatientAssignmentHistoryFilters {
  page?: number;
  limit?: number;
}

export interface ClinicPatientAssignmentHistoryPage {
  items: ClinicPatientAssignmentHistoryItem[];
  pageInfo: ClinicPatientListPageInfo;
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

export interface ClinicPatientPayload {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  billingFullName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  billingPostalCode?: string | null;
  billingCity?: string | null;
  billingCountry?: string | null;
}

export type UpdateClinicPatientPayload = Partial<ClinicPatientPayload>;

export interface ClinicPatientListFilters {
  status?: ClinicPatientStatusFilter;
  search?: string;
  assignment?: ClinicPatientAssignmentFilter;
  clinicSpecialistId?: string;
  page?: number;
  limit?: number;
}

export interface ClinicPatientListPageInfo {
  page: number;
  limit: number;
  hasMore: boolean;
  nextPage: number | null;
}

export interface ClinicPatientListPage {
  items: ClinicPatientSummary[];
  pageInfo: ClinicPatientListPageInfo;
}

export interface ClinicSessionPatientSummary {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: ClinicPatientStatus;
}

export interface ClinicSessionSpecialistSummary {
  id: string;
  displayName: string;
  professionalTitle: string | null;
  status: ClinicSpecialistStatus;
  linkedProfessionalName: string | null;
}

export interface ClinicSessionSummary {
  id: string;
  date: string;
  duration: number;
  type: ClinicSessionType;
  status: ClinicSessionStatus;
  bookedPrice: number | null;
  bookedCurrency: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: ClinicSessionPatientSummary;
  specialist: ClinicSessionSpecialistSummary;
}

export interface ClinicSessionListFilters {
  startDate?: string;
  endDate?: string;
  clinicSpecialistId?: string;
  clinicPatientId?: string;
  status?: ClinicSessionStatus;
  page?: number;
  limit?: number;
}

export interface ClinicSessionListPage {
  items: ClinicSessionSummary[];
  pageInfo: ClinicPatientListPageInfo;
}

export interface CreateClinicSessionPayload {
  clinicPatientId: string;
  clinicSpecialistId: string;
  date: string;
  duration: number;
  type: ClinicSessionType;
}

export interface UpdateClinicSessionStatusPayload {
  status: Extract<ClinicSessionStatus, 'CANCELLED' | 'COMPLETED'>;
}

export interface ClinicBillingConfig {
  id: string;
  commercialName: string;
  legalName: string | null;
  email: string | null;
  taxId: string | null;
  fiscalAddress: string | null;
  fiscalPostalCode: string | null;
  fiscalCity: string | null;
  fiscalCountry: string | null;
  simplifiedInvoicePrefix: string | null;
  simplifiedInvoiceNextNumber: number;
  fullInvoicePrefix: string | null;
  fullInvoiceNextNumber: number;
  vatRate: number | null;
  applyVat: boolean;
  vatExemptReason: string | null;
  bankIban: string | null;
  paymentConditions: string | null;
  sendInvoiceCopyTo: string | null;
  invoiceLogoUrl: string | null;
  invoiceAccentColor: string | null;
}

export type UpdateClinicBillingConfigPayload = Partial<Omit<
  ClinicBillingConfig,
  'id' | 'commercialName' | 'email'
>>;

export interface ClinicBillingSummary {
  totalThisMonth: number;
  totalThisYear: number;
  invoiceCountThisMonth: number;
  pendingCount: number;
}

export interface ClinicRevenueShareSummaryFilters {
  year?: number;
  month?: number;
}

export interface ClinicRevenueSharePeriod {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  currency: 'EUR';
}

export interface ClinicRevenueShareTotals {
  paidInvoiceCount: number;
  shareBaseAmount: number;
  specialistShareAmount: number;
  clinicRetainedAmount: number;
  missingPercentageInvoiceCount: number;
  missingSpecialistInvoiceCount: number;
  pendingSnapshotInvoiceCount: number;
  pendingSnapshotBaseAmount: number;
}

export interface ClinicRevenueShareSpecialistSummary {
  clinicSpecialistId: string;
  displayName: string;
  professionalTitle: string | null;
  status: ClinicSpecialistStatus;
  paidInvoiceCount: number;
  shareBaseAmount: number;
  specialistShareAmount: number;
  clinicRetainedAmount: number;
  effectiveRevenueSharePercentage: number;
  missingPercentageInvoiceCount: number;
  pendingSnapshotInvoiceCount: number;
}

export interface ClinicRevenueShareSummary {
  period: ClinicRevenueSharePeriod;
  totals: ClinicRevenueShareTotals;
  specialists: ClinicRevenueShareSpecialistSummary[];
}

export interface ClinicSettlementPeriod {
  id: string;
  clinicId: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: ClinicSettlementStatus;
  currency: 'EUR';
  paidInvoiceCount: number;
  settledInvoiceCount: number;
  shareBaseAmount: number;
  specialistShareAmount: number;
  clinicRetainedAmount: number;
  missingPercentageInvoiceCount: number;
  missingSpecialistInvoiceCount: number;
  pendingSnapshotInvoiceCount: number;
  reviewedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicSettlementListFilters {
  year?: number;
  status?: ClinicSettlementStatus;
  page?: number;
  limit?: number;
}

export interface ClinicSettlementListPage {
  items: ClinicSettlementPeriod[];
  pageInfo: ClinicPatientListPageInfo & {
    total: number;
    totalPages: number;
  };
}

export interface ClinicSettlementPreviewFilters {
  year: number;
  month: number;
}

export interface ClinicSettlementPreview {
  period: ClinicRevenueSharePeriod & {
    isClosed: boolean;
  };
  existingSettlement: Pick<ClinicSettlementPeriod, 'id' | 'status'> | null;
  canGenerate: boolean;
  blockers: {
    periodOpen: boolean;
    noPaidInvoices: boolean;
    missingSpecialistInvoiceCount: number;
    pendingSnapshotInvoiceCount: number;
    alreadySettledInvoiceCount: number;
    finalizedSettlement: boolean;
  };
  totals: {
    paidInvoiceCount: number;
    settledInvoiceCount: number;
    shareBaseAmount: number;
    specialistShareAmount: number;
    clinicRetainedAmount: number;
    missingPercentageInvoiceCount: number;
    missingSpecialistInvoiceCount: number;
    pendingSnapshotInvoiceCount: number;
    alreadySettledInvoiceCount: number;
  };
  specialists: Array<{
    clinicSpecialistId: string;
    displayName: string;
    professionalTitle: string | null;
    status: ClinicSpecialistStatus;
    paidInvoiceCount: number;
    shareBaseAmount: number;
    specialistShareAmount: number;
    clinicRetainedAmount: number;
    effectiveRevenueSharePercentage: number;
    missingPercentageInvoiceCount: number;
  }>;
}

export interface ClinicSettlementInvoice {
  id: string;
  clinicInvoiceId: string;
  invoiceNumber: string;
  paidAt: string;
  patientDisplayName: string;
  revenueSharePercentageSnapshot: number | null;
  shareBaseAmount: number;
  specialistShareAmount: number;
  clinicRetainedAmount: number;
  missingPercentage: boolean;
}

export type ClinicSettlementLine = ClinicSettlementPreview['specialists'][number] & {
  id: string;
  invoices: ClinicSettlementInvoice[];
};

export interface ClinicSettlementDetail extends ClinicSettlementPeriod {
  lines: ClinicSettlementLine[];
}

export interface CreateClinicSettlementPayload {
  year: number;
  month: number;
}

export interface UpdateClinicSettlementStatusPayload {
  status: Extract<ClinicSettlementStatus, 'REVIEWED' | 'PAID'>;
}

export interface ClinicInvoiceSummary {
  id: string;
  clinicId: string;
  clinicPatientId: string;
  clinicSpecialistId: string | null;
  sessionId: string | null;
  invoiceNumber: string;
  invoiceKind: ClinicInvoiceKind;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  ivaIncluded: boolean;
  baseImponible: number | null;
  concept: string;
  sessionDate: string | null;
  durationMinutes: number | null;
  revenueSharePercentageSnapshot: number | null;
  revenueShareBaseAmount: number | null;
  revenueShareAmount: number | null;
  revenueShareCalculatedAt: string | null;
  status: ClinicInvoiceStatus;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: ClinicSessionPatientSummary;
  specialist: Pick<ClinicSessionSpecialistSummary, 'id' | 'displayName' | 'professionalTitle' | 'status'> | null;
  session: {
    id: string;
    date: string;
    status: ClinicSessionStatus;
    duration: number;
    type: ClinicSessionType;
  } | null;
}

export interface ClinicInvoiceDetail extends ClinicInvoiceSummary {
  internalNotes: string | null;
}

export interface ClinicInvoiceListFilters {
  status?: ClinicInvoiceStatus;
  invoiceKind?: ClinicInvoiceKind;
  month?: number;
  year?: number;
  clinicPatientId?: string;
  page?: number;
  limit?: number;
}

export interface ClinicInvoiceListPage {
  items: ClinicInvoiceSummary[];
  pageInfo: ClinicPatientListPageInfo & {
    total: number;
    totalPages: number;
  };
}

export interface CreateClinicInvoicePayload {
  clinicPatientId: string;
  clinicSpecialistId?: string | null;
  invoiceKind?: ClinicInvoiceKind;
  concept: string;
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  sessionDate?: string | null;
  durationMinutes?: number | null;
  ivaIncluded?: boolean;
  baseImponible?: number;
  internalNotes?: string | null;
}

export type UpdateClinicInvoicePayload = Partial<Omit<
  CreateClinicInvoicePayload,
  'clinicPatientId' | 'clinicSpecialistId'
>>;

export interface AssignClinicPatientPayload {
  clinicSpecialistId: string;
  reason?: string | null;
}

export interface CloseClinicPatientAssignmentPayload {
  endedReason?: string | null;
}

export interface ClinicPatientConsentStatusSummary {
  status: ClinicPatientConsentStatus;
  method: ClinicPatientConsentMethod | null;
  requestedAt: string | null;
  grantedAt: string | null;
  version: string | null;
}

export interface ClinicPatientConsentSummary extends ClinicPatientConsentStatusSummary {
  clinicPatientId: string;
  patientDisplayName: string;
  patientEmail: string | null;
  patientStatus: ClinicPatientStatus;
}

export interface ClinicPatientConsentDocument {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  sizeBytes: number | null;
}

export interface ClinicPatientConsentEvent {
  id: string;
  eventType: ClinicPatientConsentEventType;
  status: ClinicPatientConsentStatus;
  method: ClinicPatientConsentMethod | null;
  version: string | null;
  actorType: ClinicPatientConsentActorType;
  createdAt: string;
  documentId: string | null;
  requestId: string | null;
}

export interface ClinicPatientConsentRequest {
  id: string;
  status: ClinicPatientConsentRequestStatus;
  expiresAt: string;
  createdAt: string;
  version: string;
}

export interface ClinicPatientConsentDetail extends ClinicPatientConsentSummary {
  documents: ClinicPatientConsentDocument[];
  events: ClinicPatientConsentEvent[];
  activeRequest: ClinicPatientConsentRequest | null;
}

export interface ClinicPatientConsentRequestResult {
  requestId: string;
  status: ClinicPatientConsentRequestStatus;
  expiresAt: string;
  createdAt: string;
}

export interface ClinicPatientConsentResolution {
  id: string;
  version: string;
  status: ClinicPatientConsentRequestStatus;
  expiresAt: string;
  createdAt: string;
  consentStatus: ClinicPatientConsentStatus;
  requiresLogin: boolean;
  alreadyUsed: boolean;
  clinic: {
    id: string;
    name: string;
  };
  patient: {
    displayName: string;
  };
}

export interface LinkClinicSpecialistPayload {
  email: string;
}

export interface ProfessionalClinicContext {
  clinic: ClinicSummary;
  responsible: {
    displayName: string;
    professionalTitle: string | null;
  };
}

export interface ProfessionalClinicPatientAssignment {
  id: string;
  startedAt: string;
  reason: string | null;
}

export type ProfessionalClinicPatientConsent = ClinicPatientConsentStatusSummary;

export interface ProfessionalClinicPatientSummary {
  clinicPatientId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: ClinicPatientStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  clinic: {
    id: string;
    name: string;
  };
  responsible: {
    displayName: string;
    professionalTitle: string | null;
  };
  assignment: ProfessionalClinicPatientAssignment;
  consent: ProfessionalClinicPatientConsent;
}

export type ProfessionalClinicPatientDetail = ProfessionalClinicPatientSummary;

export interface ProfessionalClinicPatientListFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProfessionalClinicPatientListPage {
  items: ProfessionalClinicPatientSummary[];
  pageInfo: ClinicPatientListPageInfo;
}
