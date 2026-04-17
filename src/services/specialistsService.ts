import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import type { Specialist } from '../screens/specialist-profile/types';

const SPECIALISTS_CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

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
  officeAddress?: string | null;
  officeCity?: string | null;
  officePostalCode?: string | null;
  officeLat?: number | null;
  officeLng?: number | null;
  offersOnline?: boolean;
  offersInPerson?: boolean;
  matchingProfile?: Record<string, unknown>;
  distance?: number;
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

export interface SpecialistFilters {
  specialization?: string;
  minRating?: number;
  maxPrice?: number;
  firstVisitFree?: boolean;
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

const matchedSpecialistsCache = new Map<string, CacheEntry<MatchedSpecialistsResponse>>();
const matchedSpecialistsRequests = new Map<string, Promise<MatchedSpecialistsResponse>>();
const publicSpecialistsCache = new Map<string, CacheEntry<SpecialistData[]>>();
const publicSpecialistsRequests = new Map<string, Promise<SpecialistData[]>>();

const getFreshCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.data;
};

const setCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): T => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + SPECIALISTS_CACHE_TTL_MS,
  });

  return data;
};

const getAuthCacheKey = (): string => {
  const commonHeaders = api.defaults.headers.common as unknown as Record<string, string | undefined>;
  return commonHeaders.Authorization || 'anonymous';
};

const buildSpecialistsQueryParams = (filters?: SpecialistFilters): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters?.specialization) params.append('specialization', filters.specialization);
  if (filters?.minRating) params.append('minRating', filters.minRating.toString());
  if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.firstVisitFree !== undefined) params.append('firstVisitFree', filters.firstVisitFree.toString());
  if (filters?.near) params.append('near', 'true');
  if (filters?.lat !== undefined) params.append('lat', filters.lat.toString());
  if (filters?.lng !== undefined) params.append('lng', filters.lng.toString());
  if (filters?.maxDistance !== undefined) params.append('maxDistance', filters.maxDistance.toString());
  if (filters?.inPersonOnly) params.append('inPersonOnly', 'true');

  return params;
};

const getMatchedCacheKey = (): string => `matched:${getAuthCacheKey()}`;

const getPublicSpecialistsCacheKey = (filters?: SpecialistFilters): string => {
  const queryString = buildSpecialistsQueryParams(filters).toString();
  return `public:${queryString}`;
};

export const invalidateSpecialistsCache = (): void => {
  matchedSpecialistsCache.clear();
  matchedSpecialistsRequests.clear();
  publicSpecialistsCache.clear();
  publicSpecialistsRequests.clear();
};

/**
 * Maps a raw API SpecialistData response to the Specialist profile shape
 * used by the UI components. Pure function - no side effects.
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
  const cacheKey = getMatchedCacheKey();
  const cached = getFreshCache(matchedSpecialistsCache, cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = matchedSpecialistsRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = api
    .get<{ success: boolean; data: MatchedSpecialistsResponse }>('/specialists/matched/for-me')
    .then((response) => setCache(matchedSpecialistsCache, cacheKey, response.data.data))
    .catch((error: unknown) => {
      throw new Error(getErrorMessage(error, 'Error al cargar especialistas recomendados'));
    })
    .finally(() => {
      matchedSpecialistsRequests.delete(cacheKey);
    });

  matchedSpecialistsRequests.set(cacheKey, request);
  return request;
};

/**
 * Gets all specialists (public endpoint, no auth required)
 * Supports optional filters including proximity-based filtering
 */
export const getAllSpecialists = async (filters?: SpecialistFilters): Promise<SpecialistData[]> => {
  const cacheKey = getPublicSpecialistsCacheKey(filters);
  const cached = getFreshCache(publicSpecialistsCache, cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = publicSpecialistsRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const queryString = buildSpecialistsQueryParams(filters).toString();
  const url = `/specialists${queryString ? `?${queryString}` : ''}`;

  const request = api
    .get<{ success: boolean; data: SpecialistData[] }>(url)
    .then((response) => setCache(publicSpecialistsCache, cacheKey, response.data.data))
    .catch((error: unknown) => {
      throw new Error(getErrorMessage(error, 'Error al cargar especialistas'));
    })
    .finally(() => {
      publicSpecialistsRequests.delete(cacheKey);
    });

  publicSpecialistsRequests.set(cacheKey, request);
  return request;
};

/**
 * Gets detailed information about a specific specialist
 */
export const getSpecialistDetails = async (specialistId: string): Promise<SpecialistData> => {
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
