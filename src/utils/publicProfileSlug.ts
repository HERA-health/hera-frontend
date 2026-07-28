export const PUBLIC_PROFILE_SLUG_MIN_LENGTH = 3;
export const PUBLIC_PROFILE_SLUG_MAX_LENGTH = 50;
export const PUBLIC_PROFILE_SLUG_MAX_CHANGES = 3;

const SPECIAL_LATIN_CHARACTER_REPLACEMENTS: Readonly<Record<string, string>> = {
  æ: 'ae',
  đ: 'd',
  ð: 'd',
  ł: 'l',
  œ: 'oe',
  ø: 'o',
  ß: 'ss',
  þ: 'th',
};

const RESERVED_PUBLIC_PROFILE_SLUGS = new Set([
  'admin',
  'administracion',
  'api',
  'app',
  'ayuda',
  'blog',
  'clinica',
  'clinicas',
  'contacto',
  'e',
  'especialista',
  'especialistas',
  'health-hera',
  'hera',
  'legal',
  'login',
  'me',
  'null',
  'perfil',
  'privacidad',
  'profesionales',
  'reservar',
  'review',
  'soporte',
  'undefined',
  'verify',
]);

const INTERNAL_SPECIALIST_ID_PATTERN = /^c[a-z0-9]{20,}$/;
const VALID_PUBLIC_PROFILE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const transliterateSpecialLatinCharacters = (value: string): string => (
  Array.from(value)
    .map((character) => SPECIAL_LATIN_CHARACTER_REPLACEMENTS[character] ?? character)
    .join('')
);

export const normalizePublicProfileSlug = (value: string): string => (
  transliterateSpecialLatinCharacters(
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  )
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PUBLIC_PROFILE_SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
);

export const normalizePublicProfileSlugDraft = (value: string): string => (
  transliterateSpecialLatinCharacters(
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  )
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/g, '')
    .slice(0, PUBLIC_PROFILE_SLUG_MAX_LENGTH)
);

export const getPublicProfileSlugValidationMessage = (value: string): string | null => {
  if (value.length < PUBLIC_PROFILE_SLUG_MIN_LENGTH) {
    return `Escribe al menos ${PUBLIC_PROFILE_SLUG_MIN_LENGTH} caracteres para crear tu dirección.`;
  }

  if (value.length > PUBLIC_PROFILE_SLUG_MAX_LENGTH) {
    return `La dirección puede tener como máximo ${PUBLIC_PROFILE_SLUG_MAX_LENGTH} caracteres.`;
  }

  if (!VALID_PUBLIC_PROFILE_SLUG_PATTERN.test(value)) {
    return 'La dirección debe empezar y terminar con una letra o un número. Usa solo letras, números y guiones.';
  }

  if (RESERVED_PUBLIC_PROFILE_SLUGS.has(value)) {
    return 'Esta dirección está reservada. Prueba con otra, por ejemplo tu nombre y apellidos.';
  }

  if (INTERNAL_SPECIALIST_ID_PATTERN.test(value)) {
    return 'Ese formato no se puede usar. Prueba con tu nombre y apellidos.';
  }

  return null;
};
