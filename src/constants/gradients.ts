export const GRADIENT_MAP: Record<string, [string, string]> = {
  'salvia-lavanda':  ['#006884', '#006884'],
  'menta-rosa':      ['#97B2A6', '#97B2A6'],
  'cielo-lila':      ['#BDD7FF', '#BDD7FF'],
  'melocoton-rosa':  ['#DFD8CD', '#DFD8CD'],
  'oceano-salvia':   ['#006884', '#006884'],
  'prado-azul':      ['#97B2A6', '#97B2A6'],
  'arena-tostado':   ['#DFD8CD', '#DFD8CD'],
  'amatista-coral':  ['#3E5C4F', '#3E5C4F'],
};

export const DEFAULT_GRADIENT: [string, string] = ['#006884', '#006884'];

export function getGradientColors(gradientId?: string | null): [string, string] {
  if (!gradientId) return DEFAULT_GRADIENT;
  return GRADIENT_MAP[gradientId] ?? DEFAULT_GRADIENT;
}
