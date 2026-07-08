import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ReviewsSection } from '../ReviewsSection';
import { canReviewSpecialist, requestPublicReviewLink } from '../../../../services/reviewsService';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../services/reviewsService', () => ({
  canReviewSpecialist: jest.fn(),
  requestPublicReviewLink: jest.fn(),
}));

jest.mock('../../../sessions/components/ReviewModal', () => ({
  __esModule: true,
  default: ({
    visible,
    sessionId,
    specialistAvatar,
  }: {
    visible: boolean;
    sessionId: string;
    specialistAvatar?: string;
  }) => {
    const { Text } = require('react-native');
    return visible ? <Text>Review modal {sessionId} {specialistAvatar ?? 'no-avatar'}</Text> : null;
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedCanReviewSpecialist = jest.mocked(canReviewSpecialist);
const mockedRequestPublicReviewLink = jest.mocked(requestPublicReviewLink);

describe('ReviewsSection', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts expanded when there are reviews', () => {
    render(
      <ReviewsSection
        specialistId="specialist-1"
        rating={5}
        reviewCount={1}
        reviews={[{
          id: 'review-1',
          rating: 5,
          text: 'Me ayudó mucho desde la primera sesión.',
          authorName: 'Paciente',
          date: '2026-06-15T10:00:00.000Z',
        }]}
      />
    );

    expect(screen.getByText('5.0 promedio (1 reseña)')).toBeTruthy();
    expect(screen.getByText(/Me ayudó mucho/)).toBeTruthy();
    expect(screen.getByText('Sesión verificada')).toBeTruthy();
    expect(screen.getByText('Añadir tu opinión')).toBeTruthy();
  });

  it('shows the verified review CTA when there are no reviews', () => {
    render(<ReviewsSection specialistId="specialist-1" rating={0} reviewCount={0} reviews={[]} />);

    expect(screen.getByText('Reseñas de clientes')).toBeTruthy();
    expect(screen.getByText('Sin reseñas todavía')).toBeTruthy();
    expect(screen.getByText(/Los pacientes ya pueden añadir opiniones verificadas/)).toBeTruthy();
    expect(screen.getByText('Añadir tu opinión')).toBeTruthy();
  });

  it('opens the review modal directly for eligible authenticated clients', async () => {
    mockedCanReviewSpecialist.mockResolvedValue({
      canReview: true,
      sessionId: 'session-direct-1',
      mode: 'CREATE',
    });

    render(
      <ReviewsSection
        specialistId="specialist-1"
        specialistName="Dra. Elena"
        specialistAvatar="https://cdn.hera.test/elena.jpg"
        rating={0}
        reviewCount={0}
        reviews={[]}
        isAuthenticated
        isClient
      />
    );

    fireEvent.press(screen.getByText('Añadir tu opinión'));

    expect(await screen.findByText('Review modal session-direct-1 https://cdn.hera.test/elena.jpg')).toBeTruthy();
    expect(mockedCanReviewSpecialist).toHaveBeenCalledWith('specialist-1');
    expect(mockedRequestPublicReviewLink).not.toHaveBeenCalled();
  });

  it('shows a clear blocked state for authenticated clients without completed sessions', async () => {
    mockedCanReviewSpecialist.mockResolvedValue({
      canReview: false,
      reason: 'NO_COMPLETED_SESSION',
    });

    render(
      <ReviewsSection
        specialistId="specialist-1"
        rating={0}
        reviewCount={0}
        reviews={[]}
        isAuthenticated
        isClient
      />
    );

    fireEvent.press(screen.getByText('Añadir tu opinión'));

    expect(await screen.findByText(
      'Para dejar una reseña necesitas haber completado una sesión HERA con este especialista.'
    )).toBeTruthy();
  });

  it('keeps the email verification flow for anonymous visitors', () => {
    render(<ReviewsSection specialistId="specialist-1" rating={0} reviewCount={0} reviews={[]} />);

    fireEvent.press(screen.getByText('Añadir tu opinión'));

    expect(screen.getByText('Recibe tu enlace verificado')).toBeTruthy();
    expect(screen.getByText(/Solo se enviará si este email corresponde/)).toBeTruthy();
  });
});
