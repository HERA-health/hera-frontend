import type { PrivateServiceOption } from '../services/privateCatalogService';
import type { SessionType } from '../services/sessionsService';

export function initialPrivateOption(options: PrivateServiceOption[], preferredId?: string) {
  if (preferredId) return options.find(o => o.id === preferredId);
  const base = options.filter(o => o.serviceKey === 'base' || !o.serviceKey);
  const candidates = base.length ? base : new Set(options.map(o => o.serviceId)).size === 1 ? options : [];
  return candidates.find(o => o.isPreferred) ?? candidates[0];
}

export function privateOptionForModality(options: PrivateServiceOption[], current: PrivateServiceOption | undefined, modality: SessionType) {
  if (!current) return undefined;
  return options.find(o => o.serviceId === current.serviceId && o.modality === modality && o.durationMinutes === current.durationMinutes);
}
