import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ReviewsSection } from '../ReviewsSection';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../services/reviewsService', () => ({
  requestPublicReviewLink: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

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
});
