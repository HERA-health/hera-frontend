import api from './api';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';
import type { ReferralCandidate } from './referralService';
export interface Page<T> { items: T[]; hasMore: boolean }
export interface CollaborationTerms {
  templateId: string; contractText: string;
  territory: string; object: string; scope: string; terminationClause: string; sessionTypes: Array<'VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL'>;
  originShareBps: number; validFrom: string; validUntil: string; autonomousAndAuthorized: true;
}
export interface CollaborationVersion extends Omit<CollaborationTerms, 'autonomousAndAuthorized'> {
  id: string; number: number; status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'; templateId: string; contractText: string;
  originAcceptedAt: string; recipientAcceptedAt: string | null; responseReason: string | null;
  originIdentity: { name: string; taxId: string; address: string }; recipientIdentity: { name: string; taxId: string; address: string } | null;
}
export interface Collaboration {
  terminatedBy?: string | null; successorId?: string | null;
  id: string; revision: number; origin: { id: string; name: string }; recipient: { id: string | null; name: string };
  role: 'ORIGIN' | 'RECIPIENT'; terminatedAt: string | null; terminationReason: string | null; versions: CollaborationVersion[];
  deliveries: Array<{ id: string; status: string; attempts: number }>;
}
export interface CollaborationListItem { id: string; originName: string; recipientName: string; role: 'ORIGIN' | 'RECIPIENT'; terminatedAt: string | null; version: Pick<CollaborationVersion, 'status' | 'originShareBps' | 'validUntil'> }
export interface CollaborationPatient { id: string; clientId: string; referralId: string; activatedAt: string }
export interface CollaborationMovement { id: string; kind: 'COLLECTION' | 'REFUND' | 'BASE_CORRECTION'; grossCents: number; baseCents: number; originalId: string | null; reference: string; occurredAt: string }
export interface CollaborationSession { id: string; sessionId: string; clientId: string; referralId: string; date: string; type: string; status: string; attendanceOutcome: 'ATTENDED' | 'PATIENT_NO_SHOW' | null; versionNumber: number; originShareBps: number; bookedPriceCents: number; baseCents: number | null; exclusionReason: string | null; movements: CollaborationMovement[]; originAmountCents: number; netCollectedCents: number }
export interface CollaborationTransfer { id: string; amountCents: number; reference: string; transferredAt: string; status: 'DECLARED' | 'CONFIRMED' | 'DISPUTED' | 'WITHDRAWN'; responseReason: string | null; confirmedAt: string | null }
export interface CollaborationInvoice { generatedInHera?: boolean; id: string; number: number; status: 'UPLOADING' | 'READY' | 'FAILED' | 'ACCEPTED' | 'CORRECTION_REQUESTED'; originalId: string | null; invoiceNumber: string; issuedAt: string; baseCents: number; taxCents: number; withholdingCents: number; payableCents: number; fileName: string; responseReason: string | null; transfers: CollaborationTransfer[] }
export interface CollaborationPeriod { id: string; month: string; status: 'OPEN' | 'SUBMITTED' | 'DISPUTED' | 'CLOSED'; revision: number; amountCents: number; discrepancy: string | null }
export interface CollaborationTransferBalance {
  closedBaseCents: number;
  documentedBaseCents: number;
  pendingNegativeBaseCents: number;
  documentedPayableCents: number;
  confirmedReceivedCents: number;
  pendingDeclaredCents: number;
  balanceCents: number;
  availableToDeclareCents: number;
  blockedReason: 'PENDING_ADJUSTMENTS' | 'INVOICE_CORRECTION_REQUIRED' | 'INVOICE_REVIEW_PENDING' | null;
  reviewPeriods: Array<{ id: string; month: string }>;
}
export interface CollaborationPeriodDetail extends CollaborationPeriod { transferBalance?: CollaborationTransferBalance; invoices: CollaborationInvoice[]; entries: Array<{ id: string; originAmountCents: number; reason: string; createdAt: string; snapshot: { sessionId: string; originShareBps: number; baseCents: number | null; attribution: { referralId: string } }; movement: CollaborationMovement | null }>; hasMore: boolean; documentable: { baseCents: number; offsetCents: number; totalClosedCents: number; documentedElsewhereCents: number } | null }
export interface CollaborationFiscalMetadata { issuerName: string; issuerTaxId: string; issuerAddress: string; recipientName: string; recipientTaxId: string; recipientAddress: string; concept: string; taxDescription: string; withholdingDescription: string }
export interface CollaborationInvoiceInput extends CollaborationFiscalMetadata { periodId: string; originalId?: string; invoiceNumber: string; issuedAt: string; baseCents: number; taxCents: number; withholdingCents: number; payableCents: number }
export type AgreementAction = { action: 'VERSION'; version: CollaborationTerms } | { action: 'ACCEPT_VERSION'; versionId: string; autonomousAndAuthorized: true } | { action: 'REJECT_VERSION'; versionId: string; reason: string } | { action: 'TERMINATE'; cutOff: string; reason: string }
  | { action: 'RESCHEDULE_TERMINATION'; expectedCutOff: string; cutOff: string; reason: string }
  | { action: 'CANCEL_TERMINATION'; expectedCutOff: string; reason: string }
  | { action: 'RESTART'; expectedCutOff: string; version: CollaborationTerms };
