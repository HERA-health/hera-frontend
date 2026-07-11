interface MatchingSelectionState {
  specialties: readonly string[];
  therapeuticApproaches: readonly string[];
  languages: readonly string[];
}

const joinSpanishList = (items: string[]): string => {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
};

export const getMatchingCompletionDescription = ({
  specialties,
  therapeuticApproaches,
  languages,
}: MatchingSelectionState): string => {
  const missingSelections = [
    specialties.length === 0 ? 'una especialidad' : null,
    therapeuticApproaches.length === 0 ? 'un enfoque terapéutico' : null,
    languages.length === 0 ? 'un idioma' : null,
  ].filter((value): value is string => value !== null);

  if (missingSelections.length === 0) {
    return 'Ya has completado esta información. Guarda los cambios para actualizar el estado del perfil.';
  }

  return `Añade o revisa al menos ${joinSpanishList(missingSelections)}.`;
};
