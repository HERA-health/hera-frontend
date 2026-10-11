import type { PrivateService, PrivateServiceCatalog } from '../services/privateCatalogService';
import { PRIVATE_MODALITIES } from './privateServiceDraft';
import { parsePrivatePrice } from './privateTariff';

export function packageServiceNeedsReview(service: PrivateService) {
  const active = service.options.filter(option => option.isActive);
  return service.id.startsWith('legacy:') || !active.length
    || new Set(active.map(option => option.modality)).size !== active.length
    || new Set(active.map(option => option.isPublic)).size !== 1;
}
export function packageServiceOptions(service?: PrivateService) {
  return service?.options.filter(option => option.isActive)
    .sort((a, b) => PRIVATE_MODALITIES.findIndex(m => m.type === a.modality) - PRIVATE_MODALITIES.findIndex(m => m.type === b.modality)) ?? [];
}
export function packagePublicationIssue(service: PrivateService | undefined, optionIds: string[], restrictions: PrivateServiceCatalog['restrictions']) {
  if (!service || service.archivedAt || packageServiceNeedsReview(service)) return 'Selecciona un servicio activo y configurado.';
  const active = packageServiceOptions(service);
  if (active.some(option => !option.isPublic)) return 'El servicio tiene una tarifa privada. Su bono también debe ser privado.';
  if (!optionIds.length) return 'Selecciona al menos una modalidad.';
  for (const id of optionIds) {
    const option = active.find(item => item.id === id);
    if (!option) return 'Revisa las modalidades retiradas del servicio.';
    if (restrictions[option.modality]) return restrictions[option.modality];
  }
  return null;
}
export function parsePackageValues(sessions: string, price: string) {
  const count = /^\d+$/.test(sessions.trim()) ? Number(sessions) : NaN;
  const totalCents = parsePrivatePrice(price);
  if (!Number.isInteger(count) || count < 1 || count > 1000 || totalCents === null || totalCents > 100_000_000) return null;
  return { sessions: count, totalCents };
}
export function packageSavings(sessions: number, totalCents: number, priceCents: number) {
  const referenceCents = sessions * priceCents;
  return { differenceCents: referenceCents - totalCents, percentage: referenceCents > 0 ? (referenceCents - totalCents) / referenceCents * 100 : null };
}
