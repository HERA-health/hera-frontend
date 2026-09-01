import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import api from "../api";
import { getErrorMessage } from "../../constants/errors";
import type {
  ClinicEconomicAgreement,
  ClinicFinancialActivationReadiness,
  ClinicFinanceOverview,
  ClinicFinancialLedgerPage,
  CreateClinicAgreementPayload,
  FinancialPeriodPreview,
  PatientPaymentMovementPayload,
  ProfessionalClinicFinance,
  ProfessionalInvoice,
  SessionEconomicRevisionPayload,
  SessionEconomicRevisionPreview,
  WorkflowPatientInvoiceDraftPayload,
} from "./financeTypes";

const request = async <T>(
  operation: () => Promise<{ data: { data: T } }>,
  fallback: string,
): Promise<T> => {
  try {
    return (await operation()).data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, fallback));
  }
};

export const createFinancialCommandKey = (): string => Crypto.randomUUID();

const commandHeaders = (idempotencyKey?: string) => ({
  "Idempotency-Key": idempotencyKey ?? createFinancialCommandKey(),
});

export const getClinicFinanceOverview = (
  clinicId: string,
): Promise<ClinicFinanceOverview> =>
  request(
    () => api.get(`/clinics/${clinicId}/finance`),
    "No se pudo cargar el circuito económico.",
  );

export const getClinicFinancialActivationReadiness = (
  clinicId: string,
): Promise<ClinicFinancialActivationReadiness> =>
  request(
    () => api.get(`/clinics/${clinicId}/finance/activation-readiness`),
    "No se pudo consultar el estado de la activación.",
  );

export const requestClinicFinancialActivation = (
  clinicId: string,
  idempotencyKey: string,
): Promise<unknown> =>
  request(
    () => api.post(
      `/clinics/${clinicId}/finance/activation-requests`,
      { expectedMode: "OFF" },
      { headers: commandHeaders(idempotencyKey) },
    ),
    "No se pudo enviar la solicitud de revisión.",
  );

export const cancelClinicFinancialActivationRequest = (
  clinicId: string,
  requestId: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<unknown> =>
  request(
    () => api.post(
      `/clinics/${clinicId}/finance/activation-requests/${requestId}/cancel`,
      { expectedStatus: "PENDING_REVIEW", expectedVersion },
      { headers: commandHeaders(idempotencyKey) },
    ),
    "No se pudo cancelar la solicitud.",
  );

export const listClinicFinancialLedger = (
  clinicId: string,
  input: {
    year?: number;
    month?: number;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<ClinicFinancialLedgerPage> =>
  request(
    () => api.get(`/clinics/${clinicId}/finance/ledger`, { params: input }),
    "No se pudo cargar el ledger financiero.",
  );

export const listClinicFinanceAgreements = (
  clinicId: string,
): Promise<ClinicEconomicAgreement[]> =>
  request(
    () => api.get(`/clinics/${clinicId}/finance/agreements`),
    "No se pudieron cargar los acuerdos.",
  );

export const createClinicFinanceAgreement = (
  clinicId: string,
  payload: CreateClinicAgreementPayload,
  idempotencyKey?: string,
): Promise<ClinicEconomicAgreement> =>
  request(
    () => api.post(`/clinics/${clinicId}/finance/agreements`, payload, { headers: commandHeaders(idempotencyKey) }),
    "No se pudo preparar el acuerdo.",
  );

export const activateClinicFinanceAgreement = (
  clinicId: string,
  agreementVersionId: string,
  expectedVersion: number,
  reason: string,
  idempotencyKey?: string,
): Promise<ClinicEconomicAgreement> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/finance/agreements/${agreementVersionId}/activate`,
        { expectedVersion, reason },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo activar el acuerdo.",
  );

export const previewClinicFinancialPeriod = (
  clinicId: string,
  year: number,
  month: number,
): Promise<FinancialPeriodPreview> =>
  request(
    () =>
      api.get(`/clinics/${clinicId}/finance/periods/preview`, {
        params: { year, month },
      }),
    "No se pudo preparar el cierre.",
  );

export const previewClinicSessionEconomicRevision = (
  clinicId: string,
  sessionId: string,
  payload: SessionEconomicRevisionPayload,
): Promise<SessionEconomicRevisionPreview> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/finance/sessions/${sessionId}/economic-preview`,
        payload,
      ),
    "No se pudo previsualizar la revisión económica.",
  );

export const reviseClinicSessionEconomics = (
  clinicId: string,
  sessionId: string,
  payload: SessionEconomicRevisionPayload,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/finance/sessions/${sessionId}/economic-revisions`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo guardar la revisión económica.",
  );

export const closeClinicFinancialPeriod = (
  clinicId: string,
  year: number,
  month: number,
  previewFingerprint: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/finance/periods/close`,
        { year, month, previewFingerprint },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo cerrar el periodo.",
  );

export const createWorkflowPatientInvoice = (
  clinicId: string,
  sessionId: string,
  payload: WorkflowPatientInvoiceDraftPayload,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/sessions/${sessionId}/workflow-invoice`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo preparar la factura al paciente.",
  );

export const issueWorkflowPatientInvoice = (
  clinicId: string,
  invoiceId: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/invoices/${invoiceId}/issue`,
        {},
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo emitir la factura al paciente.",
  );

export const discardWorkflowPatientInvoiceDraft = (
  clinicId: string,
  invoiceId: string,
  reason: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/invoices/${invoiceId}/discard-draft`,
        { expectedStatus: "DRAFT", reason },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo descartar el borrador.",
  );

export const deliverWorkflowPatientInvoice = (
  clinicId: string,
  invoiceId: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/invoices/${invoiceId}/deliver`,
        {},
        { headers: commandHeaders(idempotencyKey) },
      ),
    "La factura está emitida, pero no se pudo entregar.",
  );

