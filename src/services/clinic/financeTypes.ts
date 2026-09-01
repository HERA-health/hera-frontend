import type { ClinicInvoiceKind, ClinicMembershipRole } from "./types";

export type ClinicFinancialWorkflowMode = "OFF" | "SHADOW" | "ACTIVE";
export type ClinicFinancialActivationRequestStatus =
  | "PENDING_REVIEW"
  | "IN_REVIEW"
  | "CHANGES_REQUIRED"
  | "ACTIVATED"
  | "CANCELLED";

export interface ClinicFinancialActivationReadiness {
  clinicId: string;
  mode: ClinicFinancialWorkflowMode;
  request: {
    id: string;
    status: ClinicFinancialActivationRequestStatus;
    version: number;
    resolutionReason: string | null;
  } | null;
  capabilities: {
    canRequestReview: boolean;
    canCancelRequest: boolean;
  };
}
export type ClinicAgreementScope =
  "CLINIC" | "SPECIALIST" | "SPECIALIST_SERVICE" | "SPECIALIST_PATIENT";
export type ClinicAgreementRelationship =
  "SELF_EMPLOYED_COLLABORATOR" | "EMPLOYEE";
export type ClinicAgreementShareMethod = "PERCENTAGE" | "FIXED_AMOUNT";
export type ClinicAgreementSettlementCondition =
  "SESSION_COMPLETED" | "PATIENT_COLLECTION";
export type ClinicAgreementStatus =
  "DRAFT" | "PENDING_ACCEPTANCE" | "ACTIVE" | "SUPERSEDED" | "ENDED";
export type ClinicPaymentMethod =
  "CASH" | "EXTERNAL_CARD" | "BANK_TRANSFER" | "BIZUM" | "VOUCHER" | "OTHER";

export interface MoneyDto {
  amountCents: number;
  currency: "EUR";
}

export interface ClinicFinancialLedgerLine {
  id: string;
  eventType: string;
  sessionId: string | null;
  amountCents: number;
  currency: "EUR";
  effectiveAt: string;
  accountingMonth?: string;
  referenceEventId: string | null;
  payload: Record<string, unknown>;
}

export interface ClinicFinancialLedgerPage {
  items: ClinicFinancialLedgerLine[];
  nextCursor: string | null;
}

