import { api } from './api';

export interface CreateReviewData {
  sessionId: string;
  rating: number;
  text: string;
  publicationConsentAccepted: true;
}

export interface CanReviewResponse {
  canReview: boolean;
  reason?: string;
}

export type PublicReviewInvitationStatus =
  | 'AVAILABLE'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'UNAVAILABLE';

export interface PublicReviewInvitation {
  status: PublicReviewInvitationStatus;
  specialistName: string | null;
  expiresAt: string | null;
}

export interface PublicReviewData {
  rating: number;
  text: string;
  publicationConsentAccepted: true;
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

export const getPublicReviewInvitation = async (
  token: string
): Promise<PublicReviewInvitation> => {
  const response = await api.get<{ success: boolean; data: PublicReviewInvitation }>(
    `/reviews/invitations/${encodeURIComponent(token)}`
  );
  return response.data.data;
};

export const submitPublicReviewInvitation = async (
  token: string,
  data: PublicReviewData
): Promise<void> => {
  await api.post(`/reviews/invitations/${encodeURIComponent(token)}`, data);
};