export type FinanceAction =
  | { action: 'COLLECT'; snapshotId: string; grossCents: number; eligibleBaseCents: number; serviceBaseCents: number; reference: string; occurredAt: string }
  | { action: 'REFUND'; snapshotId: string; originalId: string; grossCents: number; reference: string; occurredAt: string }
  | { action: 'CORRECT_BASE'; snapshotId: string; serviceBaseCents: number; reason: string }
  | { action: 'ATTENDANCE'; snapshotId: string; outcome: 'ATTENDED' | 'PATIENT_NO_SHOW'; reason: string }
  | { action: 'SUBMIT_PERIOD'; periodId: string; revision: number }
  | { action: 'ACCEPT_PERIOD'; periodId: string; revision: number; amountCents: number }
  | { action: 'DISPUTE_PERIOD'; periodId: string; revision: number; reason: string }
  | { action: 'ACCEPT_INVOICE'; invoiceId: string }
  | { action: 'CORRECT_INVOICE'; invoiceId: string; reason: string }
  | { action: 'DECLARE_TRANSFER'; invoiceId: string; amountCents: number; reference: string; transferredAt: string }
  | { action: 'CONFIRM_TRANSFER'; transferId: string }
  | { action: 'RECORD_RECEIPT'; invoiceId: string; amountCents: number; reference: string; transferredAt: string }
  | { action: 'DISPUTE_TRANSFER' | 'WITHDRAW_TRANSFER'; transferId: string; reason: string };
const path = (id: string) => `/collaborations/${encodeURIComponent(id)}`;
export const listCollaborations = async (page: number, status?: string): Promise<Page<CollaborationListItem> & { eligibility: Array<{ territory: string; professions: string[] }>; unavailableReason?: 'PSYCHIATRY' | 'PROFESSION_REQUIRED' | null }> => (await api.get('/collaborations', { params: { page, status } })).data;
export const createCollaboration = async (recipientEmail: string, version: CollaborationTerms, commandKey: string): Promise<{ id: string }> => (await api.post('/collaborations', { recipientEmail, version, commandKey })).data;
export const getCollaboration = async (id: string): Promise<Collaboration> => (await api.get(path(id))).data;
export const decideCollaboration = async (id: string, action: AgreementAction, commandKey: string): Promise<{ id: string }> => (await api.post(`${path(id)}/decisions`, { ...action, commandKey })).data;
export const decideFinance = async (id: string, action: FinanceAction, commandKey: string): Promise<{ id: string }> => (await api.post(`${path(id)}/finance`, { ...action, commandKey })).data;
export const listPatients = async (id: string, page: number): Promise<Page<CollaborationPatient>> => (await api.get(`${path(id)}/patients`, { params: { page } })).data;
export const listSessions = async (id: string, page: number): Promise<Page<CollaborationSession>> => (await api.get(`${path(id)}/sessions`, { params: { page } })).data;
export const listPeriods = async (id: string, page: number): Promise<Page<CollaborationPeriod>> => (await api.get(`${path(id)}/periods`, { params: { page } })).data;
export const getPeriod = async (id: string, periodId: string, page: number): Promise<CollaborationPeriodDetail> => (await api.get(`${path(id)}/periods/${encodeURIComponent(periodId)}`, { params: { page } })).data;
export const downloadSettlement = async (id: string, periodId: string): Promise<ArrayBuffer> => (await api.get(`${path(id)}/periods/${encodeURIComponent(periodId)}/document`, { responseType: 'arraybuffer' })).data;
export const getInvoiceDefaults = async (id: string): Promise<Pick<CollaborationFiscalMetadata, 'issuerName' | 'issuerTaxId' | 'issuerAddress' | 'recipientName' | 'recipientTaxId' | 'recipientAddress'> & { vatRate: number }> => (await api.get(`${path(id)}/invoice-defaults`)).data;
export const issueInvoice = async (id: string, input: Omit<CollaborationInvoiceInput, 'invoiceNumber' | 'issuedAt'>, commandKey: string) => api.post(`${path(id)}/issued-invoices`, { ...input, commandKey, confirmed: true });
export const getInvoice = async (id: string, invoiceId: string): Promise<CollaborationInvoice & { fiscal: CollaborationFiscalMetadata }> => (await api.get(`${path(id)}/invoices/${encodeURIComponent(invoiceId)}`)).data;
export const downloadInvoice = async (id: string, invoiceId: string): Promise<ArrayBuffer> => (await api.get(`${path(id)}/invoices/${encodeURIComponent(invoiceId)}/document`, { responseType: 'arraybuffer' })).data;
export const uploadInvoice = async (id: string, metadata: CollaborationInvoiceInput, file: UploadAsset, commandKey: string) => {
  const body = await buildMultipartFormData('file', file, { metadata: JSON.stringify({ ...metadata, commandKey }) });
  return api.post(`${path(id)}/invoices`, body);
};
export const retryNotifications = (id: string) => api.post(`${path(id)}/retry-notifications`);
export const getReferralCandidate = async (versionId: string): Promise<ReferralCandidate> => (await api.get(`/collaborations/referral-versions/${encodeURIComponent(versionId)}`)).data;
export const getConfiguration = async (): Promise<Array<{ territory: string; professions: string[]; templateId: string; contractText: string }>> => (await api.get('/collaborations/configuration')).data;

export const retryIssuedInvoice = (id: string, invoiceId: string) => api.post(`${path(id)}/issued-invoices/${encodeURIComponent(invoiceId)}/retry`);