export interface ClinicFinanceOverview {
  workflow: {
    financialWorkflowMode: ClinicFinancialWorkflowMode;
    financialWorkflowActivatedAt: string | null;
  };
  totals: {
    generated: MoneyDto;
    liquidable: MoneyDto;
    blockedSnapshots: number;
  };
  ledger: ClinicFinancialLedgerLine[];
  patientInvoices: Array<{
    id: string;
    sessionId: string | null;
    rootClinicInvoiceId: string | null;
    rectifiesClinicInvoiceId: string | null;
    fiscalInvoiceNumber: string | null;
    fiscalStatus: "DRAFT" | "ISSUED" | "RECTIFIED" | "DISCARDED" | null;
    deliveryStatus: "NOT_SENT" | "PENDING" | "SENT" | "FAILED" | null;
    issuedAt: string | null;
    totalCents: number | null;
    createdAt: string;
    patientDisplayName: string;
    obligation: {
      obligationTotalCents: number;
      collectedCents: number;
      collectableCents: number;
      refundableCents: number;
      canCollect: boolean;
      canRefund: boolean;
      needsRefund: boolean;
      activeInvoiceId: string | null;
    };
    chainDocuments: Array<{
      id: string;
      fiscalInvoiceNumber: string | null;
      fiscalStatus: "DRAFT" | "ISSUED" | "RECTIFIED" | "DISCARDED" | null;
      deliveryStatus: "NOT_SENT" | "PENDING" | "SENT" | "FAILED" | null;
      totalCents: number | null;
      issuedAt: string | null;
    }>;
    movements: Array<{
      id: string;
      clinicInvoiceId: string;
      rootClinicInvoiceId: string;
      movementType: "COLLECTION" | "REFUND";
      method: ClinicPaymentMethod;
      amountCents: number;
      effectiveAt: string;
      externalReference: string | null;
      originalMovementId: string | null;
    }>;
  }>;
  invoiceableSessions: Array<{
    id: string;
    date: string;
    priceCents: number;
    serviceName: string | null;
    patientDisplayName: string;
  }>;
  periods: Array<{
    id: string;
    year: number;
    month: number;
    status: "OPEN" | "REVIEW_REQUIRED" | "CLOSED";
    generatedCents: number;
    liquidableCents: number;
    blockedLineCount: number;
    closedAt: string | null;
    statements: Array<{
      id: string;
      clinicSpecialistId: string;
      specialistNameSnapshot: string;
      relationship: ClinicAgreementRelationship;
      status: string;
      closedBaseCents: number;
      carryForwardCents?: number;
      carryForwardAppliedCents?: number;
      priorCreditAppliedCents?: number;
    }>;
  }>;
  professionalInvoices: Array<{
    id: string;
    professionalStatementId: string;
    status: "DRAFT" | "ISSUED" | "RECTIFIED";
    reviewStatus: "PENDING" | "ACCEPTED" | "CORRECTION_REQUESTED";
    invoiceNumber: string | null;
    issueDate: string | null;
    baseCents: number;
    vatAmountCents: number;
    irpfAmountCents: number;
    grossTotalCents: number;
    netTransferCents: number;
    version: number;
    documentVersion: number;
    documentKind: "STANDARD" | "RECTIFICATION" | "REPLACEMENT";
    rectifiesInvoiceId: string | null;
    replacesInvoiceId: string | null;
    payments: Array<{
      transferredAmountCents: number;
      withheldAmountCents: number;
      effectiveAt: string;
    }>;
  }>;
  documents: Array<{
    id: string;
    kind:
      | "PATIENT_INVOICE_PDF"
      | "PATIENT_INVOICE_STRUCTURED"
      | "PROFESSIONAL_INVOICE_PDF"
      | "PROFESSIONAL_INVOICE_STRUCTURED"
      | "PROFESSIONAL_STATEMENT_PDF"
      | "EMPLOYEE_VARIABLE_PDF"
      | "EMPLOYEE_VARIABLE_CSV";
    resourceType: string;
    resourceId: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export interface ClinicAgreementVersion {
  id: string;
  version: number;
  status: ClinicAgreementStatus;
  relationship: ClinicAgreementRelationship;
  shareMethod: ClinicAgreementShareMethod;
  professionalShareBps: number | null;
  professionalFixedCents: number | null;
  settlementCondition: ClinicAgreementSettlementCondition;
  currency: "EUR";
  validFrom: string;
  validUntil: string | null;
  replacementReason: string | null;
  activatedAt: string | null;
  acceptances: Array<{ clinicSpecialistId: string; acceptedAt: string }>;
}

export interface ClinicEconomicAgreement {
  id: string;
  scope: ClinicAgreementScope;
  clinicSpecialistId: string | null;
  clinicServiceId: string | null;
  clinicPatientId: string | null;
  createdAt: string;
  versions: ClinicAgreementVersion[];
}

export interface CreateClinicAgreementPayload {
  scope: ClinicAgreementScope;
  clinicSpecialistId?: string | null;
  clinicServiceId?: string | null;
  clinicPatientId?: string | null;
  relationship: ClinicAgreementRelationship;
  shareMethod: ClinicAgreementShareMethod;
  professionalShareBps?: number | null;
  professionalFixedCents?: number | null;
  settlementCondition: ClinicAgreementSettlementCondition;
  validFrom: string;
  validUntil?: string | null;
  replacementReason?: string | null;
}

export interface FinancialPeriodPreview {
  year: number;
  month: number;
  timezone: "Europe/Madrid";
  startsAt: string;
  endsAt: string;
  lineCount: number;
  liquidableCents: number;
  blockedLineCount: number;
  isPastMonth: boolean;
  canClose: boolean;
  previewFingerprint: string;
  blockedSessions: Array<{
    sessionId: string;
    sessionDate: string;
    serviceName: string | null;
    reasonCode: string;
    latestRevision: number;
  }>;
}

export interface SessionEconomicRevisionPayload {
  expectedRevision: number;
  priceCents?: number;
  clinicServiceId?: string | null;
  agreementVersionId?: string | null;
  reason: string;
  allowCompletedResolution: boolean;
}

export interface SessionEconomicRevisionPreview {
  priceCents: number;
  nextRevision: number;
  serviceName: string | null;
  resolution: {
    status: "RESOLVED" | "BLOCKED_CONFIGURATION" | "NOT_APPLICABLE";
    professionalAmountCents?: number;
    clinicAmountCents?: number;
    explanation?: Record<string, unknown>;
  };
}

export interface WorkflowPatientInvoiceDraftPayload {
  invoiceKind: ClinicInvoiceKind;
  vatRateBasisPoints: number;
  vatExemptReason?: string | null;
}

export interface PatientPaymentMovementPayload {
  amountCents: number;
  method: ClinicPaymentMethod;
  effectiveAt: string;
  externalReference?: string | null;
  administrativeNote?: string | null;
  originalMovementId?: string | null;
}

export interface ProfessionalClinicFinance {
  clinic: {
    commercialName: string;
    financialWorkflowMode: ClinicFinancialWorkflowMode;
    financialWorkflowActivatedAt: string | null;
  };
  selectedMonth: { year: number; month: number };
  liveSummary: {
    generatedCents: number;
    liquidableCents: number;
    closedCents: number;
    invoicedCents: number;
    pendingTransferCents: number;
    paidCents: number;
  };
  sessions: Array<{
    id: string;
    date: string;
    status: string;
    serviceName: string | null;
    professionalAmountCents: number;
    liquidableAvailableCents: number;
    snapshot: {
      id: string;
      revision: number;
      resolutionStatus: string;
      blockedReasonCode: string | null;
      relationship: ClinicAgreementRelationship | null;
      shareMethod: ClinicAgreementShareMethod | null;
      settlementCondition: ClinicAgreementSettlementCondition | null;
      professionalShareBps: number | null;
      professionalFixedCents: number | null;
      priceCents: number;
    } | null;
  }>;
  sessionPageInfo: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  agreements: Array<
    ClinicAgreementVersion & {
      agreement: {
        scope: ClinicAgreementScope;
        clinicServiceId: string | null;
        clinicPatientId: string | null;
      };
    }
  >;
  statements: ProfessionalStatement[];
  invoices: ProfessionalInvoice[];
  documents: Array<{
    id: string;
    kind:
      | "PATIENT_INVOICE_PDF"
      | "PATIENT_INVOICE_STRUCTURED"
      | "PROFESSIONAL_INVOICE_PDF"
      | "PROFESSIONAL_INVOICE_STRUCTURED"
      | "PROFESSIONAL_STATEMENT_PDF"
      | "EMPLOYEE_VARIABLE_PDF"
      | "EMPLOYEE_VARIABLE_CSV";
    resourceType: string;
    resourceId: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    createdAt: string;
  }>;
}

export interface ProfessionalInvoice {
  id: string;
  professionalStatementId: string;
  status: "DRAFT" | "ISSUED" | "RECTIFIED";
  reviewStatus: "PENDING" | "ACCEPTED" | "CORRECTION_REQUESTED";
  version: number;
  documentVersion: number;
  documentKind: "STANDARD" | "RECTIFICATION" | "REPLACEMENT";
  series: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  baseCents: number;
  vatRateBasisPoints: number;
  vatAmountCents: number;
  irpfRateBasisPoints: number;
  irpfAmountCents: number;
  grossTotalCents: number;
  netTransferCents: number;
  correctionReason: string | null;
  reviewCorrectionReason: string | null;
  rectifiesInvoiceId: string | null;
  replacesInvoiceId: string | null;
  payments: Array<{
    transferredAmountCents: number;
    withheldAmountCents: number;
    effectiveAt: string;
    method: ClinicPaymentMethod;
  }>;
}

export interface ProfessionalStatement {
  id: string;
  latestProfessionalInvoiceId: string | null;
  activeProfessionalInvoiceId: string | null;
  status: string;
  relationship: ClinicAgreementRelationship;
  generatedCents: number;
  liquidableCents: number;
  closedBaseCents: number;
  carryForwardCents: number;
  carryForwardAppliedCents: number;
  priorCreditAppliedCents: number;
  currency: "EUR";
  acknowledgedAt: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  period: { year: number; month: number; closedAt: string | null };
  lines: Array<{
    id: string;
    sessionId: string | null;
    serviceNameSnapshot: string | null;
    sessionDate: string | null;
    professionalAmountCents: number;
    liquidableAt: string;
    explanation: Record<string, unknown>;
  }>;
}

export interface ClinicFinanceAccess {
  clinicId: string;
  role: ClinicMembershipRole;
}
