export const SPECIALTY_TRANSLATIONS: Readonly<Record<string, string>> = {
  anxiety: 'Ansiedad',
  depression: 'Depresión',
  'self-esteem': 'Autoestima',
  stress: 'Estrés laboral',
  relationships: 'Relaciones',
  sleep: 'Problemas de sueño',
  phobias: 'Fobias',
  trauma: 'Trauma',
  couples: 'Terapia de pareja',
  grief: 'Duelo',
  addiction: 'Adicciones',
  eating: 'Trastornos alimentarios',
};

export const translateSpecialty = (specialty: string): string =>
  SPECIALTY_TRANSLATIONS[specialty.toLowerCase()] ?? specialty;
