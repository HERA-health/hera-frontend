import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { notifyCommissionAcceptance } from './commissionAcceptanceEvents';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';

export interface Page<T> { items: T[]; hasMore: boolean }
export type Mode = 'LIVE' | 'SIMULATION';
export type Origin = 'HERA_DIRECTORY' | 'SPECIALIST_OWN' | 'SPECIALIST_INVITED' | 'PROFESSIONAL_REFERRAL' | 'COLLABORATION' | 'UNKNOWN';
export interface Terms { id: string; operatorKey: string; mode: Mode; contractText: string; fiscalTreatment: string; operatorName: string; operatorTaxId: string; operatorAddress: string; beneficiary: string; iban: string; paymentInstructions?: string | null; effectiveAt: string }
export interface Acceptance { id: string; termsId: string; acceptedAt: string; terminatedAt: string | null; terms: Terms }
export interface Balance { payableCents?: number; appliedCents?: number; paymentPendingCents?: number; unbilledCents?: number; id: string; specialistId: string; specialistName: string; operatorKey: string; mode: Mode; revision: number; estimatedCents: number; accruedCents: number; undocumentedCents: number; documentedCents: number; pendingCents: number; overdueCents: number; receivedCents: number; creditCents: number; issueCount: number }
export interface Configuration { mode: Mode | 'OFF'; scale: number[]; terms: Terms | null; canAccept: boolean; accounts: Array<{ id: string; mode: Mode; operatorKey: string; acceptances: Acceptance[] }> }
export interface Period { id: string; month: string; revision: number; status: 'OPEN' | 'PREPARED' | 'CLOSED'; baseCents: number; closedAt: string | null }
export interface Entry { id: string; baseCents: number; economicAt: string; recognizedAt: string; reason: string; documentLine: { documentId: string } | null; snapshot: { sessionId: string; sessionDate?: string; position: number | null; rateBps: number | null } }
export interface Document { id: string; rootId: string; originalId: string | null; invoiceNumber: string; storageStatus: 'PENDING' | 'FAILED' | 'READY'; kind: 'ORDINARY' | 'DIFFERENCE' | 'REPLACEMENT'; baseCents: number; taxCents: number; withholdingCents: number; totalCents: number; fileName: string; issuedAt?: string; actorId?: string }
export interface DocumentBalance { fiscalDifferenceCents?: number; id: string; invoiceNumber: string; dueAt: string; totalCents: number; appliedCents: number; remainingCents: number; claimableCents: number; correctionPending: boolean; status: string; documents: Document[] }
export type AllocationTarget = { documentId: string; entryId?: never } | { entryId: string; documentId?: never };
export interface PayableEntry { id: string; snapshotId: string; sessionDate: string; economicAt: string; baseCents: number; appliedCents: number; remainingCents: number; groupRemainingCents: number }
export interface Cash { method?: 'BIZUM' | 'BANK_TRANSFER' | null; isVoided?: boolean; id: string; originalId: string | null; kind: 'RECEIPT' | 'REVERSAL' | 'REFUND'; amountCents: number; availableCents: number; occurredAt: string; recordedAt: string; reference: string; applications: Array<{ id: string; invoiceNumber?: string; sessionDate?: string; documentId: string | null; entryId?: string | null; amountCents: number; reversalOfId: string | null; reason: string }> }
export interface Issue { id: string; relationId: string | null; snapshotId: string | null; reason: string; status: string; resolution: string | null; openedAutomatically?: boolean; context?: { origin: Origin; status: string; initialCount: number | null; history: { totalSessions: number; attendedPaidSessions: number; countedSessions: number } | null } | null }
export interface AccountDetail { pagination?: { payments: boolean; documents: boolean; issues: boolean }; payableEntries?: PayableEntry[]; documentImportBlock?: string | null; summary: Balance; acceptances: Acceptance[]; specialistFiscal: { fiscalName: string | null; fiscalNif: string | null; fiscalAddress: string | null }; periods: Period[]; documents: DocumentBalance[]; cash: Cash[]; issues: Issue[]; hasMore: boolean }
export interface Relation { id: string; origin: Origin; status: string; initialCount: number | null }
export interface CommissionSession { settlement?: Settlement; id: string; sessionId: string; accountId: string; relationId: string; position: number | null; rateBps: number; bookedGrossCents: number; baseCents: number | null; serviceTaxCents: number | null; potentialCents: number | null; entitledCents: number; exclusion: string | null; revision: number; session: { date: string; clientId: string; patientName?: string | null; attendanceOutcome: string | null; status: string }; relation: Relation; movements: Array<{ id: string; kind: string; grossCents: number; baseCents: number; originalId: string | null; occurredAt: string; reference: string }>; revisions: Array<{ id: string; beforePosition: number | null; position: number | null; beforeBps: number; rateBps: number; deltaCents: number; reason: string }> }
export type Action =
 | { action: 'ACCEPT'; termsId: string; confirmed: true }
 | { action: 'TERMINATE'; termsId: string; cutOff: string; reason: string }
 | { action: 'ATTENDANCE'; snapshotId: string; outcome: 'ATTENDED' | 'PATIENT_NO_SHOW' | 'UNCONFIRMED'; reason: string }
 | { action: 'COLLECT'; snapshotId: string; grossCents: number; baseCents?: number; serviceBaseCents: number; serviceTaxCents: number; reference: string; occurredAt: string }
 | { action: 'REFUND'; snapshotId: string; originalId: string; grossCents: number; reference: string; occurredAt: string }
 | { action: 'CORRECT_BASE'; snapshotId: string; baseCents: number; taxCents: number; reason: string }
 | { action: 'REVIEW'; relationId: string; snapshotId?: string; reason: string }
 | { action: 'RESOLVE'; issueId: string; origin: Origin; initialCount: number; evidenceAt: string; reason: string }
 | { action: 'DEFER'; issueId: string; reason: string }
 | { action: 'ENROLL'; clientId: string; initialCount: number; evidenceAt: string; reason: string }
 | { action: 'PREPARE'; periodId: string; revision: number }
 | { action: 'CLOSE'; periodId: string; revision: number; baseCents: number }
 | { action: 'RECEIVE'; method?: 'BIZUM' | 'BANK_TRANSFER'; amountCents: number; occurredAt: string; reference: string; confirmed: true; allowUnapplied: boolean; revision: number; applications: Array<AllocationTarget & { amountCents: number }> }
 | ({ action: 'APPLY_CREDIT'; amountCents: number; revision: number } & AllocationTarget)
 | { action: 'VOID_RECEIPT'; cashId: string; reason: string }
 | { action: 'REVERSE_APPLICATION'; applicationId: string; reason: string }
 | { action: 'RETURN_CREDIT'; amountCents: number; occurredAt: string; reference: string; confirmed: true; revision: number }
 | { action: 'LINK_IDENTITY'; fromClientId: string; toClientId: string; verifiedBothIdentities: true; reason: string };
