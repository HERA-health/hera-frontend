import api from './api';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';
import type { BookingQuote, SessionStatus, SessionType } from './sessionsService';

export type ReferralStatus = 'DRAFT' | 'PENDING_PATIENT' | 'PENDING_RECIPIENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type ReferralPurpose = 'TRANSFER' | 'COMPLEMENTARY';
export interface ReferralContent { reason: 'COMPETENCE' | 'AVAILABILITY' | 'PREFERENCE' | 'COMPLEMENTARY' | 'OTHER'; explanation: string; summary: string; needs: string; transition: string }
export interface ReferralCandidate { id: string; publicSlug: string | null; specialization: string; professionalType: string | null; pricePerSession: number; priceCents?: number; languagesSpoken: string[]; verificationStatus: string; referralCapabilities: string[]; referralExclusions: string[]; user: { name: string } }
export interface ReferralListItem { id: string; purpose: ReferralPurpose; status: ReferralStatus; expiresAt: string | null; createdAt: string; origin: { user: { name: string } }; recipient: { user: { name: string } } | null }
export interface ReferralDetail {
  id: string; revision: number; purpose: ReferralPurpose; status: ReferralStatus; role: 'ORIGIN' | 'PATIENT' | 'RECIPIENT';
  origin: { id: string; name: string }; recipientId: string | null; client: { id: string; name: string } | null;
  content: ReferralContent | null; documents: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; sha256: string }>;
  candidates: ReferralCandidate[]; authorizedAt: string | null; withdrawnAt: string | null; acceptedAt: string | null; expiresAt: string | null;
  careContextId: string | null; agreementVersionId: string | null; previousId: string | null;
  economicInterest?: { originShareBps: number; billingProfessional: 'RECIPIENT' } | null;
  milestones: { visible: boolean; booked: boolean; attended: boolean; confirmableSession?: { id: string; date: string } | null }; events: Array<{ action: string; actorType: string; revision: number; reasonCode: string | null; createdAt: string }>;
  deliveries: Array<{ status: string; sentAt: string | null }>;
}
export interface ReferralDraft { commandKey: string; clientId: string; purpose: ReferralPurpose; candidateIds: string[]; content: ReferralContent; previousId?: string; agreementVersionId?: string }
export interface ReferralDecision { commandKey: string; revision: number; action: 'SEND' | 'AUTHORIZE' | 'REJECT' | 'ACCEPT' | 'CANCEL' | 'WITHDRAW' | 'REQUEST_INFORMATION' | 'POSTPONE' | 'CONFIRM_ATTENDANCE'; sessionId?: string; recipientId?: string; adultAndSelfDeciding?: true; coordinationAuthorized?: boolean; competentAndAvailable?: true; reasonCode?: 'PATIENT_CHOICE' | 'CAPACITY' | 'COMPETENCE' | 'INFORMATION_REQUIRED' | 'OTHER' }
export interface ReferralAccess { clinicalToken?: string; guestSession?: string }
export const referralHeaders = (a: ReferralAccess) => ({ ...(a.clinicalToken ? { 'x-clinical-access-token': a.clinicalToken } : {}), ...(a.guestSession ? { 'x-referral-session': a.guestSession } : {}) });
const path = (id: string, a: ReferralAccess) => `/referrals/${a.guestSession ? 'guest/' : ''}${encodeURIComponent(id)}`;
export const getReferral = async (id: string, a: ReferralAccess): Promise<ReferralDetail> => (await api.get(path(id, a), { headers: referralHeaders(a) })).data;
export const listReferrals = async (params: { page: number; status?: ReferralStatus; direction?: 'SENT' | 'RECEIVED' }): Promise<{ items: ReferralListItem[]; hasMore: boolean }> => (await api.get('/referrals', { params })).data;
export interface ReferralDirectoryOptions { specializations: string[]; languages: string[]; capabilities: string[] }
export const getReferralDirectoryOptions = async (): Promise<ReferralDirectoryOptions> => (await api.get('/referrals/directory/options')).data;
export const searchReferralDirectory = async (params: { page: number; query?: string; specialization?: string; language?: string; capability?: string; modality?: string; maxPriceCents?: number }): Promise<{ items: ReferralCandidate[]; hasMore: boolean }> => (await api.get('/referrals/directory', { params })).data;
export const createReferral = async (draft: ReferralDraft, access: ReferralAccess): Promise<{ id: string }> => (await api.post('/referrals', draft, { headers: referralHeaders(access) })).data;
export const editReferral = async (id: string, draft: ReferralDraft, revision: number, access: ReferralAccess) => (await api.put(path(id, access), { ...draft, revision }, { headers: referralHeaders(access) })).data;
export const decideReferral = async (id: string, decision: ReferralDecision, access: ReferralAccess) => (await api.post(`${path(id, access)}/decisions`, decision, { headers: referralHeaders(access) })).data;
export const requestReferralOtp = async (id: string, token: string): Promise<{ challenge: string; delivery: string }> => (await api.post(`/referrals/guest/${encodeURIComponent(id)}/otp`, { token })).data;
export const verifyReferralOtp = async (id: string, challenge: string, code: string): Promise<{ session: string }> => (await api.post(`/referrals/guest/${encodeURIComponent(id)}/verify`, { challenge, code })).data;
export const retryReferralNotifications = async (id: string) => api.post(`/referrals/${encodeURIComponent(id)}/retry-notifications`);
export const closePrivateCare = async (clientId: string) => api.post(`/referrals/care/${encodeURIComponent(clientId)}/close`);
export interface ReferralPreferences { acceptsReferrals: boolean; referralCapabilities: string[]; referralExclusions: string[] }
export const getReferralPreferences = async (): Promise<ReferralPreferences> => (await api.get('/referrals/preferences')).data;
export const saveReferralPreferences = async (data: ReferralPreferences) => api.put('/referrals/preferences', data);
export const uploadReferralDocument = async (id: string, revision: number, file: UploadAsset, access: ReferralAccess) => {
  const body = await buildMultipartFormData('file', file, { revision: String(revision) });
  return api.post(`${path(id, access)}/documents`, body, { headers: referralHeaders(access) });
};
export const removeReferralDocument = async (id: string, documentId: string, revision: number, access: ReferralAccess) => api.delete(`${path(id, access)}/documents/${encodeURIComponent(documentId)}`, { data: { revision }, headers: referralHeaders(access) });
export const downloadReferralDocument = async (id: string, documentId: string, access: ReferralAccess): Promise<ArrayBuffer> => (await api.get(`${path(id, access)}/documents/${encodeURIComponent(documentId)}`, { responseType: 'arraybuffer', headers: referralHeaders(access) })).data;
export const getReferralBookingQuote = async (id: string, access: ReferralAccess, input: { type: SessionType; duration: number; optionId?: string }): Promise<BookingQuote> => (await api.post(`${path(id, access)}/booking/quote`, input, { headers: referralHeaders(access) })).data;
export const bookGuestReferral = async (id: string, access: ReferralAccess, input: { type: SessionType; duration: number; date: string; optionId?: string; quoteReference?: string; sessionPhone?: string; commandKey?: string }): Promise<{ id: string; status: SessionStatus }> => (await api.post(`${path(id, access)}/booking/create`, input, { headers: referralHeaders(access) })).data;
