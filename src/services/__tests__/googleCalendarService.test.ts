import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api';
import { captureCalendarUrl, clearCalendarIntent, clearCalendarProof, getCalendarIntent, readCalendarProof, saveCalendarProof } from '../googleCalendarIntent';
import { completeGoogleCalendar, connectGoogleCalendar } from '../googleCalendarService';

jest.mock('../api', () => ({ api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), WebBrowserResultType: { CANCEL: 'cancel' } }));
jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const assign = jest.fn();
const post = jest.mocked(api.post);
const identity = '11111111-1111-4111-8111-111111111111';
const proof = { userId: 'professional', attemptId: identity, proof: 'opaque-completion-proof', expiresAt: new Date(Date.now() + 600_000).toISOString() };

beforeEach(() => {
  jest.clearAllMocks(); storage.clear();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  } });
  Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  clearCalendarIntent();
});
test('proof is restricted to the initiating user, attempt and expiration', async () => {
  await saveCalendarProof(proof);
  expect(await readCalendarProof('professional', identity)).toEqual(proof);
  expect(await readCalendarProof('other', identity)).toBeNull();
  expect(await readCalendarProof('professional', 'other-attempt')).toBeNull();
  await saveCalendarProof({ ...proof, expiresAt: new Date(0).toISOString() });
  expect(await readCalendarProof('professional', identity)).toBeNull();
  await clearCalendarProof(); expect(storage.has('hera_google_calendar_proof')).toBe(false);
});
test('cleaning the callback URL does not lose the intent when navigation reads it again', () => {
  const clean = captureCalendarUrl(`https://hera.example/integrations/google-calendar?attempt=${identity}`);
  expect(clean).not.toContain(identity);
  expect(getCalendarIntent()).toEqual({ kind: 'connect', attempt: identity });
  captureCalendarUrl(clean);
  expect(getCalendarIntent()).toEqual({ kind: 'connect', attempt: identity });
});
test('native links and event links contain only opaque identifiers', () => {
  captureCalendarUrl(`hera://integrations/google-calendar?attempt=${identity}`);
  expect(getCalendarIntent()).toEqual({ kind: 'connect', attempt: identity });
  captureCalendarUrl('https://hera.example/calendar/session/opaque-session');
  expect(getCalendarIntent()).toEqual({ kind: 'session', sessionId: 'opaque-session' });
});
test('web connection persists only the completion proof and redirects in the same tab', async () => {
  post.mockResolvedValueOnce({ data: { ...proof, authorizationUrl: 'https://accounts.google.com/oauth' } });
  await connectGoogleCalendar('professional');
  expect(post).toHaveBeenCalledWith('/integrations/google-calendar/connect', { platform: 'web', disclosureVersion: '2026-09-20' }, { headers: { 'x-hera-calendar-client': '1' } });
  expect(assign).toHaveBeenCalledWith('https://accounts.google.com/oauth');
  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  expect(storage.get('hera_google_calendar_proof')).not.toMatch(/access_token|refresh_token/);
});
test('completion requires the local proof and deduplicates repeated browser results', async () => {
  await saveCalendarProof(proof);
  post.mockResolvedValueOnce({ data: { status: 'CONNECTED' } });
  const [first, second] = await Promise.all([completeGoogleCalendar('professional', identity), completeGoogleCalendar('professional', identity)]);
  expect(first).toEqual(second); expect(post).toHaveBeenCalledTimes(1);
  expect(await readCalendarProof('professional', identity)).toBeNull();
  await expect(completeGoogleCalendar('other-user', identity)).rejects.toThrow('esta sesión');
});

test('native connection uses the auth browser and validates the returned attempt', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  post.mockResolvedValue({ data: { ...proof, authorizationUrl: 'https://accounts.google.com/oauth' } });
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({ type: 'success', url: `hera://integrations/google-calendar?attempt=${identity}` });
  await expect(connectGoogleCalendar('professional')).resolves.toBe(identity);
  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith('https://accounts.google.com/oauth', 'hera://integrations/google-calendar');
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({ type: 'success', url: 'hera://integrations/google-calendar?attempt=22222222-2222-4222-8222-222222222222' });
  await expect(connectGoogleCalendar('professional')).rejects.toThrow('no corresponde');
});

test('closing the native auth browser stops completion and clears its proof', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  post.mockResolvedValueOnce({ data: { ...proof, authorizationUrl: 'https://accounts.google.com/oauth' } });
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({ type: WebBrowser.WebBrowserResultType.CANCEL });
  await expect(connectGoogleCalendar('professional')).resolves.toBeNull();
  const secureStore = jest.requireMock('expo-secure-store');
  expect(secureStore.deleteItemAsync).toHaveBeenCalled();
});
