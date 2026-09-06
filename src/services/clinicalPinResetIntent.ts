// Secrets stay in memory, outside navigation state, storage and analytics.
let pending: { token: string; capturedAt: number } | null = null;
let returnContext: { userId: string; clientId: string } | null = null;
const listeners = new Set<() => void>();
export const subscribeClinicalPinReset = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getClinicalPinResetToken = () => pending && Date.now() - pending.capturedAt < 15 * 60_000 ? pending.token : null;
export const hasPendingClinicalPinReset = () => pending !== null;
export function clearClinicalPinResetIntent() { pending = null; listeners.forEach((listener) => listener()); }
export function setClinicalPinReturnContext(userId: string, clientId: string) { returnContext = { userId, clientId }; }
export function takeClinicalPinReturnClient(userId: string) {
  const clientId = returnContext?.userId === userId ? returnContext.clientId : undefined;
  returnContext = null;
  return clientId;
}

export function captureClinicalPinResetUrl(url: string | null): string | null {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const path = parsed.protocol === 'hera:' ? `${parsed.hostname}${parsed.pathname}` : parsed.pathname.replace(/^\//, '');
    if (path !== 'clinical-pin/reset') return url;
    const token = parsed.searchParams.get('token');
    if (token) {
      pending = { token: /^[a-f0-9]{64}$/.test(token) ? token : '', capturedAt: Date.now() };
      listeners.forEach((listener) => listener());
    }
    parsed.searchParams.delete('token');
    return parsed.toString();
  } catch { return url; }
}

// Run before mounting analytics/navigation on web; do not leave credentials in history.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const cleanUrl = captureClinicalPinResetUrl(window.location.href);
  if (cleanUrl && cleanUrl !== window.location.href) window.history.replaceState(window.history.state, '', cleanUrl);
  if (window.location.pathname === '/clinical-pin/reset') {
    const meta = document.createElement('meta');
    meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.appendChild(meta);
  }
}
