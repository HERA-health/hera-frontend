import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';
import { PublicSpecialistsScreen } from '../PublicSpecialistsScreen';
import * as specialistsService from '../../../services/specialistsService';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/specialistsService', () => ({
  getPublicSpecialistDirectory: jest.fn(),
}));

jest.mock('../../landing/components/LandingHeader', () => ({
  LandingHeader: ({
    onFindSpecialist,
    onScrollToSection,
  }: {
    onFindSpecialist: () => void;
    onScrollToSection: (section: 'featuredSpecialists') => void;
  }) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Pressable onPress={() => onScrollToSection('featuredSpecialists')}>
          <Text>Especialistas</Text>
        </Pressable>
        <Pressable onPress={onFindSpecialist}>
          <Text>Busco terapia</Text>
        </Pressable>
      </View>
    );
  },
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseTheme = jest.mocked(useTheme);
const mockedDirectory = jest.mocked(specialistsService.getPublicSpecialistDirectory);

const specialist = {
  id: 'specialist-1',
  name: 'Dra. Elena Martín',
  avatar: 'https://res.cloudinary.com/hera/image/upload/c_fill,g_face,w_500,h_500,q_auto,f_auto/v1/specialist-1.jpg',
  specialization: 'Ansiedad y estrés',
  professionalType: 'PSYCHOLOGIST_HEALTH' as const,
  professionalTypeLabel: 'Psicóloga sanitaria',
  pricePerSession: 72,
  offersOnline: true,
  offersInPerson: false,
  yearsInPractice: 8,
  gradientId: 'salvia-lavanda',
  collegiateNumber: 'M-12345',
  rating: 4.8,
  reviewCount: 17,
  specialties: ['anxiety', 'self-esteem', 'depression', 'trauma', 'sleep'],
};

describe('PublicSpecialistsScreen', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedUseNavigation.mockReturnValue({ navigate } as ReturnType<typeof useNavigation>);
  });

  it('loads a public page and opens the public profile without authentication', async () => {
    mockedDirectory.mockResolvedValue({
      items: [specialist],
      page: 1,
      pageSize: 12,
      total: 1,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
    expect(screen.getByLabelText('Retrato de Dra. Elena Martín').props.resizeMode).toBe('cover');
    expect(screen.getByText('Col. Nº M-12345')).toBeTruthy();
    expect(screen.getByText('4.8 · 17 reseñas')).toBeTruthy();
    expect(screen.getByText('Ansiedad')).toBeTruthy();
    expect(screen.getByText('Autoestima')).toBeTruthy();
    expect(screen.getByText('Depresión')).toBeTruthy();
    expect(screen.getByText('Trauma')).toBeTruthy();
    expect(screen.getByText('Problemas de sueño')).toBeTruthy();
    expect(screen.queryByText('+1')).toBeNull();
    expect(screen.queryByText('1 perfil')).toBeNull();
    fireEvent.press(screen.getByText('Dra. Elena Martín'));

    expect(navigate).toHaveBeenCalledWith('PublicSpecialistProfile', { specialistId: 'specialist-1' });
  });

  it('uses the landing header and routes its specialist link back to the landing section', async () => {
    mockedDirectory.mockResolvedValue({
      items: [specialist],
      page: 1,
      pageSize: 12,
      total: 1,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
    fireEvent.press(screen.getByText('Especialistas'));

    expect(navigate).toHaveBeenCalledWith('Landing', { section: 'featuredSpecialists' });
  });

  it('applies a submitted text search to the next public directory request', async () => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByPlaceholderText('Nombre, profesión o especialidad'), 'ansiedad');
    fireEvent.press(screen.getByText('Buscar'));

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledWith(expect.objectContaining({ q: 'ansiedad', page: 1 })));
  });

  it('applies useful public filters and can clear them together', async () => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('Tema'));
    fireEvent.press(screen.getByText('Ansiedad y estrés'));
    fireEvent.press(screen.getByText('Depresión'));
    expect(mockedDirectory).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Aplicar'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: ['anxiety', 'depression'], page: 1 })
    ));

    fireEvent.press(screen.getByText('Valoración'));
    fireEvent.press(screen.getByText('4,5 o más'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: ['anxiety', 'depression'], minRating: 4.5, page: 1 })
    ));

    fireEvent.press(screen.getByText('Limpiar'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: undefined, minRating: undefined, sort: 'RECENT', page: 1 })
    ));
  });

  it('uses checkbox selectors for single-choice filters and allows deselection', async () => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);
    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('Perfil'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Psiquiatra' }));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ professionalType: 'PSYCHIATRIST' })
    ));

    fireEvent.press(screen.getByText('Psiquiatra'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Psiquiatra' }));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ professionalType: undefined })
    ));
  });
});
