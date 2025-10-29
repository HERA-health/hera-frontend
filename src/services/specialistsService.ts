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
 * Gets detailed information about a specific specialist
 */
export const getSpecialistDetails = async (specialistId: string): Promise<SpecialistData> => {
  console.log('📥 Fetching specialist details for ID:', specialistId);

  try {
    const response = await api.get<{ success: boolean; data: SpecialistData }>(`/specialists/${specialistId}`);
    console.log('✅ Specialist details fetched successfully:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching specialist details:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};
