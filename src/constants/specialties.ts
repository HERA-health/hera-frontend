import {matchingChoiceLabel, PROFESSIONAL_SPECIALTY_OPTIONS} from './professionalMatchingOptions';
export const SPECIALTY_TRANSLATIONS: Readonly<Record<string, string>> = Object.fromEntries(PROFESSIONAL_SPECIALTY_OPTIONS.map(option => [option.value, option.label]));
export const translateSpecialty = (value: string): string => matchingChoiceLabel(value, PROFESSIONAL_SPECIALTY_OPTIONS);
