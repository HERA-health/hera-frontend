import { z } from 'zod';
import getEnvVars from '../config/api';

const DATE_TIME_SCHEMA = z.string().datetime({ offset: true });
const HEX_64_SCHEMA = z.string().regex(/^[a-f0-9]{64}$/);

const resolutionSchema = z.discriminatedUnion('stage', [
  z.object({
    stage: z.literal('OTP_REQUIRED'),
    status: z.literal('PENDING'),
    maskedEmail: z.string().min(5).max(254),
    otpDeliveryStatus: z.enum(['SENT', 'PROCESSING', 'FAILED', 'UNKNOWN', 'NOT_SENT']),
    otpExpiresAt: DATE_TIME_SCHEMA.nullable(),
    canResendAt: DATE_TIME_SCHEMA,
  }).strict(),
  z.object({
    stage: z.literal('READY'),
    status: z.literal('PENDING'),
    expiresAt: DATE_TIME_SCHEMA,
    requestKind: z.enum(['GRANT', 'WITHDRAWAL']),
    clinic: z.object({ name: z.string().trim().min(1).max(160) }).strict(),
    patient: z.object({ displayName: z.string().trim().min(1).max(160) }).strict(),
    document: z.object({
      purpose: z.literal('CLINIC_ADMINISTRATION'),
      version: z.string().min(1).max(80),
      sha256: HEX_64_SCHEMA,
      mimeType: z.literal('text/html'),
      sizeBytes: z.number().int().positive(),
    }).strict(),
  }).strict(),
  z.object({
    stage: z.literal('TERMINAL'),
    result: z.object({
      status: z.enum(['ACCEPTED', 'REJECTED', 'REVOKED']),
      nextAction: z.enum(['REQUEST_WITHDRAWAL', 'REQUEST_NEW', 'NONE']),
    }).strict(),
  }).strict(),
]);

export type GuestConsentResolution = z.infer<typeof resolutionSchema>;
export type GuestConsentRequestKind = Extract<
  GuestConsentResolution,
  { stage: 'READY' }
>['requestKind'];
export type GuestConsentDocumentDescriptor = Extract<
  GuestConsentResolution,
  { stage: 'READY' }
>['document'];

const envelopeSchema = z.object({
  success: z.literal(true),
  data: resolutionSchema,
}).strict();

export type GuestConsentRequestFailure =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNAVAILABLE';

export class GuestConsentRequestError extends Error {
  constructor(
    public readonly failure: GuestConsentRequestFailure,
    public readonly retryAfterSeconds?: number
  ) {
    super(failure);
    this.name = 'GuestConsentRequestError';
  }
}

const requestBase = (requestId: string): string =>
  `${getEnvVars().apiUrl}/clinic-consent/guest-requests/${encodeURIComponent(requestId)}`;

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GuestConsentRequestError('TIMEOUT');
    }
    throw new GuestConsentRequestError('NETWORK');
  } finally {
    window.clearTimeout(timeout);
  }
};

const requestJson = async (
  url: string,
  init: RequestInit = {}
): Promise<GuestConsentResolution> => {
  const response = await fetchWithTimeout(url, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  }, 15_000);
  if (response.status === 429) {
    const retryAfterSeconds = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
    throw new GuestConsentRequestError(
      'RATE_LIMITED',
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : undefined
    );
  }
  if (response.status >= 500) throw new GuestConsentRequestError('SERVICE_UNAVAILABLE');
  if (!response.ok) throw new GuestConsentRequestError('UNAVAILABLE');
  try {
    return envelopeSchema.parse(await response.json()).data;
  } catch {
    throw new GuestConsentRequestError('UNAVAILABLE');
  }
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

export const generateGuestConsentClientNonce = (): string => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const bootstrapPromises = new Map<string, Promise<GuestConsentResolution>>();

export const bootstrapGuestConsent = (
  requestId: string,
  token: string,
  clientNonce: string
): Promise<GuestConsentResolution> => {
  const parsed = z.object({ token: HEX_64_SCHEMA, clientNonce: HEX_64_SCHEMA }).strict()
    .parse({ token, clientNonce });
  const operationKey = `${requestId}:${clientNonce}`;
  const existing = bootstrapPromises.get(operationKey);
  if (existing) return existing;
  const promise = requestJson(`${requestBase(requestId)}/bootstrap`, {
    method: 'POST',
    body: JSON.stringify(parsed),
  }).finally(() => bootstrapPromises.delete(operationKey));
  bootstrapPromises.set(operationKey, promise);
  return promise;
};

export const resolveGuestConsent = (requestId: string): Promise<GuestConsentResolution> =>
  requestJson(`${requestBase(requestId)}/resolution`);

export const requestGuestConsentOtp = (requestId: string): Promise<GuestConsentResolution> =>
  requestJson(`${requestBase(requestId)}/otp`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const verifyGuestConsentOtp = (
  requestId: string,
  code: string
): Promise<GuestConsentResolution> => requestJson(
  `${requestBase(requestId)}/otp/verify`,
  {
    method: 'POST',
    body: JSON.stringify(z.object({ code: z.string().regex(/^\d{6}$/) }).strict().parse({ code })),
  }
);

export const decideGuestConsent = (
  requestId: string,
  decision: 'ACCEPT' | 'REJECT'
): Promise<GuestConsentResolution> => requestJson(
  `${requestBase(requestId)}/decision`,
  {
    method: 'POST',
    body: JSON.stringify(z.object({ decision: z.enum(['ACCEPT', 'REJECT']) }).strict()
      .parse({ decision })),
  }
);

export interface GuestConsentDocumentBytes {
  bytes: Uint8Array;
  html: string;
}

export const loadGuestConsentDocument = async (
  requestId: string,
  descriptor: GuestConsentDocumentDescriptor
): Promise<GuestConsentDocumentBytes> => {
  const response = await fetchWithTimeout(`${requestBase(requestId)}/document`, {
    credentials: 'include',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  }, 30_000);
  if (response.status === 429) {
    const retryAfterSeconds = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
    throw new GuestConsentRequestError(
      'RATE_LIMITED',
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : undefined
    );
  }
  if (response.status >= 500) throw new GuestConsentRequestError('SERVICE_UNAVAILABLE');
  if (!response.ok) throw new GuestConsentRequestError('UNAVAILABLE');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== descriptor.sizeBytes) {
    throw new GuestConsentRequestError('UNAVAILABLE');
  }
  const digest = new Uint8Array(await window.crypto.subtle.digest('SHA-256', bytes));
  if (bytesToHex(digest) !== descriptor.sha256) {
    throw new GuestConsentRequestError('UNAVAILABLE');
  }
  try {
    return { bytes, html: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    throw new GuestConsentRequestError('UNAVAILABLE');
  }
};