export interface Fiscal { issuerName: string; issuerTaxId: string; issuerAddress: string; recipientName: string; recipientTaxId: string; recipientAddress: string; concept: string; taxDescription: string; withholdingDescription: string; externalReference: string }
export interface DocumentInput { kind: Document['kind']; originalId?: string; invoiceNumber: string; issuedAt: string; dueAt: string; currency: 'EUR'; entryIds: string[]; baseCents: number; taxCents: number; withholdingCents: number; totalCents: number; fiscal: Fiscal }
const root = '/hera-commissions';
const path = (id: string, admin: boolean) => `${root}${admin ? '/admin' : ''}/accounts/${encodeURIComponent(id)}`;
// Store only a digest and random command key, never fiscal data or patient details.
const pendingKeys = new Map<string, Promise<string>>();
export async function durableCommandKey(scope: string, input: unknown) {
 const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify({ scope, input }));
 const storageKey = `hera-commission-command:${digest}`;
 let pending = pendingKeys.get(storageKey);
 if (!pending) {
   pending = (async () => { const existing = await AsyncStorage.getItem(storageKey); if (existing) return existing; const key = Crypto.randomUUID(); await AsyncStorage.setItem(storageKey, key); return key; })();
   pendingKeys.set(storageKey, pending);
 }
 try { return { commandKey: await pending, storageKey }; } finally { pendingKeys.delete(storageKey); }
}
export const configuration = async () => (await api.get<Configuration>(`${root}/configuration`)).data;
export const detail = async (id: string, admin: boolean, page = 0) => (await api.get<AccountDetail>(path(id, admin), { params: { page } })).data;
export const sessions = async (id: string, admin: boolean, filters: { page: number; month?: string; clientId?: string; state?: string; review?: boolean }) => (await api.get<Page<CommissionSession>>(`${path(id, admin)}/sessions`, { params: filters })).data;
export const period = async (id: string, admin: boolean, periodId: string, page = 0) => (await api.get<Page<Entry> & { period: Period }>(`${path(id, admin)}/periods/${encodeURIComponent(periodId)}`, { params: { page } })).data;
export const decide = async (id: string, admin: boolean, input: Action) => {
 const { commandKey, storageKey } = await durableCommandKey(path(id, admin), input);
 const result = (await api.post<{ id: string }>(path(id, admin) + '/commands', { ...input, commandKey })).data;
 await AsyncStorage.removeItem(storageKey);
 return result;
};
export const accept = async (termsId: string) => {
 const input = { action: 'ACCEPT', termsId, confirmed: true };
 const { commandKey } = await durableCommandKey('accept', input);
 const result = (await api.post<{ accountId: string }>(`${root}/accept`, { ...input, commandKey })).data;
 notifyCommissionAcceptance(termsId);
 return result;
};
export const upload = async (id: string, input: DocumentInput, file: UploadAsset) => {
 const { commandKey } = await durableCommandKey(`document:${id}`, input);
 const body = await buildMultipartFormData('file', file, { metadata: JSON.stringify({ ...input, commandKey }) });
 return (await api.post<{ id: string }>(`${path(id, true)}/documents`, body)).data;
};
export const download = async (id: string, admin: boolean, docId: string) => (await api.get<ArrayBuffer>(`${path(id, admin)}/documents/${encodeURIComponent(docId)}/pdf`, { responseType: 'arraybuffer' })).data;
export const fiscal = async (id: string, admin: boolean, docId: string) => (await api.get<Fiscal>(`${path(id, admin)}/documents/${encodeURIComponent(docId)}`)).data;
export const operators = async () => (await api.get<Array<{ operatorKey: string; mode: Mode; operatorName: string }>>(`${root}/admin/operators`)).data;
export const balances = async (filters: { operatorKey: string; mode: Mode; page: number; search?: string; status?: string }) => (await api.get<Page<Balance> & { totals: Pick<Balance, 'pendingCents' | 'accruedCents' | 'undocumentedCents' | 'overdueCents' | 'receivedCents' | 'creditCents'> & { count: number; paymentPendingCents?: number } }>(`${root}/admin/balances`, { params: filters })).data;
export const specialistAccounts = async (specialistId: string) => (await api.get<Balance[]>(`${root}/admin/specialists/${encodeURIComponent(specialistId)}`)).data;
export const patient = async (clientId: string) => (await api.get<(Relation & { sessions: Array<{ accountId: string; position: number | null; exclusion: string | null }> }) | null>(`${root}/patients/${encodeURIComponent(clientId)}`)).data;
export const directoryIntent = async (specialistId: string) => (await api.post<{ token: string }>(`${root}/directory-intents`, { specialistId })).data;
export const invitation = async (clientId: string) => (await api.post<{ token: string }>(`${root}/invitations`, { clientId })).data;

