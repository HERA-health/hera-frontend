import { z } from 'zod';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './api';
import { ClinicalRequestError } from './clinicalService';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';

const nullableText = z.string().nullable();
export const treatmentSummarySchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'SIGNED', 'WITHDRAWN']),
  method: z.enum(['UPLOADED_PDF', 'DIGITAL_ACCEPTANCE']).nullable(),
  eventId: nullableText,
  recordedAt: nullableText,
  signedAt: nullableText,
  evidenceDocumentId: nullableText,
  evidenceRequestId: nullableText,
  activeRequest: z
    .object({
      id: z.string(),
      stage: z.enum(['PREPARED', 'SENT']),
      requestKind: z.enum(['GRANT', 'WITHDRAWAL']).nullable(),
      deliveryStatus: z
        .enum(['PENDING', 'PROVIDER_ACCEPTED', 'FAILED', 'UNKNOWN', 'CANCELLED'])
        .nullable(),
      expiresAt: z.string(),
      version: z.string(),
      sha256: nullableText,
    })
    .nullable(),
});
const summarySchema = treatmentSummarySchema.extend({
  capabilities: z.object({
    canUpload: z.boolean(),
    canPrepare: z.boolean(),
    canSend: z.boolean(),
    digitalUnavailableReason: nullableText,
    legacyAuthorizationRequired: z.boolean(),
  }),
});
export type TreatmentSummary = z.infer<typeof treatmentSummarySchema>;
export type TreatmentConsent = z.infer<typeof summarySchema>;
const previewSchema = z.object({
  requestId: z.string(),
  version: z.string(),
  sha256: z.string(),
  html: z.string(),
  canSend: z.boolean(),
  pendingLegalReview: z.boolean(),
  sendUnavailableReason: z.string().nullable().optional(),
});
export type TreatmentPreview = z.infer<typeof previewSchema>;
const historySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      method: z.string(),
      version: z.string(),
      evidenceDocumentId: nullableText,
      requestId: nullableText,
      actorType: nullableText,
      reasonCode: nullableText,
      reason: nullableText,
      createdAt: z.string(),
      evidenceRecordedAt: nullableText,
    }),
  ),
  nextCursor: nullableText,
});
export type TreatmentHistory = z.infer<typeof historySchema>;
const base = (clientId: string) =>
  `/clinical/records/${encodeURIComponent(clientId)}/treatment-consent`;
const headers = (token: string, operationKey?: string) => ({
  'x-clinical-access-token': token,
  ...(operationKey ? { 'Idempotency-Key': operationKey } : {}),
});
async function get<T>(url: string, schema: z.ZodType<T>, token?: string) {
  try {
    const response = await api.get<{ data: unknown }>(url, {
      headers: token ? headers(token) : {},
    });
    return schema.parse(response.data.data);
  } catch (error) {
    throw new ClinicalRequestError(error, 'No se pudo cargar el consentimiento informado.');
  }
}
async function post<T>(
  url: string,
  schema: z.ZodType<T>,
  body: unknown,
  token?: string,
  operationKey?: string,
) {
  try {
    const response = await api.post<{ data: unknown }>(url, body, {
      headers: token ? headers(token, operationKey) : {},
    });
    return schema.parse(response.data.data);
  } catch (error) {
    throw new ClinicalRequestError(error, 'No se pudo guardar el consentimiento informado.');
  }
}
export const getTreatmentConsent = (id: string, token: string) =>
  get(base(id), summarySchema, token);
export const prepareTreatmentConsent = (
  id: string,
  token: string,
  key: string,
  withdrawal = false,
) =>
  post(
    `${base(id)}/prepare`,
    previewSchema,
    { confirmsAdultAndSelfActing: true, withdrawal },
    token,
    key,
  );
export const previewTreatmentConsent = (id: string, token: string, requestId: string) =>
  get(`${base(id)}/requests/${encodeURIComponent(requestId)}`, previewSchema, token);
export const sendTreatmentConsent = (
  id: string,
  token: string,
  requestId: string,
  sha256: string,
  key: string,
) =>
  post(
    `${base(id)}/requests/${encodeURIComponent(requestId)}/send`,
    summarySchema,
    { sha256 },
    token,
    key,
  );
export const cancelTreatmentConsent = (id: string, token: string, requestId: string) =>
  post(`${base(id)}/requests/${encodeURIComponent(requestId)}/cancel`, summarySchema, {}, token);
export const changeTreatmentEvidence = (
  id: string,
  token: string,
  eventId: string,
  action: 'WITHDRAW' | 'INVALIDATE',
  reason: string,
  key: string,
) => post(`${base(id)}/evidence`, summarySchema, { eventId, action, reason }, token, key);
export const getTreatmentHistory = (id: string, token: string, cursor?: string) =>
  get(
    `${base(id)}/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    historySchema,
    token,
  );
export async function uploadTreatmentPdf(
  id: string,
  token: string,
  file: UploadAsset,
  key: string,
) {
  try {
    const form = await buildMultipartFormData('document', file);
    const response = await api.post<{ data: unknown }>(`${base(id)}/documents`, form, {
      headers: headers(token, key),
      timeout: 30000,
    });
    return summarySchema.parse(response.data.data);
  } catch (error) {
    throw new ClinicalRequestError(error, 'No se pudo registrar el PDF firmado.');
  }
}
const accountSchema = z.object({
  id: z.string(),
  purpose: z.literal('TREATMENT_CONSENT'),
  status: z.string(),
  requestKind: z.enum(['GRANT', 'WITHDRAWAL']).nullable(),
  version: z.string(),
  sha256: z.string(),
  html: z.string(),
  acceptedAt: nullableText,
});
export type AccountTreatmentConsent = z.infer<typeof accountSchema>;
export const getAccountTreatmentConsent = (id: string, token: string) =>
  get(
    `/clinical/treatment-consent/requests/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
    accountSchema,
  );
export const decideAccountTreatmentConsent = (
  id: string,
  token: string,
  sha256: string,
  decision: 'ACCEPT' | 'REJECT',
) =>
  post(`/clinical/treatment-consent/requests/${encodeURIComponent(id)}/decision`, accountSchema, {
    token,
    sha256,
    decision,
  });
export async function saveTreatmentHtml(html: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'consentimiento-informado.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('No hay una aplicación disponible para conservar el documento.');
  const file = new File(Paths.cache, `consentimiento-${Date.now()}.html`);
  try {
    file.write(html);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/html',
      dialogTitle: 'Guardar consentimiento informado',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
export async function downloadAccountReceipt(id: string) {
  const response = await api.get<string>(
    `/clinical/treatment-consent/requests/${encodeURIComponent(id)}/receipt`,
    { responseType: 'text' },
  );
  await saveTreatmentHtml(response.data);
}
export async function downloadSpecialistReceipt(id: string, token: string, requestId: string) {
  const response = await api.get<string>(
    `${base(id)}/requests/${encodeURIComponent(requestId)}/receipt`,
    { headers: headers(token), responseType: 'text' },
  );
  await saveTreatmentHtml(response.data);
}
