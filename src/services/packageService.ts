import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './api';
import type { SessionType } from './sessionsService';

export interface PackageOption { id: string; modality: SessionType; durationMinutes: number }
export interface PackageOffer {
  id: string; name: string; serviceId: string; serviceName: string; sessions: number; totalCents: number;
  currency: string; version: number; isPublic: boolean; archivedAt: string | null; options: PackageOption[];
}
export interface PackageSnapshot {
  name: string; serviceId: string; serviceName: string; sessions: number; totalCents: number;
  options: PackageOption[]; paymentConditions: string | null;
}
export interface PatientPackage {
  id: string; specialistId: string; clientId: string; createdAt: string; snapshot: PackageSnapshot;
  balance: { total: number; consumed: number; reserved: number; available: number };
  invoice: { id: string; invoiceNumber: string; total: number; status: string; paidAt: string | null; sentAt: string | null } | null;
  uses: Array<{ id: string; sessionId: string; status: string; ordinal: number; session: { date: string; type: SessionType; duration: number; status: string } }>;
  notifications: Array<{ event: string; status: string; sentAt: string | null; retryExhausted?: boolean }>;
  events?: Array<{ kind: string; createdAt: string; details: { origin?: string; sessionId?: string } }>;
}
export interface PackageBilling { billingFullName: string; billingTaxId: string; billingAddress: string; billingPostalCode: string; billingCity: string; billingCountry: string }
export interface PackageQuote { snapshot: PackageSnapshot; quoteReference: string; expiresAt: string; fiscal: { invoiceKind: string; recipientEmail: string; recipient: { fiscalName: string; fiscalTaxId: string | null; fiscalAddress: string | null } } }
export interface PackageCatalogInput { version: number; name: string; serviceId: string; optionIds: string[]; sessions: number; totalCents: number; isPublic: boolean; restore?: boolean }
export const loadPackageCatalog = async () => (await api.get<{ data: PackageOffer[]; acquisitionsEnabled: boolean }>('/billing/package-catalog')).data;
export const savePackageCatalog = async (id: string | undefined, input: PackageCatalogInput) =>
  (await (id ? api.put<{ data: PackageOffer[] }>(`/billing/package-catalog/${encodeURIComponent(id)}`, input) : api.post<{ data: PackageOffer[] }>('/billing/package-catalog', input))).data.data;
export const archivePackageCatalog = async (offer: PackageOffer) => (await api.post<{ data: PackageOffer[] }>(`/billing/package-catalog/${encodeURIComponent(offer.id)}/archive`, { version: offer.version })).data.data;
export const loadPublicPackages = async (specialistId: string) => (await api.get<{ data: PackageOffer[] }>(`/specialists/${encodeURIComponent(specialistId)}/packages`)).data.data;
export const loadPatientPackages = async (clientId?: string) => (await api.get<{ data: PatientPackage[] }>(clientId ? `/professional/clients/${encodeURIComponent(clientId)}/packages` : '/patient-packages/mine')).data.data;
export const loadPatientPackage = async (id: string) => (await api.get<{ data: PatientPackage }>(`/patient-packages/${encodeURIComponent(id)}`)).data.data;
const acquisitionPath = (clientId?: string) => clientId ? `/professional/clients/${encodeURIComponent(clientId)}/packages` : '/patient-packages';
export const quotePackage = async (packageId: string, clientId?: string, specialistId?: string, billing?: PackageBilling) => (await api.post<{ data: PackageQuote }>(`${acquisitionPath(clientId)}/quote`, { packageId, specialistId, billing })).data.data;
export const acquirePackage = async (input: { packageId: string; quoteReference: string; commandKey: string; specialistId?: string; paidAt?: string; bookingIntentToken?: string; billing?: PackageBilling }, clientId?: string) => (await api.post<{ data: PatientPackage }>(acquisitionPath(clientId), input)).data.data;
export interface PublicPackageRequest {
  packageId: string; specialistId: string; commandKey: string; intentToken?: string;
  patient: { firstName: string; lastName: string; email: string };
  privacyAccepted: boolean; privacyVersion: string; billing?: PackageBilling;
}
export const requestPublicPackage = async (input: PublicPackageRequest) =>
  (await api.post<{ data: { requestId: string; expiresAt: string } }>('/public/patient-packages/request', input)).data.data;
export const quotePublicPackage = async (requestId: string, code: string) =>
  (await api.post<{ data: PackageQuote }>('/public/patient-packages/verify', { requestId, code })).data.data;
export const acquirePublicPackage = async (requestId: string, code: string, quoteReference: string) =>
  (await api.post<{ data: PatientPackage }>('/public/patient-packages/verify', { requestId, code, quoteReference })).data.data;
export async function downloadPackageInvoice(id: string) {
  const response = await api.get<ArrayBuffer>(`/patient-packages/${encodeURIComponent(id)}/pdf`, { responseType: 'arraybuffer' });
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = 'factura-bono.pdf'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const file = new File(Paths.cache, `bono-${id}.pdf`); file.write(new Uint8Array(response.data));
    try { await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' }); } finally { file.delete(); }
  }
}
export const packagePrice = (cents: number) => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
export const packageModality = (type: SessionType) => type === 'VIDEO_CALL' ? 'Vídeo' : type === 'IN_PERSON' ? 'Presencial' : 'Teléfono';
