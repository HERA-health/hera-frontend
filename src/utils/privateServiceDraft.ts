import type { PrivateServiceOption } from '../services/privateCatalogService';

export const PRIVATE_MODALITIES = [
  { type: 'VIDEO_CALL', label: 'Videollamada', icon: 'videocam-outline' },
  { type: 'IN_PERSON', label: 'Presencial', icon: 'location-outline' },
  { type: 'PHONE_CALL', label: 'Teléfono', icon: 'call-outline' },
] as const;

export type PrivateServiceDraftOption = PrivateServiceOption & {
  durationText: string; priceText: string; isNew: boolean; visibilityChosen: boolean;
};

export function principalPrivateOption(options: PrivateServiceOption[]) {
  const sorted = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes || a.id.localeCompare(b.id));
  return sorted.find(o => o.isActive && o.isPreferred) ?? sorted.find(o => o.isActive) ?? sorted[0];
}

export function makePrivateServiceDraft(options: PrivateServiceOption[]): PrivateServiceDraftOption[] {
  return PRIVATE_MODALITIES.map(({ type }) => {
    const prior = principalPrivateOption(options.filter(o => o.modality === type));
    if (prior) return { ...prior, durationText: String(prior.durationMinutes),
      priceText: String(prior.priceCents / 100).replace('.', ','), isNew: false, visibilityChosen: true };
    return { id: `new:${type}`, serviceId: '', name: '', modality: type, durationMinutes: 60,
      durationText: '60', priceCents: 0, priceText: '', currency: 'EUR', isActive: false,
      isPublic: false, isPreferred: false, version: 0, legacyDuration: false, legacyTariffId: null,
      isNew: true, visibilityChosen: false };
  });
}

export function parsePrivateDuration(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const duration = Number(value);
  return Number.isInteger(duration) && duration >= 5 && duration <= 240 ? duration : null;
}

export function hasSharedPrivateValues(options: PrivateServiceDraftOption[]): boolean {
  const active = options.filter(o => o.isActive);
  return active.every(o => o.durationText === active[0].durationText && o.priceText === active[0].priceText);
}

export function needsPrivateServiceSimplification(options: PrivateServiceOption[]): boolean {
  return PRIVATE_MODALITIES.some(m => options.filter(o => o.isActive && o.modality === m.type).length > 1);
}
