import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import type { Specialist } from '../screens/specialist-profile/types';

export interface SpecialistData {
  id: string;
  userId: string;
  specialization: string;
  description: string;
  pricePerSession: number;
  rating: number;
  reviewCount: number;
  firstVisitFree: boolean;
  avatar: string | null;
  user: {
    name: string;
    email: string;
  };
  affinity?: number;
  matchedAttributes?: string[];
  // Location fields
  officeAddress?: string | null;
  officeCity?: string | null;
  officePostalCode?: string | null;
  officeLat?: number | null;
  officeLng?: number | null;
  offersOnline?: boolean;
  offersInPerson?: boolean;
  matchingProfile?: Record<string, unknown>;
  // Distance (calculated by backend when proximity filter is used)
  distance?: number; // in km
  // New profile fields
  gradientId?: string;
  personalMotto?: string | null;
  photoGallery?: string[];
  presentationVideoUrl?: string | null;
  yearsInPractice?: number | null;
  languagesSpoken?: string[];
  education?: Array<{ id: string; degree: string; institution: string; startYear: string; endYear: string }>;
  experience?: Array<{ id: string; position: string; organization: string; startYear: string; endYear?: string | null; current?: boolean }>;
  certificates?: Array<{ id: string; name: string; issuer?: string; validUntil?: string | null }>;
  slotDuration?: number | null;
  nextAvailable?: string | null;
  verificationStatus?: string;
  collegiateNumber?: string;
  reviews?: Array<{ id: string; rating: number; text: string; authorName: string; date: string }>;
}

// Filters for getAllSpecialists
export interface SpecialistFilters {
  specialization?: string;
  minRating?: number;
  maxPrice?: number;
  firstVisitFree?: boolean;
  // Proximity filters
  near?: boolean;
  lat?: number;
  lng?: number;
  maxDistance?: number;
  inPersonOnly?: boolean;
}

export interface MatchedSpecialistsResponse {
  specialists: SpecialistData[];
  hasCompletedQuestionnaire: boolean;
}

/**
 * Maps a raw API SpecialistData response to the Specialist profile shape
 * used by the UI components. Pure function — no side effects.
 */
export const mapSpecialistToProfile = (data: SpecialistData): Specialist => {
  const mp = data.matchingProfile as Record<string, unknown> | undefined;
  return {
    id: data.id,
    name: data.user.name,
    title: data.specialization,
    avatar: data.avatar || undefined,
    bio: data.description,
    rating: data.rating,
    reviewCount: data.reviewCount,
    pricePerSession: data.pricePerSession,
    specializations: (mp?.specialties as string[]) || [],
    experienceYears: (mp?.experienceYears as number) || 0,
    therapeuticApproach: Array.isArray(mp?.therapeuticApproach)
      ? (mp.therapeuticApproach as string[]).join(', ')
      : (mp?.therapeuticApproach as string) || undefined,
    languages: (mp?.language as string[]) || [],
    sessionTypes: (() => {
      const types: ('VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL')[] = [];
      if (data.offersOnline !== false) types.push('VIDEO_CALL');
      if (data.offersInPerson === true) types.push('IN_PERSON');
      const formats = (mp?.format as string[]) || [];
      if (formats.includes('in-person') && !types.includes('IN_PERSON')) types.push('IN_PERSON');
      if (formats.includes('hybrid') && !types.includes('IN_PERSON')) types.push('IN_PERSON');
      return types.length > 0 ? types : ['VIDEO_CALL'];
    })(),
    education: data.education ?? [],
    experience: data.experience ?? [],
    certifications: data.certificates ?? [],
    nextAvailable: data.nextAvailable ?? null,
    slotDuration: data.slotDuration ?? null,
    address: data.offersInPerson && data.officeAddress ? {
      street: data.officeAddress,
      city: data.officeCity || '',
      postalCode: data.officePostalCode || '',
      latitude: data.officeLat ?? undefined,
      longitude: data.officeLng ?? undefined,
    } : undefined,
    offersOnline: data.offersOnline ?? true,
    offersInPerson: data.offersInPerson ?? false,
    gradientId: data.gradientId || undefined,
    personalMotto: data.personalMotto || null,
    photoGallery: data.photoGallery || [],
    presentationVideoUrl: data.presentationVideoUrl || null,
    yearsInPractice: data.yearsInPractice ?? null,
    languagesSpoken: data.languagesSpoken || [],
    verificationStatus: data.verificationStatus || undefined,
    firstVisitFree: data.firstVisitFree || false,
    collegiateNumber: data.collegiateNumber || undefined,
  };
};

/**
 * Gets matched specialists for the current client with affinity scores
 * based on their questionnaire answers
 */
export const getMatchedSpecialists = async (): Promise<MatchedSpecialistsResponse> => {
  try {
    const response = await api.get<{ success: boolean; data: MatchedSpecialistsResponse }>('/specialists/matched/for-me');
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al cargar especialistas recomendados'));
  }
};

/**
 * Gets all specialists (public endpoint, no auth required)
 * Supports optional filters including proximity-based filtering
 */
export const getAllSpecialists = async (filters?: SpecialistFilters): Promise<SpecialistData[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.specialization) params.append('specialization', filters.specialization);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.firstVisitFree !== undefined) params.append('firstVisitFree', filters.firstVisitFree.toString());

    // Proximity filters
    if (filters?.near) params.append('near', 'true');
    if (filters?.lat !== undefined) params.append('lat', filters.lat.toString());
    if (filters?.lng !== undefined) params.append('lng', filters.lng.toString());
    if (filters?.maxDistance !== undefined) params.append('maxDistance', filters.maxDistance.toString());
    if (filters?.inPersonOnly) params.append('inPersonOnly', 'true');

    const queryString = params.toString();
    const url = `/specialists${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ success: boolean; data: SpecialistData[] }>(url);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al cargar especialistas'));
  }
};

/**
 * Gets detailed information about a specific specialist
 */
export const getSpecialistDetails = async (specialistId: string): Promise<SpecialistData> => {
  // Validate specialist ID before making API call
  if (!specialistId || specialistId === 'undefined' || specialistId === 'null' || specialistId.trim() === '') {
    throw new Error('Invalid specialist ID: Cannot fetch details for undefined or null specialist');
  }

  try {
    const response = await api.get<{ success: boolean; data: SpecialistData }>(`/specialists/${specialistId}`);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al cargar detalles del especialista'));
  }
};
