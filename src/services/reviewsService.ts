import { api } from './api';

export interface CreateReviewData {
  sessionId: string;
  rating: number;
  text: string;
}

export interface CanReviewResponse {
  canReview: boolean;
  reason?: string;
}

/**
 * Submit a review for a completed session.
 */
export const createReview = async (data: CreateReviewData): Promise<void> => {
  await api.post('/reviews', data);
};

/**
 * Check if the authenticated client can leave a review for a given session.
 */
export const canReview = async (sessionId: string): Promise<CanReviewResponse> => {
  const response = await api.get<{ success: boolean; data: CanReviewResponse }>(
    `/reviews/session/${sessionId}/can-review`
  );
  return response.data.data;
};
