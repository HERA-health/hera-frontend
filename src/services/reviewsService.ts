import { api } from './api';

export type ReviewAuthorDisplayMode =
  | 'FIRST_NAME_LAST_INITIAL'
  | 'FIRST_NAME'
  | 'INITIALS'
  | 'ANONYMOUS';

export type ReviewMode = 'CREATE' | 'EDIT';

export interface ReviewAuthorNameOption {
  mode: ReviewAuthorDisplayMode;
  label: string;
}

export interface ExistingReviewDetails {
  rating: number;
  text: string;
  authorDisplayMode: ReviewAuthorDisplayMode;
}

export interface CreateReviewData {
  sessionId: string;
  rating: number;
  text: string;
  authorDisplayMode?: ReviewAuthorDisplayMode;
  publicationConsentAccepted: true;
}

export interface CanReviewResponse {
  canReview: boolean;
  reason?: string;
  mode?: ReviewMode;
  authorNameOptions?: ReviewAuthorNameOption[];
  selectedAuthorDisplayMode?: ReviewAuthorDisplayMode;
  existingReview?: ExistingReviewDetails | null;
}

export type CanReviewSpecialistReason =
  | 'NO_COMPLETED_SESSION'
  | 'CLIENT_EMAIL_REQUIRED'
  | 'SPECIALIST_NOT_FOUND';

export interface CanReviewSpecialistResponse {
  canReview: boolean;
  reason?: CanReviewSpecialistReason;
  sessionId?: string;
  mode?: ReviewMode;
  authorNameOptions?: ReviewAuthorNameOption[];
  selectedAuthorDisplayMode?: ReviewAuthorDisplayMode;
  existingReview?: ExistingReviewDetails | null;
}

export type PublicReviewInvitationStatus =
  | 'AVAILABLE'
  | 'EDITABLE'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'UNAVAILABLE';

export interface PublicReviewInvitation {
  status: PublicReviewInvitationStatus;
  mode: ReviewMode;
  specialistName: string | null;
  expiresAt: string | null;
  authorNameOptions: ReviewAuthorNameOption[];
  selectedAuthorDisplayMode: ReviewAuthorDisplayMode;
  existingReview: ExistingReviewDetails | null;
}

export interface PublicReviewData {
  rating: number;
  text: string;
  authorDisplayMode?: ReviewAuthorDisplayMode;
  publicationConsentAccepted: true;
}

const REVIEW_AUTHOR_DISPLAY_MODES: readonly ReviewAuthorDisplayMode[] = [
  'FIRST_NAME_LAST_INITIAL',
  'FIRST_NAME',
  'INITIALS',
  'ANONYMOUS',
];

const REVIEW_MODES: readonly ReviewMode[] = ['CREATE', 'EDIT'];

const PUBLIC_REVIEW_INVITATION_STATUSES: readonly PublicReviewInvitationStatus[] = [
  'AVAILABLE',
  'EDITABLE',
  'SUBMITTED',
  'EXPIRED',
  'UNAVAILABLE',
];

const DEFAULT_AUTHOR_DISPLAY_MODE: ReviewAuthorDisplayMode = 'ANONYMOUS';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isReviewAuthorDisplayMode = (value: unknown): value is ReviewAuthorDisplayMode =>
  typeof value === 'string'
  && REVIEW_AUTHOR_DISPLAY_MODES.includes(value as ReviewAuthorDisplayMode);

const isReviewMode = (value: unknown): value is ReviewMode =>
  typeof value === 'string' && REVIEW_MODES.includes(value as ReviewMode);

const isPublicReviewInvitationStatus = (
  value: unknown
): value is PublicReviewInvitationStatus =>
  typeof value === 'string'
  && PUBLIC_REVIEW_INVITATION_STATUSES.includes(value as PublicReviewInvitationStatus);

const normalizeAuthorNameOptions = (value: unknown): ReviewAuthorNameOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ReviewAuthorNameOption[]>((options, option) => {
    if (!isRecord(option) || !isReviewAuthorDisplayMode(option.mode) || typeof option.label !== 'string') {
      return options;
    }

    return [...options, { mode: option.mode, label: option.label }];
  }, []);
};

const normalizeExistingReview = (value: unknown): ExistingReviewDetails | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.rating !== 'number'
    || typeof value.text !== 'string'
    || !isReviewAuthorDisplayMode(value.authorDisplayMode)
  ) {
    return null;
  }

  return {
    rating: value.rating,
    text: value.text,
    authorDisplayMode: value.authorDisplayMode,
  };
};

export const normalizePublicReviewInvitation = (value: unknown): PublicReviewInvitation => {
  const source = isRecord(value) ? value : {};
  const status = isPublicReviewInvitationStatus(source.status) ? source.status : 'UNAVAILABLE';
  const rawExistingReview = normalizeExistingReview(source.existingReview);
  const existingReview = status === 'EDITABLE' ? rawExistingReview : null;
  const authorNameOptions = normalizeAuthorNameOptions(source.authorNameOptions);
  const mode = isReviewMode(source.mode)
    ? source.mode
    : status === 'EDITABLE'
      ? 'EDIT'
      : 'CREATE';
  const selectedAuthorDisplayMode = isReviewAuthorDisplayMode(source.selectedAuthorDisplayMode)
    ? source.selectedAuthorDisplayMode
    : existingReview?.authorDisplayMode
      ?? authorNameOptions[0]?.mode
      ?? DEFAULT_AUTHOR_DISPLAY_MODE;

  return {
    status,
    mode,
    specialistName: typeof source.specialistName === 'string' ? source.specialistName : null,
    expiresAt: typeof source.expiresAt === 'string' ? source.expiresAt : null,
    authorNameOptions,
    selectedAuthorDisplayMode,
    existingReview,
  };
};

/**
 * Submit or update a review for a completed session.
 */
export const createReview = async (data: CreateReviewData): Promise<void> => {
  await api.post('/reviews', data);
};

/**
 * Check if the authenticated client can leave or edit a review for a given session.
 */
export const canReview = async (sessionId: string): Promise<CanReviewResponse> => {
  const response = await api.get<{ success: boolean; data: CanReviewResponse }>(
    `/reviews/session/${sessionId}/can-review`
  );
  return response.data.data;
};

export const canReviewSpecialist = async (
  specialistId: string
): Promise<CanReviewSpecialistResponse> => {
  const response = await api.get<{ success: boolean; data: CanReviewSpecialistResponse }>(
    `/reviews/specialist/${encodeURIComponent(specialistId)}/can-review`
  );
  return response.data.data;
};

export const getPublicReviewInvitation = async (
  token: string
): Promise<PublicReviewInvitation> => {
  const response = await api.get<{ success: boolean; data: unknown }>(
    `/reviews/invitations/${encodeURIComponent(token)}`
  );
  return normalizePublicReviewInvitation(response.data.data);
};

export const submitPublicReviewInvitation = async (
  token: string,
  data: PublicReviewData
): Promise<void> => {
  await api.post(`/reviews/invitations/${encodeURIComponent(token)}`, data);
};

export const requestPublicReviewLink = async (
  specialistId: string,
  email: string
): Promise<void> => {
  await api.post('/reviews/public-requests', { specialistId, email });
};
