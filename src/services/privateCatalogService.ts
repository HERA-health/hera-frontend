import { api } from './api';
import type { SessionType, BookingQuote } from './sessionsService';

export interface PrivateServiceOption {
  id: string; serviceId: string; name: string; modality: SessionType;
  durationMinutes: number; priceCents: number; currency: string;
  isActive: boolean; isPublic: boolean; isPreferred: boolean;
  version: number; legacyDuration: boolean; legacyTariffId: string | null;
}
export interface PrivateServiceCatalog {
  version: number; firstVisitFree: boolean; options: PrivateServiceOption[];
  restrictions: Partial<Record<SessionType, string>>;
}
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
