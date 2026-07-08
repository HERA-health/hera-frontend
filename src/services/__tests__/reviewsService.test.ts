jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import {
  normalizePublicReviewInvitation,
  type PublicReviewInvitation,
} from '../reviewsService';

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
