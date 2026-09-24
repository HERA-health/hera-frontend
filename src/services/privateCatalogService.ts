import { api } from './api';
import type { SessionType, BookingQuote } from './sessionsService';

export interface PrivateServiceOption {
  serviceName?: string; serviceDescription?: string | null; serviceKey?: string;
  id: string; serviceId: string; name: string; modality: SessionType;
  durationMinutes: number; priceCents: number; currency: string;
  isActive: boolean; isPublic: boolean; isPreferred: boolean;
  version: number; legacyDuration: boolean; legacyTariffId: string | null;
}
export interface PrivateServiceCatalog {
  services: PrivateService[];
  version: number; firstVisitFree: boolean; options: PrivateServiceOption[];
  restrictions: Partial<Record<SessionType, string>>;
}
export interface PrivateService {
  id: string; key: string; name: string; description: string | null;
  archivedAt: string | null; version: number; options: PrivateServiceOption[];
}
export interface PrivateServiceInput {
  version: number; name: string; description: string | null; restore?: boolean; options: CatalogOptionInput[];
}
export const savePrivateService = async (id: string | undefined, input: PrivateServiceInput): Promise<PrivateServiceCatalog> =>
  (await (id ? api.put<{ data: PrivateServiceCatalog }>(`/billing/service-catalog/services/${encodeURIComponent(id)}`, input)
    : api.post<{ data: PrivateServiceCatalog }>('/billing/service-catalog/services', input))).data.data;
export const archivePrivateService = async (service: PrivateService): Promise<PrivateServiceCatalog> =>
  (await api.post<{ data: PrivateServiceCatalog }>(`/billing/service-catalog/services/${encodeURIComponent(service.id)}/archive`, { version: service.version })).data.data;
export const savePrivateCatalogSettings = async (firstVisitFree: boolean, previousFirstVisitFree: boolean): Promise<PrivateServiceCatalog> =>
  (await api.patch<{ data: PrivateServiceCatalog }>('/billing/service-catalog/settings', { firstVisitFree, previousFirstVisitFree })).data.data;
export interface CatalogOptionInput {
  id?: string; modality: SessionType; durationMinutes: number; priceCents: number;
  isActive: boolean; isPublic: boolean; isPreferred: boolean;
}
export const loadPrivateCatalog = async (): Promise<PrivateServiceCatalog> =>
  (await api.get<{ data: PrivateServiceCatalog }>('/billing/service-catalog')).data.data;
export const savePrivateCatalog = async (data: { version: number; firstVisitFree: boolean; options: CatalogOptionInput[] }): Promise<PrivateServiceCatalog> =>
  (await api.put<{ data: PrivateServiceCatalog }>('/billing/service-catalog', data)).data.data;
export const loadPublicBookingOptions = async (specialistId: string): Promise<PrivateServiceOption[]> =>
  (await api.get<{ data: PrivateServiceOption[] }>(`/sessions/booking-options/${encodeURIComponent(specialistId)}`)).data.data;
export const getManagedBookingQuote = async (params: { clientId: string; optionId: string; duration: number; type: SessionType; sessionId?: string }): Promise<BookingQuote> =>
  (await api.get<{ data: BookingQuote }>('/sessions/professional/booking-quote', { params })).data.data;
