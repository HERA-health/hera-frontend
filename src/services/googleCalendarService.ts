import { LEGAL_DOCUMENTS } from '../constants/legal';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';
import { z } from 'zod';
import { calendarChoiceSchema, calendarImportStatusSchema, externalCalendarEventSchema, externalCalendarVerificationSchema, type CalendarImportStatus } from './externalCalendarContracts';
import { captureCalendarUrl, clearCalendarProof, getCalendarIntent, readCalendarProof, saveCalendarProof } from './googleCalendarIntent';

export interface GoogleCalendarStatus {
  import?: CalendarImportStatus;
  activationConnection?: { id: string; generation: number } | null;
  videoProviderPreference?: 'GOOGLE_MEET' | 'DAILY';
  videoSetupCompleted?: boolean;
  meetAssignmentsEnabled?: boolean;
  meetEnabled?: boolean;
  meetDisclosureVersion?: string;
  privacyUpdateRequired?: boolean;
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
export const setVideoPreference = async (provider: 'GOOGLE_MEET', disclosureVersion?: string,
  expectedConnection?: { id: string; generation: number }) =>
  (await api.post<GoogleCalendarStatus>(`${base}/video-preference`,
    { provider, disclosureVersion, expectedConnection }, config)).data;

export interface ProfessionalMeetingStatus {
  fallbackReasonCode?: string | null;
  fallbackAt?: string | null;
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
export const commandSessionMeeting = async (id: string, command: 'RETRY', expectedRevision: number) =>
  (await api.post<ProfessionalMeetingStatus>(`${base}/sessions/${encodeURIComponent(id)}/meeting`, { command, expectedRevision, confirmed: true }, config)).data;

export async function connectGoogleCalendar(userId: string, disclosureVersion = LEGAL_DOCUMENTS.PRIVACY_POLICY.version,
  purpose: 'CONNECT' | 'IMPORT' = 'CONNECT', expectedConnection?: { id: string; generation: number }): Promise<string | null> {
  const { data } = await api.post<{ attemptId: string; proof: string; expiresAt: string; authorizationUrl: string }>(`${base}/connect`, { platform: Platform.OS === 'web' ? 'web' : 'mobile', disclosureVersion, ...(purpose === 'IMPORT' ? { purpose, expectedConnection } : {}) }, config);
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

export async function getImportCalendars() {
  return z.object({ calendars: z.array(calendarChoiceSchema) }).parse((await api.get(`${base}/calendars`)).data).calendars;
}
export async function configureCalendarImport(input: { enabled: boolean; calendarIds: string[]; revision: number; disclosureVersion: string }) {
  return calendarImportStatusSchema.parse((await api.put(`${base}/import`, input, config)).data);
}
export async function getExternalCalendarEvents(from: string, to: string) {
  const schema = z.object({ events: z.array(externalCalendarEventSchema), verification: externalCalendarVerificationSchema });
  const start = new Date(from).getTime(), end = new Date(to).getTime(), maxRange = 42 * 86400000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Elige un intervalo válido.');
  // Civil month grids may span 42 days plus a DST hour. Keep every HTTP range bounded.
  const results = [];
  for (let cursor = start; cursor < end; cursor += maxRange) {
    results.push(schema.parse((await api.get(`${base}/events`, { params: { from: new Date(cursor).toISOString(), to: new Date(Math.min(cursor + maxRange, end)).toISOString() } })).data));
  }
  const verification = results.find(r => r.verification.status === 'UNAVAILABLE')?.verification
    ?? results.find(r => r.verification.status === 'STALE')?.verification ?? results[0].verification;
  return { events: [...new Map(results.flatMap(r => r.events).map(event => [event.id, event])).values()], verification };
}
// Consumed only by the matching signed-in profile after completing OAuth.
let importSetupUser: string | null = null;
export const offerCalendarImportSetup = (userId: string) => { importSetupUser = userId; };
export const consumeCalendarImportSetup = (userId: string) => { const offer = importSetupUser === userId; if (offer) importSetupUser = null; return offer; };

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
