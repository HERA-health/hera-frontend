interface MatchingSelectionState {
  customSpecialties?: readonly string[]; customTherapeuticApproaches?: readonly string[];
  specialties: readonly string[];
  therapeuticApproaches: readonly string[];
  matchingNeedsReview: boolean;
}

export const getMatchingCompletionDescription = ({
  specialties, customSpecialties = [], customTherapeuticApproaches = [],
  therapeuticApproaches,
  matchingNeedsReview,
}: MatchingSelectionState): string | null => {
  const missingSelections = [
    specialties.length + customSpecialties.length === 0 ? 'una especialidad' : null,
    therapeuticApproaches.length + customTherapeuticApproaches.length === 0 ? 'un enfoque terapéutico' : null,
  ].filter((value): value is string => value !== null);

  if (missingSelections.length) return `Añade al menos ${missingSelections.join(' y ')}.`;
  return matchingNeedsReview ? 'Revisa tus especialidades y enfoques, marca la casilla de revisión y guarda los cambios.' : null;
};
