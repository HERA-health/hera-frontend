import { getMatchingCompletionDescription } from '../profileCompletionCopy';

describe('getMatchingCompletionDescription', () => {
  it.each([
    [[], [], [], 'Añade o revisa al menos una especialidad, un enfoque terapéutico y un idioma.'],
    [['anxiety'], [], [], 'Añade o revisa al menos un enfoque terapéutico y un idioma.'],
    [['anxiety'], ['cbt'], [], 'Añade o revisa al menos un idioma.'],
    [[], ['cbt'], ['spanish'], 'Añade o revisa al menos una especialidad.'],
  ])('describes only the missing matching selections', (
    specialties,
    therapeuticApproaches,
    languages,
    expected,
  ) => {
    expect(getMatchingCompletionDescription({
      specialties,
      therapeuticApproaches,
      languages,
    })).toBe(expected);
  });

  it('asks the user to save when all matching selections are complete locally', () => {
    expect(getMatchingCompletionDescription({
      specialties: ['anxiety'],
      therapeuticApproaches: ['cbt'],
      languages: ['spanish'],
    })).toBe(
      'Ya has completado esta información. Guarda los cambios para actualizar el estado del perfil.',
    );
  });
});
