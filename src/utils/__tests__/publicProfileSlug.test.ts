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

  it('rejects reserved and internal-looking paths with useful guidance', () => {
    expect(getPublicProfileSlugValidationMessage('admin')).toBe(
      'Esta dirección está reservada. Prueba con otra, por ejemplo tu nombre y apellidos.'
    );
    expect(getPublicProfileSlugValidationMessage('especialistas')).toBe(
      'Esta dirección está reservada. Prueba con otra, por ejemplo tu nombre y apellidos.'
    );
    expect(
      getPublicProfileSlugValidationMessage('cm12345678901234567890123')
    ).toBe('Ese formato no se puede usar. Prueba con tu nombre y apellidos.');
  });

  it('explains invalid formats without technical terminology', () => {
    expect(getPublicProfileSlugValidationMessage('ab')).toBe(
      'Escribe al menos 3 caracteres para crear tu dirección.'
    );
    expect(getPublicProfileSlugValidationMessage('elena-martin-')).toBe(
      'La dirección debe empezar y terminar con una letra o un número. Usa solo letras, números y guiones.'
    );
  });

  it('accepts a readable custom path', () => {
    expect(getPublicProfileSlugValidationMessage('ruben-vallejo-jara')).toBeNull();
  });
});
