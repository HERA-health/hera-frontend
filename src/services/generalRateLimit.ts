const listeners = new Set<() => void>();
let retryAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let sessionGeneration = 0;

const emit = (): void => { listeners.forEach((listener) => listener()); };
export const getRateLimitSessionGeneration = (): number => sessionGeneration;
export const getGeneralRateLimitRetryAt = (): number => retryAt;
export const isGeneralRateLimited = (): boolean => retryAt > Date.now();
export const subscribeGeneralRateLimit = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function parseRetryAfter(value: unknown, now = Date.now()): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    const date = now + seconds * 1000;
    return seconds >= 0 && Number.isFinite(date) && date <= 8.64e15 ? date : null;
  }
  if (typeof value !== 'string') return null;
  const date = Date.parse(value);
  return Number.isFinite(date) && date >= now ? date : null;
}

export function recordGeneralRateLimit(bodyValue: unknown, headerValue: unknown): void {
  const now = Date.now();
  retryAt = Math.max(retryAt, parseRetryAfter(bodyValue, now) ?? parseRetryAfter(headerValue, now) ?? now + 60_000);
  if (timer) clearTimeout(timer);
  const expire = (): void => {
    const remaining = retryAt - Date.now();
    if (remaining > 0) {
      timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
      return;
    }
    retryAt = 0;
    timer = undefined;
    emit();
  };
  timer = setTimeout(expire, Math.max(0, Math.min(retryAt - now, 2_147_483_647)));
  emit();
}

export function resetGeneralRateLimit(): void {
  sessionGeneration += 1;
  if (timer) clearTimeout(timer);
  timer = undefined;
  retryAt = 0;
  emit();
}

export const rateLimitMessage = (date: number): string =>
  `La actualización está en pausa por exceso de solicitudes. Podrás reintentar a las ${new Date(date).toLocaleTimeString('es-ES')}.`;

export class GeneralRateLimitError extends Error {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly status = 429;
  constructor(readonly retryAt: number) {
    super(rateLimitMessage(retryAt));
    this.name = 'GeneralRateLimitError';
  }
}

export const isGeneralRead = (url = '', method = 'get'): boolean =>
  method.toLowerCase() === 'get'
  && /^\/(dashboard|specialists|sessions|clients|clinics|billing|availability|clinical)(\/|\?|$)|^\/specialist-contact(?:\/|\?|$)/.test(url);
