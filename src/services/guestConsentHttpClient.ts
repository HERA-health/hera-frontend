import { z } from 'zod';

export type GuestConsentHttpFailure =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'OTP_INVALID'
  | 'UNAVAILABLE';

export class GuestConsentHttpError extends Error {
  constructor(
    public readonly failure: GuestConsentHttpFailure,
    public readonly retryAfterSeconds?: number
  ) {
    super(failure);
    this.name = 'GuestConsentHttpError';
  }
}

const withTimeout = async <T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error: unknown) {
    if (error instanceof GuestConsentHttpError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GuestConsentHttpError('TIMEOUT');
    }
    throw new GuestConsentHttpError('NETWORK');
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

const retryAfter = (response: Response): number | undefined => {
  const parsed = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const requestGuestConsentJson = async <T>(input: {
  url: string;
  schema: z.ZodType<T>;
  init?: RequestInit;
  otpInvalidCode?: string;
  timeoutMs?: number;
}): Promise<T> => withTimeout(input.timeoutMs ?? 15_000, async (signal) => {
  const response = await fetch(input.url, {
    ...input.init,
    signal,
    credentials: 'include',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: {
      ...(input.init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...input.init?.headers,
    },
  });
  if (response.status === 429) {
    throw new GuestConsentHttpError('RATE_LIMITED', retryAfter(response));
  }
  if (response.status >= 500) throw new GuestConsentHttpError('SERVICE_UNAVAILABLE');
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error: unknown) {
    if (signal.aborted) throw error;
    payload = null;
  }
  if (
    response.status === 400
    && input.otpInvalidCode
    && z.object({ code: z.literal(input.otpInvalidCode) }).passthrough().safeParse(payload).success
  ) {
    throw new GuestConsentHttpError('OTP_INVALID');
  }
  if (!response.ok) throw new GuestConsentHttpError('UNAVAILABLE');
  const parsed = input.schema.safeParse(payload);
  if (!parsed.success) throw new GuestConsentHttpError('UNAVAILABLE');
  return parsed.data;
});

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

export const requestGuestConsentDocument = async (input: {
  url: string;
  expectedSizeBytes: number;
  expectedSha256: string;
  timeoutMs?: number;
}): Promise<{ bytes: Uint8Array; html: string }> => withTimeout(
  input.timeoutMs ?? 30_000,
  async (signal) => {
    const response = await fetch(input.url, {
      signal,
      credentials: 'include',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (response.status === 429) {
      throw new GuestConsentHttpError('RATE_LIMITED', retryAfter(response));
    }
    if (response.status >= 500) throw new GuestConsentHttpError('SERVICE_UNAVAILABLE');
    if (!response.ok) throw new GuestConsentHttpError('UNAVAILABLE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== input.expectedSizeBytes) {
      throw new GuestConsentHttpError('UNAVAILABLE');
    }
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
    if (bytesToHex(digest) !== input.expectedSha256) {
      throw new GuestConsentHttpError('UNAVAILABLE');
    }
    try {
      return { bytes, html: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
    } catch {
      throw new GuestConsentHttpError('UNAVAILABLE');
    }
  }
);
