import { api } from './api';

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
  console.log('📥 Fetching matched specialists from backend...');

  try {
    const response = await api.get<{ success: boolean; data: MatchedSpecialistsResponse }>('/specialists/matched/for-me');
    console.log('✅ Matched specialists fetched successfully:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching matched specialists:', error);
    console.error('Error response:', error.response?.data);
    throw error;
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
  console.log('📥 Fetching all specialists from backend...', filters);

  try {
    const params = new URLSearchParams();
    if (filters?.specialization) params.append('specialization', filters.specialization);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.firstVisitFree !== undefined) params.append('firstVisitFree', filters.firstVisitFree.toString());

    const queryString = params.toString();
    const url = `/specialists${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ success: boolean; data: SpecialistData[] }>(url);
    console.log('✅ All specialists fetched successfully:', response.data.data.length, 'specialists');
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching all specialists:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Gets detailed information about a specific specialist
 */
export const getSpecialistDetails = async (specialistId: string): Promise<SpecialistData> => {
  console.log('📥 ========== getSpecialistDetails ==========');
  console.log('📥 Specialist ID:', specialistId);
  console.log('📥 ID type:', typeof specialistId);
  console.log('📥 Called from:', new Error().stack?.split('\n')[2]?.trim());

  // Validate specialist ID before making API call
  if (!specialistId || specialistId === 'undefined' || specialistId === 'null' || specialistId.trim() === '') {
    console.error('❌ Invalid specialist ID provided to getSpecialistDetails');
    console.error('❌ ID value:', specialistId);
    console.error('❌ Call stack:', new Error().stack);
    throw new Error('Invalid specialist ID: Cannot fetch details for undefined or null specialist');
  }

  try {
    console.log('📥 Making API request to: /specialists/' + specialistId);
    const response = await api.get<{ success: boolean; data: SpecialistData }>(`/specialists/${specialistId}`);
    console.log('✅ Specialist details fetched successfully');
    console.log('📥 ========== END getSpecialistDetails ==========');
    return response.data.data;
  } catch (error: any) {
    console.error('❌ ========== ERROR in getSpecialistDetails ==========');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Requested specialist ID was:', specialistId);
    console.error('❌ ========== END ERROR ==========');
    throw error;
  }
};
