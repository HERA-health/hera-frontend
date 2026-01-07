import { api } from './api';
import { getErrorMessage } from '../constants/errors';

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
}

export interface MatchedSpecialistsResponse {
  specialists: SpecialistData[];
  hasCompletedQuestionnaire: boolean;
}

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
 * Supports optional filters: specialization, minRating, maxPrice, firstVisitFree
 */
export const getAllSpecialists = async (filters?: {
  specialization?: string;
  minRating?: number;
  maxPrice?: number;
  firstVisitFree?: boolean;
}): Promise<SpecialistData[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.specialization) params.append('specialization', filters.specialization);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.firstVisitFree !== undefined) params.append('firstVisitFree', filters.firstVisitFree.toString());

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
