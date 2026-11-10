import type { PublicSpecialistDirectoryCard, SpecialistData, SpecialistFilters } from '../../services/specialistsService';
import { normalizeSpecialistDescription, resolveSpecialistAvatar } from '../../services/specialistsService';
import { getProfessionalTypeLabel } from '../../constants/professionalTypes';
import { matchingChoiceLabel, PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS } from '../../constants/professionalMatchingOptions';
import { optionSearchKey } from '../../utils/profileOptions';

export type PatientDirectorySort = 'recommended' | 'favorites' | 'name' | 'rating' | 'price_low' | 'price_high' | 'distance';
export interface PatientDirectoryCard extends PublicSpecialistDirectoryCard {
  distance?: number;
  matchOrder?: number;
}
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string') : [];

export function toPatientDirectoryCard(specialist: SpecialistData): PatientDirectoryCard {
  const profile = specialist.matchingProfile;
  return {
    id: specialist.id, publicSlug: specialist.publicSlug, name: specialist.user.name,
    avatar: resolveSpecialistAvatar(specialist), specialization: specialist.specialization,
    professionalType: specialist.professionalType,
    professionalTypeLabel: getProfessionalTypeLabel(specialist.professionalType, specialist.professionalTypeLabel),
    pricePerSession: specialist.pricePerSession, publicOptions: specialist.publicOptions,
    matchedOptionId: specialist.matchedOptionId,
    offersOnline: specialist.offersOnline === true, offersInPerson: specialist.offersInPerson === true,
    offersPhone: specialist.offersPhone === true, officeCity: specialist.officeCity ?? null,
    yearsInPractice: specialist.yearsInPractice ?? null, collegiateNumber: specialist.collegiateNumber ?? null,
    gradientId: specialist.gradientId ?? null, rating: specialist.rating, reviewCount: specialist.reviewCount,
    descriptionExcerpt: normalizeSpecialistDescription(specialist.description),
    specialties: strings(profile?.specialties), customSpecialties: strings(profile?.customSpecialties),
    therapeuticApproaches: strings(profile?.therapeuticApproach),
    customTherapeuticApproaches: strings(profile?.customTherapeuticApproaches),
    languages: specialist.languagesSpoken ?? strings(profile?.language),
    religionCode: specialist.religionCode, religionOtherText: specialist.religionOtherText,
    distance: specialist.distance,
  };
}

/** The server result owns eligibility; recommendations only enrich eligible profiles. */
export function patientDirectoryCards(available: SpecialistData[], matched: SpecialistData[], filters: SpecialistFilters): PatientDirectoryCard[] {
  const matches = new Map(matched.map((item, index) => [item.id, { item, index }]));
  const modality = filters.near ? 'IN_PERSON' : filters.modality === 'ONLINE' ? 'VIDEO_CALL' : filters.modality;
  return available.map(item => {
    const match = matches.get(item.id);
    const options = item.publicOptions?.filter(option => (!modality || option.modality === modality)
      && (filters.maxPrice === undefined || option.priceCents <= Math.round(filters.maxPrice * 100)));
    const recommended = match?.item.matchedOptionId
      ? options?.find(option => option.optionId === match.item.matchedOptionId) : undefined;
    const cheapest = options?.reduce<(typeof options)[number] | undefined>((best, option) => !best || option.priceCents < best.priceCents ? option : best, undefined);
    const selected = recommended ?? cheapest;
    return {
      ...toPatientDirectoryCard(item),
      ...(selected ? { matchedOptionId: selected.optionId, pricePerSession: selected.priceCents / 100 } : {}),
      // Restrict price/duration presentation to the same eligible offers.
      publicOptions: options,
      matchOrder: recommended ? match?.index : undefined,
    };
  });
}

export function searchAndSortPatientCards(cards: PatientDirectoryCard[], query: string, sort: PatientDirectorySort, favoriteIds: readonly string[] = []) {
  const favorites = new Set(favoriteIds);
  const key = optionSearchKey(query.trim());
  const result = cards.filter(card => !key || optionSearchKey([
    card.name, card.professionalTypeLabel, card.specialization,
    ...card.specialties.map(value => matchingChoiceLabel(value, PROFESSIONAL_SPECIALTY_OPTIONS)),
    ...(card.customSpecialties ?? []),
    ...(card.therapeuticApproaches ?? []).map(value => matchingChoiceLabel(value, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS)),
    ...(card.customTherapeuticApproaches ?? []),
  ].join(' ')).includes(key));
  return result.sort((a, b) => {
    const byName = a.name.localeCompare(b.name, 'es');
    switch (sort) {
      case 'favorites': return Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || byName;
      case 'recommended': return (a.matchOrder ?? Infinity) - (b.matchOrder ?? Infinity) || byName;
      case 'rating': return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || byName;
      case 'price_low': return a.pricePerSession - b.pricePerSession || byName;
      case 'price_high': return b.pricePerSession - a.pricePerSession || byName;
      case 'distance': return (a.distance ?? Infinity) - (b.distance ?? Infinity) || byName;
      default: return byName;
    }
  });
}
