import { getMatchingCompletionDescription } from '../profileCompletionCopy';

describe('getMatchingCompletionDescription', () => {
  it.each([
    [[], [], 'Añade al menos una especialidad y un enfoque terapéutico.'],
    [['anxiety'], [], 'Añade al menos un enfoque terapéutico.'],
    [[], ['cbt'], 'Añade al menos una especialidad.'],
  ])('describes only the missing matching selections', (
    specialties,
    therapeuticApproaches,
    expected,
  ) => {
    expect(getMatchingCompletionDescription({
      specialties,
      therapeuticApproaches,
      matchingNeedsReview: false,
    })).toBe(expected);
  });

  it('keeps the practice card clear when only the language is missing', () => {
    expect(getMatchingCompletionDescription({
      specialties: ['anxiety'],
      therapeuticApproaches: ['cbt'],
      matchingNeedsReview: false,
    })).toBeNull();
  });

  it('explains the required acknowledgement for migrated selections', () => {
    expect(getMatchingCompletionDescription({specialties: ['anxiety'], therapeuticApproaches: ['cbt'], matchingNeedsReview: true})).toContain('casilla de revisión');
  });
});
