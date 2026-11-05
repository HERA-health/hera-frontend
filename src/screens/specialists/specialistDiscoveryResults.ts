import type { Specialist } from '../../constants/types';

export function combineSpecialistResults(
  available: Specialist[],
  matched: Specialist[],
  restrictToAvailable: boolean,
): Specialist[] {
  const matches = new Map(matched.map(specialist => [specialist.id, specialist]));
  if (restrictToAvailable) {
    return available.map(specialist => {
      const match = matches.get(specialist.id);
      const compatibleOptionRemains = match?.matchedOptionId && specialist.matchedOptionId === match.matchedOptionId;
      return match && compatibleOptionRemains ? { ...specialist, matchOrder: match.matchOrder, tags: match.tags, matchedOptionId: match.matchedOptionId, pricePerSession: match.pricePerSession, offersOnline: match.offersOnline, offersInPerson: match.offersInPerson } : specialist;
    });
  }
  return [...matched, ...available.filter(specialist => !matches.has(specialist.id))];
}
