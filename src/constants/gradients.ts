export const GRADIENT_MAP: Record<string, [string, string]> = {
  'salvia-lavanda':  ['#8B9D83', '#B8A8D9'],
  'menta-rosa':      ['#A8C4B8', '#D4A5C9'],
  'cielo-lila':      ['#B8C9E8', '#C8B8D9'],
  'melocoton-rosa':  ['#E8C4A8', '#D4A5C9'],
  'oceano-salvia':   ['#9DB8C8', '#8B9D83'],
  'prado-azul':      ['#C8D8B8', '#A8C4D8'],
  'arena-tostado':   ['#E8D4C8', '#C8B8A8'],
  'amatista-coral':  ['#D4C8E8', '#E8C4C8'],
};

export const DEFAULT_GRADIENT: [string, string] = ['#8B9D83', '#B8A8D9'];

export function getGradientColors(gradientId?: string | null): [string, string] {
  if (!gradientId) return DEFAULT_GRADIENT;
  return GRADIENT_MAP[gradientId] ?? DEFAULT_GRADIENT;
}
