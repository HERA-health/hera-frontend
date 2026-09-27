import type { Specialist } from '../../../constants/types';
import { affinityPercentage, combineSpecialistResults } from '../specialistDiscoveryResults';

const specialist = (id: string, overrides: Partial<Specialist> = {}): Specialist => ({
  id, name: id, initial: id, specialization: 'Psicología', rating: 5, reviewCount: 10,
  description: '', affinityPercentage: affinityPercentage(), tags: [], pricePerSession: 60, verified: true,
  matchingProfile: { therapeuticApproach: [], specialties: [], sessionStyle: '', personality: [],
    ageGroups: [], experienceYears: 0, language: ['spanish'], availability: '', format: [] },
  ...overrides,
});

test('filtered results retain questionnaire affinity without restoring excluded specialists', () => {
  const available = [specialist('included', { pricePerSession: 80, distance: 3 }), specialist('unmatched')];
  const matched = [specialist('excluded', { affinityPercentage: 100 }),
    specialist('included', { affinityPercentage: 65, tags: ['Especialidad coincidente'] })];
  const result = combineSpecialistResults(available, matched, true);
  expect(result.map(row => row.id)).toEqual(['included', 'unmatched']);
  expect(result[0]).toMatchObject({ affinityPercentage: 65, tags: ['Especialidad coincidente'], pricePerSession: 80, distance: 3 });
  expect(result[1].affinityPercentage).toBe(0);
});

test('unfiltered discovery preserves the matching order and removes duplicates', () => {
  const matched = [specialist('second'), specialist('first')];
  expect(combineSpecialistResults([specialist('first'), specialist('third')], matched, false).map(row => row.id))
    .toEqual(['second', 'first', 'third']);
});

test('missing and zero questionnaire scores never become rating percentages', () => {
  expect(affinityPercentage()).toBe(0);
  expect(affinityPercentage(0)).toBe(0);
  expect(affinityPercentage(65)).toBe(50);
});
