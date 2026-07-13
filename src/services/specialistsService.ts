import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import type { Specialist } from '../screens/specialist-profile/types';
import type { ProfessionalType } from '../constants/professionalTypes';
import type {
  ProfessionalSpecialtyValue,
  ProfessionalTherapeuticApproachValue,
} from '../constants/professionalMatchingOptions';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const SPECIALISTS_CACHE_TTL_MS = 30_000;
const LEGACY_DEFAULT_SPECIALIST_DESCRIPTION = 'new professional';
const DEFAULT_SPECIALIST_DESCRIPTION = 'Nuevo especialista en HERA';
const LEGACY_DEFAULT_LANGUAGE = 'english';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface SpecialistData {
  id: string;
  userId: string;
  specialization: string;
  professionalType: ProfessionalType | null;
  professionalTypeLabel: string;
  description: string;
  pricePerSession: number;
  rating: number;
  reviewCount: number;
  firstVisitFree: boolean;
  avatar: string | null;
  user: {
    name: string;
    avatar?: string | null;
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
  photoGallery?: string[];
  presentationVideoUrl?: string | null;
  yearsInPractice?: number | null;
  languagesSpoken?: string[];
  education?: Array<{ id: string; degree: string; institution: string; startYear: string; endYear: string }>;
  experience?: Array<{ id: string; position: string; organization: string; startYear: string; endYear?: string | null; current?: boolean }>;
  certificates?: Array<{
    id: string;
    name: string;
    issuer?: string;
    validUntil?: string | null;
    educationId?: string | null;
    mimeType?: string | null;
    documentUrl?: string;
    previewUrl?: string;
  }>;
  slotDuration?: number | null;
  nextAvailable?: string | null;
  verificationStatus?: string;
  collegiateNumber?: string;
  professionalTitle?: string | null;
  reviews?: Array<{ id: string; rating: number; text: string; authorName: string; date: string }>;
}

export interface SpecialistFilters {
  specialization?: string;
  professionalType?: ProfessionalType;
  minRating?: number;
  maxPrice?: number;
  firstVisitFree?: boolean;
  near?: boolean;
  lat?: number;
  lng?: number;
  maxDistance?: number;
  inPersonOnly?: boolean;
}

export interface PublicSpecialistProfileData {
  id: string;
  isPubliclyListed: boolean;
  specialization: string;
  professionalType: ProfessionalType | null;
  professionalTypeLabel: string;
  description: string;
  pricePerSession: number;
  rating: number | null;
  reviewCount: number | null;
  firstVisitFree: boolean;
  matchingProfile: Record<string, unknown>;
  avatar: string | null;
  user: {
    name: string;
    avatar?: string | null;
  };
  officeAddress?: string | null;
  officeCity?: string | null;
  officePostalCode?: string | null;
  officeLat?: number | null;
  officeLng?: number | null;
  offersOnline: boolean;
  offersInPerson: boolean;
  professionalTitle?: string | null;
  education?: SpecialistData['education'];
  experience?: SpecialistData['experience'];
  certificates?: SpecialistData['certificates'];
  verificationStatus?: string;
  collegiateNumber?: string | null;
  gradientId?: string;
  photoGallery?: string[];
  presentationVideoUrl?: string | null;
  yearsInPractice?: number | null;
  languagesSpoken?: string[];
  slotDuration?: number | null;
  nextAvailable?: string | null;
  reviews: NonNullable<SpecialistData['reviews']>;
}

export type PublicSpecialistModality = 'ONLINE' | 'IN_PERSON';
export type PublicSpecialistDirectorySort =
  | 'RECENT'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'RATING_DESC'
  | 'REVIEWS_DESC';

export interface PublicSpecialistCard {
  id: string;
  name: string;
  avatar: string | null;
  specialization: string;
  professionalType: ProfessionalType | null;
  professionalTypeLabel: string;
  pricePerSession: number;
  offersOnline: boolean;
  offersInPerson: boolean;
  yearsInPractice: number | null;
  gradientId: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export interface PublicSpecialistDirectoryCard extends PublicSpecialistCard {
  collegiateNumber: string | null;
  specialties: string[];
}

export interface PublicSpecialistDirectoryFilters {
  q?: string;
  professionalType?: ProfessionalType;
  modality?: PublicSpecialistModality;
  specialties?: readonly ProfessionalSpecialtyValue[];
  approaches?: readonly ProfessionalTherapeuticApproachValue[];
  minRating?: number;
  maxPrice?: number;
  sort?: PublicSpecialistDirectorySort;
  page?: number;
}

export interface PublicSpecialistDirectoryPage {
  items: PublicSpecialistDirectoryCard[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface MatchedSpecialistsResponse {
  specialists: SpecialistData[];
  hasCompletedQuestionnaire: boolean;
  needsQuestionnaireRefresh?: boolean;
}

export interface PrimarySpecialistSessionContext {
  id: string;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  type: 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';
}

export interface PrimarySpecialistResponse {
  specialist: SpecialistData;
  session: PrimarySpecialistSessionContext;
}

export interface SpecialistPersonalizationResponse {
  primarySpecialist: PrimarySpecialistResponse | null;
  favoriteSpecialists: SpecialistData[];
  favoriteSpecialistIds: string[];
}

const matchedSpecialistsCache = new Map<string, CacheEntry<MatchedSpecialistsResponse>>();
const matchedSpecialistsRequests = new Map<string, Promise<MatchedSpecialistsResponse>>();
const publicSpecialistsCache = new Map<string, CacheEntry<SpecialistData[]>>();
const publicSpecialistsRequests = new Map<string, Promise<SpecialistData[]>>();
const featuredSpecialistsRequests = new Map<string, Promise<PublicSpecialistCard[]>>();
const publicDirectoryRequests = new Map<string, Promise<PublicSpecialistDirectoryPage>>();

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

const setCache = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttlMs: number = SPECIALISTS_CACHE_TTL_MS
): T => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
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
  if (filters?.professionalType) params.append('professionalType', filters.professionalType);
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

const buildPublicDirectoryQueryParams = (
  filters?: PublicSpecialistDirectoryFilters
): URLSearchParams => {
  const params = new URLSearchParams();
  const query = filters?.q?.trim();

  if (query && query.length >= 2) params.append('q', query);
  if (filters?.professionalType) params.append('professionalType', filters.professionalType);
  if (filters?.modality) params.append('modality', filters.modality);
  filters?.specialties?.forEach((specialty) => params.append('specialty', specialty));
  filters?.approaches?.forEach((approach) => params.append('approach', approach));
  if (filters?.minRating !== undefined) params.append('minRating', filters.minRating.toString());
  if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.sort && filters.sort !== 'RECENT') params.append('sort', filters.sort);
  if (filters?.page && filters.page > 1) params.append('page', filters.page.toString());

  return params;
};

const getPublicDirectoryCacheKey = (filters?: PublicSpecialistDirectoryFilters): string =>
  `directory:${buildPublicDirectoryQueryParams(filters).toString()}`;

export const invalidateSpecialistsCache = (): void => {
  matchedSpecialistsCache.clear();
  matchedSpecialistsRequests.clear();
  publicSpecialistsCache.clear();
  publicSpecialistsRequests.clear();
  featuredSpecialistsRequests.clear();
  publicDirectoryRequests.clear();
};

export const normalizeSpecialistDescription = (description?: string | null): string => {
  const trimmedDescription = description?.trim();

  if (!trimmedDescription) {
    return DEFAULT_SPECIALIST_DESCRIPTION;
  }

  if (trimmedDescription.toLowerCase() === LEGACY_DEFAULT_SPECIALIST_DESCRIPTION) {
    return DEFAULT_SPECIALIST_DESCRIPTION;
  }

  return trimmedDescription;
};

export const normalizeSpecialistLanguages = (languages: unknown): string[] => {
  if (!Array.isArray(languages)) {
    return [];
  }

  const cleanedLanguages = languages
    .filter((language): language is string => typeof language === 'string')
    .map((language) => language.trim())
    .filter(Boolean);

  if (
    cleanedLanguages.length === 1
    && cleanedLanguages[0].toLowerCase() === LEGACY_DEFAULT_LANGUAGE
  ) {
    return ['spanish'];
  }

  return cleanedLanguages;
};

export const resolveSpecialistAvatar = (
  specialist: Pick<SpecialistData, 'avatar' | 'user'>
): string | null => specialist.user.avatar ?? specialist.avatar ?? null;

export const resolvePublicSpecialistDocumentUrl = (documentUrl: string): string => {
  if (/^https?:\/\//i.test(documentUrl)) {
    return documentUrl;
  }

  const baseUrl = String(api.defaults.baseURL ?? '').replace(/\/$/, '');
  const apiOrigin = baseUrl.replace(/\/api$/, '');

  if (documentUrl.startsWith('/')) {
    return `${apiOrigin}${documentUrl}`;
  }

  return `${baseUrl}/${documentUrl}`;
};

const openPublicDocumentUrl = async (url: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
    return;
  }

  await WebBrowser.openBrowserAsync(url);
};

/**
 * Maps a raw API SpecialistData response to the Specialist profile shape
 * used by the UI components. Pure function - no side effects.
 */
export function mapSpecialistToProfile(data: SpecialistData): Specialist;
export function mapSpecialistToProfile(data: Omit<SpecialistData, 'userId'>): Specialist;
export function mapSpecialistToProfile(data: Omit<SpecialistData, 'userId'>): Specialist {
  const mp = data.matchingProfile as Record<string, unknown> | undefined;
  return {
    id: data.id,
    name: data.user.name,
    title: data.professionalTitle || data.specialization,
    professionalType: data.professionalType,
    professionalTypeLabel: data.professionalTypeLabel,
    avatar: resolveSpecialistAvatar(data) ?? undefined,
    bio: normalizeSpecialistDescription(data.description),
    rating: data.rating,
    reviewCount: data.reviewCount,
    pricePerSession: data.pricePerSession,
    specializations: (mp?.specialties as string[]) || [],
    experienceYears: (mp?.experienceYears as number) || 0,
    therapeuticApproach: Array.isArray(mp?.therapeuticApproach)
      ? (mp.therapeuticApproach as string[]).join(', ')
      : (mp?.therapeuticApproach as string) || undefined,
    languages: normalizeSpecialistLanguages(mp?.language),
    sessionTypes: (() => {
      const types: ('VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL')[] = [];
      if (data.offersOnline !== false) types.push('VIDEO_CALL');
      if (data.offersInPerson === true) types.push('IN_PERSON');
      return types;
    })(),
    education: data.education ?? [],
    experience: data.experience ?? [],
    certifications: (data.certificates ?? []).map((certificate) => ({
      ...certificate,
      documentUrl: certificate.documentUrl
        ? resolvePublicSpecialistDocumentUrl(certificate.documentUrl)
        : undefined,
      previewUrl: certificate.previewUrl
        ? resolvePublicSpecialistDocumentUrl(certificate.previewUrl)
        : undefined,
    })),
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
    photoGallery: data.photoGallery || [],
    presentationVideoUrl: data.presentationVideoUrl || null,
    yearsInPractice: data.yearsInPractice ?? null,
    languagesSpoken: data.languagesSpoken || [],
    verificationStatus: data.verificationStatus || undefined,
    firstVisitFree: data.firstVisitFree || false,
    collegiateNumber: data.collegiateNumber || undefined,
  };
}

export const mapPublicSpecialistToProfile = (data: PublicSpecialistProfileData): Specialist =>
  ({
    ...mapSpecialistToProfile({
      ...data,
      rating: data.rating ?? 0,
      reviewCount: data.reviewCount ?? 0,
      collegiateNumber: data.collegiateNumber ?? undefined,
    }),
    isPubliclyListed: data.isPubliclyListed,
  });

export const openPublicCertificateDocument = async (
  specialistId: string,
  certificateId: string,
  _mimeType?: string | null,
  documentUrl?: string
): Promise<void> => {
  try {
    const fallbackDocumentUrl =
      `/api/specialists/${encodeURIComponent(specialistId)}/certificates/${encodeURIComponent(certificateId)}/document`;
    const requestUrl = resolvePublicSpecialistDocumentUrl(documentUrl ?? fallbackDocumentUrl);

    await openPublicDocumentUrl(requestUrl);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo abrir el certificado.'));
  }
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
 * Gets the compact daily specialist window used below the landing hero.
 * It deliberately stays separate from the full authenticated directory data.
 */
export const getFeaturedSpecialists = async (): Promise<PublicSpecialistCard[]> => {
  const cacheKey = 'featured';
  const inFlight = featuredSpecialistsRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = api
    .get<{ success: boolean; data: PublicSpecialistCard[] }>('/specialists/featured')
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      throw new Error(getErrorMessage(error, 'No se pudieron cargar los especialistas destacados'));
    })
    .finally(() => {
      featuredSpecialistsRequests.delete(cacheKey);
    });

  featuredSpecialistsRequests.set(cacheKey, request);
  return request;
};

