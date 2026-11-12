import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useTheme } from '../../../../contexts/ThemeContext';
import { lightTheme } from '../../../../constants/theme';
import { FeaturedSpecialistsSection } from '../FeaturedSpecialistsSection';
import { getFeaturedSpecialists } from '../../../../services/specialistsService';
import { PublicDiscoveryRateLimitError } from '../../../../services/generalRateLimit';

jest.mock('../../../../config/api', () => ({
  __esModule: true,
  default: () => ({ apiUrl: 'https://fixture.invalid/api' }),
}));

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../services/specialistsService', () => ({
  getFeaturedSpecialists: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedGetFeaturedSpecialists = jest.mocked(getFeaturedSpecialists);

const specialist = {
  id: 'featured-1',
  publicSlug: 'elena-martin',
  name: 'Dra. Elena Martín',
  avatar: 'https://res.cloudinary.com/hera/image/upload/c_fill,g_face,w_440,h_440,q_auto,f_auto/v1/featured-1.jpg',
  specialization: 'Psicología sanitaria',
  professionalType: 'PSYCHOLOGIST_HEALTH' as const,
  professionalTypeLabel: 'Psicóloga sanitaria',
  pricePerSession: 75,
  offersOnline: true,
  offersInPerson: false,
  yearsInPractice: 9,
  gradientId: 'salvia-lavanda',
  rating: 4.9,
  reviewCount: 12,
};

describe('FeaturedSpecialistsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  it('renders public profiles and routes both profile and directory actions', async () => {
    const onOpenSpecialist = jest.fn();
    const onViewAll = jest.fn();
    const onQuestionnaire = jest.fn();
    mockedGetFeaturedSpecialists.mockResolvedValue([specialist]);

    render(<FeaturedSpecialistsSection onOpenSpecialist={onOpenSpecialist} onViewAll={onViewAll} onQuestionnaire={onQuestionnaire} />);

    await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
    expect(screen.getByText('Elige psicólogo con información clara')).toBeTruthy();
    expect(
      screen.getByText(/Conoce la experiencia y el enfoque de cada perfil/)
    ).toBeTruthy();
    expect(screen.queryByText('4.9 · 12 reseñas')).toBeNull();
    expect(screen.getByText('Psicóloga sanitaria')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText(/75 €/)).toBeTruthy();
    expect(screen.queryByText('Desde 75 € / sesión')).toBeNull();
    fireEvent.press(screen.getByText('Dra. Elena Martín'));
    fireEvent.press(screen.getByText('Explorar el directorio'));
    const questionnaireLink = screen.getByRole('link', { name: 'Hacer el cuestionario' });
    fireEvent.press(questionnaireLink);

    expect(onOpenSpecialist).toHaveBeenCalledWith('elena-martin');
    expect(onViewAll).toHaveBeenCalledTimes(1);
    expect(onQuestionnaire).toHaveBeenCalledTimes(1);
  });

  it('uses an honest retry state when profiles cannot be loaded', async () => {
    mockedGetFeaturedSpecialists.mockRejectedValue(new Error('offline'));

    render(<FeaturedSpecialistsSection onOpenSpecialist={jest.fn()} onViewAll={jest.fn()} onQuestionnaire={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('No hemos podido cargar los perfiles ahora')).toBeTruthy());
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('explains a temporary limit and loads profiles when retry succeeds', async () => {
    const error = new PublicDiscoveryRateLimitError(30, undefined);
    mockedGetFeaturedSpecialists.mockRejectedValueOnce(error).mockResolvedValueOnce([specialist]);
    render(<FeaturedSpecialistsSection onOpenSpecialist={jest.fn()} onViewAll={jest.fn()} onQuestionnaire={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(error.message)).toBeTruthy());
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByText(specialist.name)).toBeTruthy());
    expect(screen.queryByText('No hemos podido cargar los perfiles ahora')).toBeNull();
  });
});