export const recoverDocument = async (id: string, docId: string, file: UploadAsset) => {
 const body = await buildMultipartFormData('file', file, {});
 return (await api.post<{ id: string }>(path(id, true) + '/documents/' + encodeURIComponent(docId) + '/pdf', body)).data;
};

export type SettlementState = 'PENDING_ACTIVITY' | 'NO_COMMISSION' | 'UNDOCUMENTED' | 'PENDING_PAYMENT' | 'PAID' | 'PARTIAL_DOCUMENT' | 'REVIEW_PENDING' | 'DOCUMENT_NOT_READY';
export interface Settlement { attributedAppliedCents?: number; paymentState?: 'PENDING' | 'PARTIAL' | 'PAID'; documentState?: 'PENDING' | 'AVAILABLE'; unbilledAppliedCents?: number; unbilledPendingCents?: number; state: SettlementState; undocumentedCents: number; documentCount: number }
export interface SessionDocument extends DocumentBalance { sessionCount: number }
export interface DocumentApplication { id: string; amountCents: number; reason: string; reversalOfId: string | null; createdAt: string; actorId: string; cash: { id: string; occurredAt: string; reference: string; actorId: string } }
export interface AdminSpecialistSummary { mode: Mode | 'OFF'; accounts: Array<Balance & { operatorName: string; hasHistory: boolean }> }
export const adminSpecialistSummary = async (id: string) => (await api.get<AdminSpecialistSummary>(`${root}/admin/specialists/${encodeURIComponent(id)}/summary`)).data;
export const sessionDocuments = async (id: string, snapshotId: string, page = 0) => (await api.get<Page<SessionDocument>>(`${path(id, true)}/sessions/${encodeURIComponent(snapshotId)}/documents`, { params: { page } })).data;
export const documentApplications = async (id: string, documentId: string, page = 0) => (await api.get<Page<DocumentApplication>>(`${path(id, true)}/documents/${encodeURIComponent(documentId)}/applications`, { params: { page } })).data;
