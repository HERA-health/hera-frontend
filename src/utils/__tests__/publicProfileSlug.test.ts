import {
  getPublicProfileSlugValidationMessage,
  normalizePublicProfileSlug,
  normalizePublicProfileSlugDraft,
} from '../publicProfileSlug';

describe('public profile slug utilities', () => {
  it('normalizes Spanish names into readable ASCII paths', () => {
    expect(normalizePublicProfileSlug(' Rubén Vallejo Jara ')).toBe('ruben-vallejo-jara');
    expect(normalizePublicProfileSlug('Mònica Fatsini Prats')).toBe('monica-fatsini-prats');
    expect(normalizePublicProfileSlug('Søren Straße')).toBe('soren-strasse');
    expect(normalizePublicProfileSlug('Ana 🧠 García')).toBe('ana-garcia');
  });

  it('keeps a trailing separator while the specialist is still typing', () => {
    expect(normalizePublicProfileSlugDraft('Rubén Vallejo-')).toBe('ruben-vallejo-');
    expect(normalizePublicProfileSlug('Rubén Vallejo-')).toBe('ruben-vallejo');
  });

  it('rejects reserved and internal-looking paths', () => {
    expect(getPublicProfileSlugValidationMessage('admin')).toBeTruthy();
    expect(getPublicProfileSlugValidationMessage('especialistas')).toBeTruthy();
    expect(
      getPublicProfileSlugValidationMessage('cm12345678901234567890123')
    ).toBeTruthy();
  });

  it('accepts a readable custom path', () => {
    expect(getPublicProfileSlugValidationMessage('ruben-vallejo-jara')).toBeNull();
  });
});
