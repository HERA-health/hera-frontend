import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PROOF_KEY = 'hera_google_calendar_proof';
const INTENT_KEY = 'hera_google_calendar_intent';
export type CalendarIntent = { kind: 'connect'; attempt?: string } | { kind: 'session'; sessionId: string };
export type CalendarProof = { userId: string; attemptId: string; proof: string; expiresAt: string };
let pendingIntent: CalendarIntent | null = null;

export function getCalendarIntent(): CalendarIntent | null { return pendingIntent; }
export function clearCalendarIntent() {
  pendingIntent = null;
  if (Platform.OS === 'web') window.sessionStorage.removeItem(INTENT_KEY);
}

export async function saveCalendarProof(proof: CalendarProof) {
  const value = JSON.stringify(proof);
  if (Platform.OS === 'web') window.sessionStorage.setItem(PROOF_KEY, value);
  else await SecureStore.setItemAsync(PROOF_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export async function clearCalendarProof() {
  if (Platform.OS === 'web') window.sessionStorage.removeItem(PROOF_KEY);
  else await SecureStore.deleteItemAsync(PROOF_KEY);
}
export async function readCalendarProof(userId: string, attemptId: string): Promise<CalendarProof | null> {
  const value = Platform.OS === 'web' ? window.sessionStorage.getItem(PROOF_KEY) : await SecureStore.getItemAsync(PROOF_KEY);
  if (!value) return null;
  try {
    const item: unknown = JSON.parse(value);
    if (!item || typeof item !== 'object' || !('userId' in item) || !('attemptId' in item) || !('proof' in item) || !('expiresAt' in item)) return null;
    if (item.userId !== userId || item.attemptId !== attemptId || typeof item.proof !== 'string' || typeof item.expiresAt !== 'string' || !(Date.parse(item.expiresAt) > Date.now())) return null;
    return { userId, attemptId, proof: item.proof, expiresAt: item.expiresAt };
  } catch { return null; }
}

export function captureCalendarUrl(url: string | null): string | null {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const path = parsed.protocol === 'hera:' ? `${parsed.hostname}${parsed.pathname}` : parsed.pathname.replace(/^\//, '');
    if (path === 'integrations/google-calendar') {
      const attempt = parsed.searchParams.get('attempt');
      const preservedAttempt = pendingIntent?.kind === 'connect' ? pendingIntent.attempt : undefined;
      const validAttempt = attempt && /^[a-f0-9-]{36}$/.test(attempt) ? attempt : preservedAttempt;
      pendingIntent = { kind: 'connect', ...(validAttempt ? { attempt: validAttempt } : {}) };
      parsed.searchParams.delete('attempt');
    } else if (/^calendar\/session\/[a-zA-Z0-9_-]{1,128}$/.test(path)) {
      pendingIntent = { kind: 'session', sessionId: path.slice('calendar/session/'.length) };
    } else return url;
    if (Platform.OS === 'web') window.sessionStorage.setItem(INTENT_KEY, JSON.stringify(pendingIntent));
    return parsed.toString();
  } catch { return url; }
}

// Capture opaque callback identifiers before navigation/analytics. OAuth tokens
// and the completion proof never appear in callback URLs.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!pendingIntent) {
    try {
      const stored: unknown = JSON.parse(window.sessionStorage.getItem(INTENT_KEY) ?? 'null');
      if (stored && typeof stored === 'object' && 'kind' in stored) {
        if (stored.kind === 'connect') pendingIntent = { kind: 'connect', ...('attempt' in stored && typeof stored.attempt === 'string' ? { attempt: stored.attempt } : {}) };
        if (stored.kind === 'session' && 'sessionId' in stored && typeof stored.sessionId === 'string') pendingIntent = { kind: 'session', sessionId: stored.sessionId };
      }
    } catch { /* Invalid local navigation state is discarded. */ }
  }
  const cleanUrl = captureCalendarUrl(window.location.href);
  if (cleanUrl && cleanUrl !== window.location.href) window.history.replaceState(window.history.state, '', cleanUrl);
}