/**
 * Gets a paginated, unauthenticated specialist directory without matching,
 * favourites or any patient-specific enhancement.
 */
export const getPublicSpecialistDirectory = async (
  filters?: PublicSpecialistDirectoryFilters
): Promise<PublicSpecialistDirectoryPage> => {
  const cacheKey = getPublicDirectoryCacheKey(filters);
  const inFlight = publicDirectoryRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const queryString = buildPublicDirectoryQueryParams(filters).toString();
  const url = `/specialists/directory${queryString ? `?${queryString}` : ''}`;
  const request = api
    .get<{ success: boolean; data: PublicSpecialistDirectoryPage }>(url)
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      throw new Error(getErrorMessage(error, 'No se pudo cargar el directorio de especialistas'));
    })
    .finally(() => {
      publicDirectoryRequests.delete(cacheKey);
    });

  publicDirectoryRequests.set(cacheKey, request);
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

/**
 * Gets the privacy-minimized, unauthenticated view of a public specialist.
 */
export const getPublicSpecialistDetails = async (
  specialistId: string
): Promise<PublicSpecialistProfileData> => {
  if (!specialistId || specialistId === 'undefined' || specialistId === 'null' || specialistId.trim() === '') {
    throw new Error('Invalid specialist ID: Cannot fetch public details for undefined or null specialist');
  }

  try {
    const response = await api.get<{ success: boolean; data: PublicSpecialistProfileData }>(
      `/specialists/public/${encodeURIComponent(specialistId)}`
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al cargar el perfil público del especialista'));
  }
};

export const getSpecialistPersonalization = async (): Promise<SpecialistPersonalizationResponse> => {
  try {
    const response = await api.get<{ success: boolean; data: SpecialistPersonalizationResponse }>(
      '/specialists/me/personalization'
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al cargar tus especialistas'));
  }
};

export const addFavoriteSpecialist = async (specialistId: string): Promise<void> => {
  try {
    await api.post(`/specialists/${specialistId}/favorite`);
    invalidateSpecialistsCache();
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo guardar el favorito'));
  }
};

export const removeFavoriteSpecialist = async (specialistId: string): Promise<void> => {
  try {
    await api.delete(`/specialists/${specialistId}/favorite`);
    invalidateSpecialistsCache();
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo quitar el favorito'));
  }
};
