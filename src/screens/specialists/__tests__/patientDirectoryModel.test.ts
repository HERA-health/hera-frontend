import { patientDirectoryCards, searchAndSortPatientCards, toPatientDirectoryCard } from '../patientDirectoryModel';
import type { SpecialistData } from '../../../services/specialistsService';
jest.mock('../../../services/specialistsService', () => ({
  normalizeSpecialistDescription: (value: string) => value,
  resolveSpecialistAvatar: (value: SpecialistData) => value.avatar,
}));
const specialist = (id: string, overrides: Partial<SpecialistData> = {}): SpecialistData => ({
  id, userId: `user-${id}`, user: { name: 'Elena Martín' }, avatar: null, specialization: 'Psicología',
  professionalType: 'PSYCHOLOGIST_HEALTH', professionalTypeLabel: 'Psicóloga sanitaria', description: 'Acompañamiento',
  rating: 0, reviewCount: 0, firstVisitFree: false, pricePerSession: 40, matchedOptionId: 'online',
  matchingProfile: { specialties: ['anxiety'], therapeuticApproach: ['cbt'] },
  publicOptions: [
    { specialistId: id, optionId: 'online', modality: 'VIDEO_CALL', durationMinutes: 30, priceCents: 4000 },
    { specialistId: id, optionId: 'phone', modality: 'PHONE_CALL', durationMinutes: 45, priceCents: 5500 },
    { specialistId: id, optionId: 'office', modality: 'IN_PERSON', durationMinutes: 60, priceCents: 8000 },
  ], ...overrides,
});

test('recommendations cannot restore an excluded profile or an incompatible session', () => {
  const cards = patientDirectoryCards([specialist('one')], [specialist('excluded'), specialist('one')], { modality: 'IN_PERSON' });
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ id: 'one', matchedOptionId: 'office', pricePerSession: 80, matchOrder: undefined });
  expect(cards[0].publicOptions).toEqual([expect.objectContaining({ optionId: 'office', durationMinutes: 60 })]);
});
test('keeps a compatible recommended option and its price instead of the cheapest unrelated offer', () => {
  const [card] = patientDirectoryCards([specialist('one')], [specialist('one', { matchedOptionId: 'phone' })], { maxPrice: 60 });
  expect(card).toMatchObject({ matchOrder: 0, matchedOptionId: 'phone', pricePerSession: 55 });
  const [limited] = patientDirectoryCards([specialist('one')], [specialist('one', { matchedOptionId: 'phone' })], { maxPrice: 50 });
  expect(limited).toMatchObject({ matchOrder: undefined, matchedOptionId: 'online', pricePerSession: 40 });
});
test('searches accent-insensitive names, human specialty labels and custom approaches', () => {
  const card = toPatientDirectoryCard(specialist('one', { matchingProfile: { specialties: ['anxiety'], customTherapeuticApproaches: ['Terapia de aceptación'] } }));
  for (const query of ['MARTIN', 'ansiedad', 'aceptacion', 'psicologa']) expect(searchAndSortPatientCards([card], query, 'name')).toHaveLength(1);
  expect(searchAndSortPatientCards([card], 'ausente', 'name')).toEqual([]);
});
test('omits unavailable credentials and does not mutate the source while sorting', () => {
  const source = [toPatientDirectoryCard(specialist('expensive', { pricePerSession: 80 })), toPatientDirectoryCard(specialist('cheap'))];
  expect(source[0]).toMatchObject({ collegiateNumber: null, yearsInPractice: null });
  expect(searchAndSortPatientCards(source, '', 'price_low').map(item => item.id)).toEqual(['cheap', 'expensive']);
  expect(source[0].id).toBe('expensive');
});

test('favorites sort keeps every eligible result, prioritizes saved profiles and respects search', () => {
  const cards = ['Ana', 'Zoe', 'Bea'].map(name => toPatientDirectoryCard(specialist(name, { user: { name } })));
  expect(searchAndSortPatientCards(cards, '', 'favorites', ['Zoe', 'Bea', 'excluded']).map(card => card.id)).toEqual(['Bea', 'Zoe', 'Ana']);
  expect(searchAndSortPatientCards(cards, '', 'favorites', []).map(card => card.id)).toEqual(['Ana', 'Bea', 'Zoe']);
  expect(searchAndSortPatientCards(cards, 'Ana', 'favorites', ['Zoe']).map(card => card.id)).toEqual(['Ana']);
  expect(cards.map(card => card.id)).toEqual(['Ana', 'Zoe', 'Bea']);
});
