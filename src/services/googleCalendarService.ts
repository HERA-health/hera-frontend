import { LEGAL_DOCUMENTS } from '../constants/legal';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';
import { captureCalendarUrl, clearCalendarProof, getCalendarIntent, readCalendarProof, saveCalendarProof } from './googleCalendarIntent';

export interface GoogleCalendarStatus {
  activationConnection?: { id: string; generation: number } | null;
  videoProviderPreference?: 'GOOGLE_MEET' | 'DAILY';
  meetAssignmentsEnabled?: boolean;
  meetEnabled?: boolean;
  meetDisclosureVersion?: string;
  privacyUpdateRequired?: boolean;
  pendingMeetings?: number;
  failedDeliveries?: number;
  enabled: boolean;
  status: 'CONNECTED' | 'REAUTH_REQUIRED' | 'DISCONNECTING' | 'DISCONNECTED';
  email: string | null;
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
  errorCode: string | null;
  reconciling: boolean;
}
const base = '/integrations/google-calendar';
const config = { headers: { 'x-hera-calendar-client': '1' } };
export const getGoogleCalendarStatus = async () => (await api.get<GoogleCalendarStatus>(`${base}/status`)).data;
export const resyncGoogleCalendar = async () => (await api.post<GoogleCalendarStatus>(`${base}/resync`, {}, config)).data;
export const disconnectGoogleCalendar = async () => (await api.delete<GoogleCalendarStatus>(`${base}/connection`, config)).data;
export const resolveCalendarSession = async (sessionId: string) => (await api.get<{ id: string; clinicId: string | null }>(`${base}/sessions/${encodeURIComponent(sessionId)}`)).data;
export const setVideoPreference = async (provider: 'GOOGLE_MEET' | 'DAILY', disclosureVersion?: string,
  expectedConnection?: { id: string; generation: number }) =>
  (await api.post<GoogleCalendarStatus>(`${base}/video-preference`,
    provider === 'DAILY' ? { provider } : { provider, disclosureVersion, expectedConnection }, config)).data;

export interface ProfessionalMeetingStatus {
  provider: 'GOOGLE_MEET' | 'DAILY' | null;
  preparationStatus: 'NONE' | 'REQUIRES_GOOGLE' | 'PENDING' | 'READY' | 'ERROR' | 'INACTIVE';
  canJoin: boolean;
  meetingLink: string | null;
  reasonCode: string | null;
  retryAfterSeconds?: number;
  meetingRevision: number;
  organizerEmail: string | null;
  organizerConnected: boolean;
  canChangeProvider: boolean;
  canRetryPreparation: boolean;
  deliveryErrorCode: string | null;
}
export const getProfessionalMeetingStatus = async (id: string) =>
  (await api.get<ProfessionalMeetingStatus>(`${base}/sessions/${encodeURIComponent(id)}/meeting`)).data;
export const commandSessionMeeting = async (id: string, command: 'RETRY' | 'USE_DAILY', expectedRevision: number) =>
  (await api.post<ProfessionalMeetingStatus>(`${base}/sessions/${encodeURIComponent(id)}/meeting`, { command, expectedRevision, confirmed: true }, config)).data;

export async function connectGoogleCalendar(userId: string, disclosureVersion = LEGAL_DOCUMENTS.PRIVACY_POLICY.version): Promise<string | null> {
  const { data } = await api.post<{ attemptId: string; proof: string; expiresAt: string; authorizationUrl: string }>(`${base}/connect`, { platform: Platform.OS === 'web' ? 'web' : 'mobile', disclosureVersion }, config);
  await saveCalendarProof({ userId, attemptId: data.attemptId, proof: data.proof, expiresAt: data.expiresAt });
  if (Platform.OS === 'web') {
    window.location.assign(data.authorizationUrl);
    return null;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.authorizationUrl, 'hera://integrations/google-calendar');
  if (result.type !== 'success') { await clearCalendarProof(); return null; }
  captureCalendarUrl(result.url);
  const intent = getCalendarIntent();
  if (intent?.kind !== 'connect' || intent.attempt !== data.attemptId) throw new Error('La respuesta de Google no corresponde a esta vinculación.');
  return intent.attempt;
}

// iOS/Android can deliver the browser result and the deep link together.
let completion: { key: string; promise: Promise<GoogleCalendarStatus> } | null = null;
export function completeGoogleCalendar(userId: string, attemptId: string): Promise<GoogleCalendarStatus> {
  const key = `${userId}:${attemptId}`;
  if (completion?.key === key) return completion.promise;
  const promise = (async () => {
    const proof = await readCalendarProof(userId, attemptId);
    if (!proof) throw new Error('Vuelve a conectar Google Calendar desde esta sesión de HERA.');
    const { data } = await api.post<GoogleCalendarStatus>(`${base}/complete`, { attemptId, proof: proof.proof }, config);
    await clearCalendarProof();
    return data;
  })();
  completion = { key, promise };
  return promise;
}
