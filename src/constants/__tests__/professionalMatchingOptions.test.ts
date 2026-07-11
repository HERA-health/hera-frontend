import {
  PROFESSIONAL_LANGUAGE_OPTIONS,
  PROFESSIONAL_SPECIALTY_OPTIONS,
  PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,
} from '../professionalMatchingOptions';

describe('professional matching option contract', () => {
  it('keeps the canonical values aligned with the backend contract', () => {
    expect(PROFESSIONAL_SPECIALTY_OPTIONS.map(({ value }) => value)).toEqual([
      'anxiety', 'depression', 'couples', 'trauma', 'self-esteem',
      'grief', 'addiction', 'eating', 'sleep', 'phobias',
    ]);
    expect(PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS.map(({ value }) => value)).toEqual([
      'cbt', 'act', 'emdr', 'psychodynamic', 'humanistic',
      'systemic', 'mindfulness', 'gestalt',
    ]);
    expect(PROFESSIONAL_LANGUAGE_OPTIONS.map(({ value }) => value)).toEqual([
      'spanish', 'english', 'catalan', 'french', 'german', 'portuguese',
    ]);
  });
});
