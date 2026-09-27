import type { Specialist } from '../../constants/types';

export const affinityPercentage = (score?: number): number =>
  score === undefined ? 0 : Math.round((score / 130) * 100);

export function combineSpecialistResults(
  available: Specialist[],
  matched: Specialist[],
  restrictToAvailable: boolean,
): Specialist[] {
  const matches = new Map(matched.map(specialist => [specialist.id, specialist]));
  if (restrictToAvailable) {
    return available.map(specialist => {
      const match = matches.get(specialist.id);
      return match ? { ...specialist, affinityPercentage: match.affinityPercentage, tags: match.tags } : specialist;
    });
  }
  return [...matched, ...available.filter(specialist => !matches.has(specialist.id))];
}
