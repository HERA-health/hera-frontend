jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import {
  canReviewSpecialist,
  normalizePublicReviewInvitation,
  type PublicReviewInvitation,
} from '../reviewsService';
import { api } from '../api';

const mockedApi = api as jest.Mocked<typeof api>;

describe('reviewsService.canReviewSpecialist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests authenticated specialist review eligibility', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          canReview: true,
          sessionId: 'session-1',
          mode: 'CREATE',
        },
      },
    });

    await expect(canReviewSpecialist('specialist-1')).resolves.toMatchObject({
      canReview: true,
      sessionId: 'session-1',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/reviews/specialist/specialist-1/can-review');
  });
});

describe('reviewsService.normalizePublicReviewInvitation', () => {
  it('fills safe defaults for a legacy invitation payload', () => {
    const invitation = normalizePublicReviewInvitation({
      status: 'AVAILABLE',
      specialistName: 'Dra. Elena Moreno',
      expiresAt: '2026-08-07T10:00:00.000Z',
    });

    expect(invitation).toEqual<PublicReviewInvitation>({
      status: 'AVAILABLE',
      mode: 'CREATE',
      specialistName: 'Dra. Elena Moreno',
      expiresAt: '2026-08-07T10:00:00.000Z',
      authorNameOptions: [],
      selectedAuthorDisplayMode: 'ANONYMOUS',
      existingReview: null,
    });
  });

  it('normalizes edit payloads without exposing unexpected fields to the screen', () => {
    const invitation = normalizePublicReviewInvitation({
      status: 'EDITABLE',
      specialistName: 'Dra. Elena Moreno',
      authorNameOptions: [
        { mode: 'FIRST_NAME_LAST_INITIAL', label: 'Lucia G.' },
        { mode: 'UNSAFE', label: 'Bad option' },
      ],
      existingReview: {
        rating: 5,
        text: 'Una experiencia muy buena.',
        authorDisplayMode: 'FIRST_NAME_LAST_INITIAL',
        clientId: 'client-1',
      },
    });

    expect(invitation).toMatchObject({
      status: 'EDITABLE',
      mode: 'EDIT',
      selectedAuthorDisplayMode: 'FIRST_NAME_LAST_INITIAL',
      existingReview: {
        rating: 5,
        text: 'Una experiencia muy buena.',
        authorDisplayMode: 'FIRST_NAME_LAST_INITIAL',
      },
    });
    expect(invitation.authorNameOptions).toEqual([
      { mode: 'FIRST_NAME_LAST_INITIAL', label: 'Lucia G.' },
    ]);
  });
});
