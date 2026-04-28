import { Specialist } from '../constants/types';

const APPROACH_LABELS: Record<string, string> = {
  cbt: 'Terapia cognitiva',
  'cognitive-behavioral': 'Terapia cognitiva',
  act: 'Aceptación y compromiso',
  emdr: 'EMDR',
  psychodynamic: 'Psicodinámica',
  humanistic: 'Humanista',
  systemic: 'Sistémica',
  mindfulness: 'Mindfulness',
  gestalt: 'Gestalt',
};

const TAG_LABELS: Record<string, string> = {
  ansiedad: 'Ansiedad',
  anxiety: 'Ansiedad',
  depresion: 'Depresi\u00f3n',
  depression: 'Depresi\u00f3n',
  pareja: 'Pareja',
  couples: 'Pareja',
  trauma: 'Trauma',
  estres: 'Estr\u00e9s',
  stress: 'Estr\u00e9s',
  autoestima: 'Autoestima',
  self_esteem: 'Autoestima',
  'self-esteem': 'Autoestima',
  selfesteem: 'Autoestima',
  duelo: 'Duelo',
  grief: 'Duelo',
  infantil: 'Infantil',
  adolescentes: 'Adolescentes',
  familia: 'Familia',
  family: 'Familia',
  comunicacion: 'Comunicaci\u00f3n',
  conflicts: 'Conflictos',
  conflictos: 'Conflictos',
  adultos: 'Adultos',
  mindfulness: 'Atenci\u00f3n plena',
  sleep: 'Sue\u00f1o',
  insomnia: 'Sue\u00f1o',
  emdr: 'EMDR',
  tcc: 'TCC',
};

const NON_DISPLAY_MATCH_LABELS = new Set([
  'Especialidad Coincidente',
  'Enfoque Terap\u00e9utico',
  'Personalidad Compatible',
  'Estilo De Sesi\u00f3n',
  'Disponibilidad',
  'Modalidad Compatible',
  'Alta Experiencia',
]);

const normalizeTagKey = (value: string): string => (
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
);

export const prettifySpecialistTag = (value: string): string => {
  const normalized = normalizeTagKey(value);

  return (
    TAG_LABELS[normalized] ??
    value
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

export const getSpecialistDisplayTags = (specialist: Specialist): string[] => {
  const specialtyTags = (specialist.matchingProfile?.specialties ?? [])
    .map((specialty) => prettifySpecialistTag(specialty))
    .filter(Boolean);

  const therapyTags = (specialist.matchingProfile?.therapeuticApproach ?? [])
    .map((approach) => APPROACH_LABELS[normalizeTagKey(approach)] ?? prettifySpecialistTag(approach))
    .filter(Boolean);

  const fallbackTags = (specialist.tags ?? [])
    .map((tag) => prettifySpecialistTag(tag))
    .filter((tag) => !NON_DISPLAY_MATCH_LABELS.has(tag));

  return Array.from(new Set([...specialtyTags, ...fallbackTags, ...therapyTags]));
};

const GENERIC_SPECIALIZATIONS = new Set([
  'general',
  'psicologia_general',
  'psicologia',
]);

export const getSpecialistFocusSummary = (
  specialist: Specialist,
): { primaryFocus: string; supportingTags: string[] } => {
  const displayTags = getSpecialistDisplayTags(specialist);
  const specialization = specialist.specialization.trim();
  const isGenericSpecialization = GENERIC_SPECIALIZATIONS.has(normalizeTagKey(specialization));
  const primaryFocus = isGenericSpecialization
    ? displayTags[0] ?? 'Psicología general'
    : specialization;
  const supportingTags = isGenericSpecialization
    ? displayTags.filter((tag) => tag !== primaryFocus)
    : displayTags;

  return { primaryFocus, supportingTags };
};