export const createWorkflowPatientInvoiceRectification = (
  clinicId: string,
  invoiceId: string,
  reason: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/invoices/${invoiceId}/rectifications`,
        { reason },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo preparar la factura rectificativa.",
  );

export const recordPatientCollection = (
  clinicId: string,
  invoiceId: string,
  payload: PatientPaymentMovementPayload,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/invoices/${invoiceId}/payments`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo registrar el cobro recibido fuera de HERA.",
  );

export const recordPatientRefund = (
  clinicId: string,
  invoiceId: string,
  payload: PatientPaymentMovementPayload,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/billing/invoices/${invoiceId}/refunds`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo registrar la devolución.",
  );

export const getProfessionalClinicFinance = (
  clinicId: string,
  query?: { year?: number; month?: number; page?: number; limit?: number },
): Promise<ProfessionalClinicFinance> =>
  request(
    () => api.get(`/clinics/${clinicId}/specialist/finance`, { params: query }),
    "No se pudo cargar tu actividad económica con la clínica.",
  );

export const acceptProfessionalClinicAgreement = (
  clinicId: string,
  agreementVersionId: string,
  expectedVersion: number,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/specialist/finance/agreements/${agreementVersionId}/accept`,
        { expectedVersion },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo aceptar el acuerdo.",
  );

export const acknowledgeProfessionalStatement = (
  clinicId: string,
  statementId: string,
  expectedStatus: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/specialist/finance/statements/${statementId}/acknowledge`,
        { expectedStatus },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo confirmar el cierre.",
  );

export const disputeProfessionalStatement = (
  clinicId: string,
  statementId: string,
  expectedStatus: string,
  reason: string,
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/specialist/finance/statements/${statementId}/dispute`,
        { expectedStatus, reason },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo comunicar la discrepancia.",
  );

export const createProfessionalInvoiceDraft = (
  clinicId: string,
  statementId: string,
  payload: {
    vatRateBasisPoints: number;
    irpfRateBasisPoints: number;
    vatExemptReason?: string | null;
    series: string;
  },
  idempotencyKey?: string,
): Promise<ProfessionalInvoice> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/specialist/finance/statements/${statementId}/professional-invoices`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo preparar la factura profesional.",
  );

export const issueProfessionalInvoice = (
  clinicId: string,
  professionalInvoiceId: string,
  expectedVersion: number,
  idempotencyKey?: string,
): Promise<ProfessionalInvoice> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/specialist/finance/professional-invoices/${professionalInvoiceId}/issue`,
        { expectedVersion },
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo emitir la factura profesional.",
  );

export const createProfessionalInvoiceRectification = (
  clinicId: string,
  professionalInvoiceId: string,
  payload: { expectedVersion: number; series: string; reason: string },
  idempotencyKey?: string,
): Promise<ProfessionalInvoice> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/specialist/finance/professional-invoices/${professionalInvoiceId}/rectifications`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo preparar la factura rectificativa.",
  );

export const reviewClinicProfessionalInvoice = (
  clinicId: string,
  professionalInvoiceId: string,
  payload: {
    decision: "ACCEPT" | "REQUEST_CORRECTION";
    reason?: string | null;
    expectedVersion: number;
  },
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/finance/professional-invoices/${professionalInvoiceId}/review`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo revisar la factura profesional.",
  );

export const registerClinicProfessionalPayment = (
  clinicId: string,
  statementId: string,
  payload: {
    transferredAmountCents: number;
    withheldAmountCents: number;
    method:
      | "CASH"
      | "EXTERNAL_CARD"
      | "BANK_TRANSFER"
      | "BIZUM"
      | "VOUCHER"
      | "OTHER";
    effectiveAt: string;
    externalReference?: string | null;
    administrativeNote?: string | null;
  },
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(
        `/clinics/${clinicId}/finance/professional-statements/${statementId}/payments`,
        payload,
        { headers: commandHeaders(idempotencyKey) },
      ),
    "No se pudo registrar la transferencia al profesional.",
  );

export const createClinicFinancialAdjustment = (
  clinicId: string,
  payload: {
    kind:
      | "SESSION_CORRECTION"
      | "COLLECTION_CORRECTION"
      | "REFUND_CORRECTION"
      | "PERIOD_CORRECTION"
      | "OTHER";
    amountCents: number;
    reason: string;
    referenceEventId: string;
    targetPeriodId?: string | null;
    effectiveAt: string;
  },
  idempotencyKey?: string,
): Promise<unknown> =>
  request(
    () =>
      api.post(`/clinics/${clinicId}/finance/adjustments`, payload, {
        headers: commandHeaders(idempotencyKey),
      }),
    "No se pudo crear el ajuste financiero.",
  );

const openFinancialDocumentPath = async (path: string): Promise<void> => {
  try {
    const response = await api.get(path, {
      responseType: "blob",
      timeout: 30000,
    });
    const contentType =
      typeof response.headers["content-type"] === "string"
        ? response.headers["content-type"]
        : "application/octet-stream";
    const blob = new Blob([response.data], { type: contentType });
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === "string")
        await WebBrowser.openBrowserAsync(reader.result);
    };
    reader.readAsDataURL(blob);
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(error, "No se pudo abrir el documento financiero."),
    );
  }
};

export const openProfessionalClinicFinancialDocument = (
  clinicId: string,
  documentId: string,
): Promise<void> =>
  openFinancialDocumentPath(
    `/clinics/${clinicId}/specialist/finance/documents/${documentId}`,
  );

export const openClinicFinancialDocument = (
  clinicId: string,
  documentId: string,
): Promise<void> =>
  openFinancialDocumentPath(
    `/clinics/${clinicId}/finance/documents/${documentId}`,
  );
