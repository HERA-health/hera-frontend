import { z } from 'zod';
import getEnvVars from '../config/api';
import {
  GuestConsentHttpError,
  requestGuestConsentDocument,
  requestGuestConsentJson,
  type GuestConsentHttpFailure,
} from './guestConsentHttpClient';

const dateTime = z.string().datetime({ offset: true });
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const documentSchema = z.object({
  version: z.string().min(1).max(80),
  sha256: hex64,
  mimeType: z.literal('text/html'),
  sizeBytes: z.number().int().positive(),
}).strict();
const resolutionSchema = z.discriminatedUnion('stage', [
  z.object({
    stage: z.literal('OTP_REQUIRED'),
    serverTime: dateTime,
    status: z.literal('PENDING'),
    maskedEmail: z.string().min(5).max(254),
    otpDeliveryStatus: z.enum(['SENT', 'PROCESSING', 'FAILED', 'UNKNOWN', 'NOT_SENT']),
    otpExpiresAt: dateTime.nullable(),
    canResendAt: dateTime,
  }).strict(),
  z.object({
    stage: z.literal('READY'),
    serverTime: dateTime,
    status: z.literal('PENDING'),
    expiresAt: dateTime,
    requestKind: z.enum(['GRANT', 'WITHDRAWAL']),
    specialist: z.object({
      displayName: z.string().trim().min(1).max(160),
      professionalTitle: z.string().trim().max(160).nullable(),
      licenseNumber: z.string().trim().max(160).nullable(),
    }).strict(),
    purpose: z.literal('CLINICAL_RECORD'),
    document: documentSchema,
  }).strict(),
  z.object({
    stage: z.literal('TERMINAL'),
    serverTime: dateTime,
    result: z.object({
      status: z.enum(['ACCEPTED', 'REJECTED', 'REVOKED']),
      nextAction: z.enum(['REQUEST_WITHDRAWAL', 'REQUEST_NEW', 'NONE']),
    }).strict(),
  }).strict(),
]);
export type ClinicalGuestConsentResolution = z.infer<typeof resolutionSchema>;
export type ClinicalGuestConsentDocumentDescriptor = z.infer<typeof documentSchema>;
export interface ClinicalGuestConsentDocumentBytes { bytes: Uint8Array; html: string }

export type ClinicalGuestConsentFailure = GuestConsentHttpFailure;
export { GuestConsentHttpError as ClinicalGuestConsentRequestError };

const base = (requestId: string): string =>
  `${getEnvVars().apiUrl}/clinical-consent/guest-requests/${encodeURIComponent(requestId)}`;
const requestJson = async (url: string, init: RequestInit = {}): Promise<ClinicalGuestConsentResolution> => {
  const envelope = await requestGuestConsentJson({
    url,
    init,
    schema: z.object({ success: z.literal(true), data: resolutionSchema }).strict(),
    otpInvalidCode: 'CLINICAL_GUEST_CONSENT_OTP_INVALID',
  });
  return envelope.data;
};
const bytesToHex = (bytes: Uint8Array): string => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
export const generateClinicalGuestClientNonce = (): string => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};
const bootstraps = new Map<string, Promise<ClinicalGuestConsentResolution>>();
export const bootstrapClinicalGuestConsent = (requestId: string, token: string, clientNonce: string): Promise<ClinicalGuestConsentResolution> => {
  const body = z.object({ token: hex64, clientNonce: hex64 }).strict().parse({ token, clientNonce });
  const key = `${requestId}:${clientNonce}`;
  const existing = bootstraps.get(key);
  if (existing) return existing;
  const promise = requestJson(`${base(requestId)}/bootstrap`, { method: 'POST', body: JSON.stringify(body) }).finally(() => bootstraps.delete(key));
  bootstraps.set(key, promise);
  return promise;
};
export const resolveClinicalGuestConsent = (requestId: string): Promise<ClinicalGuestConsentResolution> => requestJson(`${base(requestId)}/resolution`);
export const requestClinicalGuestConsentOtp = (requestId: string): Promise<ClinicalGuestConsentResolution> => requestJson(`${base(requestId)}/otp`, { method: 'POST', body: '{}' });
export const verifyClinicalGuestConsentOtp = (requestId: string, code: string): Promise<ClinicalGuestConsentResolution> => requestJson(`${base(requestId)}/otp/verify`, { method: 'POST', body: JSON.stringify(z.object({ code: z.string().regex(/^\d{6}$/) }).parse({ code })) });
export const decideClinicalGuestConsent = (requestId: string, decision: 'ACCEPT' | 'REJECT'): Promise<ClinicalGuestConsentResolution> => requestJson(`${base(requestId)}/decision`, { method: 'POST', body: JSON.stringify({ decision }) });
export const loadClinicalGuestConsentDocument = async (
  requestId: string,
  descriptor: ClinicalGuestConsentDocumentDescriptor
): Promise<ClinicalGuestConsentDocumentBytes> => {
  return requestGuestConsentDocument({
    url: `${base(requestId)}/document`,
    expectedSizeBytes: descriptor.sizeBytes,
    expectedSha256: descriptor.sha256,
  });
};
