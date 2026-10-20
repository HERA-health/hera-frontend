import type { Specialist } from '../types';
import { formatMadridDateKey, getMadridDateKey } from '../../../utils/madridTime';

const priceFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const publicProfilePrice = (price: number) =>
  price === 0 ? 'Sin coste' : `${priceFormat.format(price)}\u00a0€`;

export const publicModalityLabel = (modality: string) =>
  modality === 'VIDEO_CALL' ? 'Videollamada' : modality === 'IN_PERSON' ? 'Presencial' : modality === 'PHONE_CALL' ? 'Teléfono' : modality;

export function publicProfileExcerpt(bio: string, limit = 220): string {
  const text = bio.replace(/\s+/gu, ' ').trim();
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit - 1);
  const end = slice.lastIndexOf(' ');
  return `${end > 0 ? slice.slice(0, end) : slice}…`;
}

export function publicAvailabilityLabel(value: Specialist['nextAvailable']): string {
  if (!value) return 'Consulta la disponibilidad';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return 'Consulta la disponibilidad';
  const key = getMadridDateKey(date);
  if (key < getMadridDateKey()) return 'Consulta la disponibilidad';
  return `Próxima disponibilidad: ${formatMadridDateKey(key, { day: 'numeric', month: 'short' })}`;
}
