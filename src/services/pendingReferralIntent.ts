import AsyncStorage from '@react-native-async-storage/async-storage';

// Only the route and opaque identifier survive an authentication redirect.
// Guest credentials are never persisted.
const key = '@hera_pending_care_navigation_v1';
type Intent = { route: 'Referrals' | 'Collaborations'; id: string; expiresAt: number };
let pending: Intent | null = null;
const remember = async (route: Intent['route'], id: string) => {
  pending = { route, id, expiresAt: Date.now() + 30 * 60_000 };
  await AsyncStorage.setItem(key, JSON.stringify(pending)).catch(() => undefined);
};
const get = async (route: Intent['route']) => {
  if (!pending) {
    try {
      const raw: unknown = JSON.parse(await AsyncStorage.getItem(key) ?? 'null');
      if (raw && typeof raw === 'object' && 'route' in raw && (raw.route === 'Referrals' || raw.route === 'Collaborations') && 'id' in raw && typeof raw.id === 'string' && raw.id.length <= 100 && 'expiresAt' in raw && typeof raw.expiresAt === 'number') pending = { route: raw.route, id: raw.id, expiresAt: raw.expiresAt };
    } catch { /* A unavailable local store must not prevent signing in. */ }
  }
  if (pending && pending.expiresAt <= Date.now()) { pending = null; await AsyncStorage.removeItem(key).catch(() => undefined); }
  return pending?.route === route ? pending.id : undefined;
};
const clear = async (route: Intent['route']) => { if (await get(route)) { pending = null; await AsyncStorage.removeItem(key).catch(() => undefined); } };
let guestLink: { id: string; token: string } | undefined;
export const rememberReferralIntent = (id: string) => remember('Referrals', id);
export const getPendingReferralIntent = () => get('Referrals');
export const clearPendingReferralIntent = () => clear('Referrals');
export const rememberCollaborationIntent = (id: string) => remember('Collaborations', id);
export const getPendingCollaborationIntent = () => get('Collaborations');
export const clearPendingCollaborationIntent = () => clear('Collaborations');
export const getReferralGuestToken = (id?: string) => guestLink?.id === id ? guestLink?.token : undefined;
export function captureReferralUrl(url: string | null): string | null {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const path = parsed.protocol === 'hera:' ? `${parsed.hostname}${parsed.pathname}` : parsed.pathname.replace(/^\//, '');
    const match = /^derivaciones\/([^/]+)\/?$/.exec(path);
    if (!match) return url;
    const token = parsed.searchParams.get('token');
    if (token) guestLink = { id: decodeURIComponent(match[1]), token: /^[a-f0-9]{64}$/.test(token) ? token : '' };
    parsed.searchParams.delete('token');
    return parsed.toString();
  } catch { return url; }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const cleanUrl = captureReferralUrl(window.location.href);
  if (cleanUrl && cleanUrl !== window.location.href) window.history.replaceState(window.history.state, '', cleanUrl);
  if (window.location.pathname.startsWith('/derivaciones')) {
    const meta = document.createElement('meta'); meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.appendChild(meta);
  }
}
