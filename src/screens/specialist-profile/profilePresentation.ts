import type { Specialist } from './types';

const CLOUDINARY_UPLOAD_MARKER = '/upload/';
const CLOUDINARY_TRANSFORM_PATTERN = /^[a-z]{1,4}_[^/]+(?:,[^/]+)*$/i;

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Español',
  spanish: 'Español',
  español: 'Español',
  en: 'Inglés',
  english: 'Inglés',
  inglés: 'Inglés',
  ca: 'Catalán',
  catalan: 'Catalán',
  català: 'Catalán',
  catalán: 'Catalán',
  fr: 'Francés',
  french: 'Francés',
  francés: 'Francés',
  de: 'Alemán',
  german: 'Alemán',
  alemán: 'Alemán',
  pt: 'Portugués',
  portuguese: 'Portugués',
  português: 'Portugués',
  portugués: 'Portugués',
  it: 'Italiano',
  italian: 'Italiano',
  italiano: 'Italiano',
};

export type ProfileLanguageFlag =
  | 'spain'
  | 'united-kingdom'
  | 'catalonia'
  | 'france'
  | 'germany'
  | 'portugal'
  | 'italy'
  | 'international';

const LANGUAGE_FLAGS: Record<string, ProfileLanguageFlag> = {
  Español: 'spain',
  Inglés: 'united-kingdom',
  Catalán: 'catalonia',
  Francés: 'france',
  Alemán: 'germany',
  Portugués: 'portugal',
  Italiano: 'italy',
};

export interface ProfileLanguageItem {
  label: string;
  flag: ProfileLanguageFlag;
}

const normalizeLanguage = (value: string): string => {
  const trimmed = value.trim();
  return LANGUAGE_LABELS[trimmed.toLocaleLowerCase('es-ES')] ?? trimmed;
};

export const getProfileLanguageItems = (specialist: Specialist): ProfileLanguageItem[] => {
  const unique = new Map<string, string>();
  const values = [
    ...(specialist.languagesSpoken ?? []),
    ...(specialist.languages ?? []),
  ];

  values.forEach((value) => {
    const normalized = normalizeLanguage(value);
    if (!normalized) return;
    const key = normalized.toLocaleLowerCase('es-ES');
    if (!unique.has(key)) unique.set(key, normalized);
  });

  return Array.from(unique.values()).map((label) => ({
    label,
    flag: LANGUAGE_FLAGS[label] ?? 'international',
  }));
};

export const getProfileLanguages = (specialist: Specialist): string[] =>
  getProfileLanguageItems(specialist).map(({ label }) => label);

export const getCloudinaryProfileImageUrl = (
  originalUrl: string,
  width: number,
  height: number
): string => {
  if (!originalUrl.includes('cloudinary.com') || !originalUrl.includes(CLOUDINARY_UPLOAD_MARKER)) {
    return originalUrl;
  }

  const [prefix, suffix] = originalUrl.split(CLOUDINARY_UPLOAD_MARKER);
  if (!prefix || !suffix) return originalUrl;

  const segments = suffix.split('/');
  if (segments[0] && CLOUDINARY_TRANSFORM_PATTERN.test(segments[0])) {
    segments.shift();
  }

  const transformation = `c_fill,g_auto:faces,w_${width},h_${height},q_auto:good,f_auto`;
  return `${prefix}${CLOUDINARY_UPLOAD_MARKER}${transformation}/${segments.join('/')}`;
};

export const formatProfileSlotLabel = (dateKey: string, startTime: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const label = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Madrid',
  }).format(date).replace('.', '').replace(',', '');
  return `${label}, ${startTime}`;
};
