import { z } from 'zod';
import getEnvVars from '../config/api';
import {
  GuestConsentHttpError,
  requestGuestConsentDocument,
  requestGuestConsentJson,
  type GuestConsentHttpFailure,
} from './guestConsentHttpClient';

const DATE_TIME_SCHEMA = z.string().datetime({ offset: true });
const HEX_64_SCHEMA = z.string().regex(/^[a-f0-9]{64}$/);

const resolutionSchema = z.discriminatedUnion('stage', [
  z.object({
    stage: z.literal('OTP_REQUIRED'),
    serverTime: DATE_TIME_SCHEMA,
    status: z.literal('PENDING'),
    maskedEmail: z.string().min(5).max(254),
    otpDeliveryStatus: z.enum(['SENT', 'PROCESSING', 'FAILED', 'UNKNOWN', 'NOT_SENT']),
    otpExpiresAt: DATE_TIME_SCHEMA.nullable(),
    canResendAt: DATE_TIME_SCHEMA,
  }).strict(),
  z.object({
    stage: z.literal('READY'),
    serverTime: DATE_TIME_SCHEMA,
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
    serverTime: DATE_TIME_SCHEMA,
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

export type GuestConsentRequestFailure = GuestConsentHttpFailure;
export { GuestConsentHttpError as GuestConsentRequestError };

const requestBase = (requestId: string): string =>
  `${getEnvVars().apiUrl}/clinic-consent/guest-requests/${encodeURIComponent(requestId)}`;

const requestJson = async (
  url: string,
  init: RequestInit = {},
  otpInvalidCode?: string
): Promise<GuestConsentResolution> => {
  const envelope = await requestGuestConsentJson({
    url,
    init,
    schema: envelopeSchema,
    otpInvalidCode,
  });
  return envelope.data;
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
  },
  'CLINIC_GUEST_CONSENT_OTP_INVALID'
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
  return requestGuestConsentDocument({
    url: `${requestBase(requestId)}/document`,
    expectedSizeBytes: descriptor.sizeBytes,
    expectedSha256: descriptor.sha256,
  });
};
