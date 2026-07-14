import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as specialistsService from '../../../services/specialistsService';
import type { Specialist } from '../../specialist-profile/types';
import { PublicSpecialistProfileScreen } from '../PublicSpecialistProfileScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const ReactModule = require('react');
    ReactModule.useEffect(effect, [effect]);
  },
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/specialistsService', () => ({
  getPublicSpecialistDetails: jest.fn(),
  mapPublicSpecialistToProfile: jest.fn(),
  openPublicCertificateDocument: jest.fn(),
}));

jest.mock('../../../hooks/useWebPageMetadata', () => ({
  useWebPageMetadata: jest.fn(),
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: () => ({}),
}));

jest.mock('../../../components/common/StyledLogo', () => ({
  StyledLogo: () => null,
}));

jest.mock('../../../components/common', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    AnimatedPressable: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) => (
      <Pressable onPress={onPress} testID={testID}>{children}</Pressable>
    ),
    Button: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) => (
      <Pressable onPress={onPress}><Text>{children}</Text></Pressable>
    ),
  };
});

jest.mock('../../specialist-profile/components', () => {
  const { Pressable, Text } = require('react-native');
  const BookingAction = ({ onBookPress }: { onBookPress: () => void }) => (
    <Pressable onPress={onBookPress}><Text>Reservar en prueba</Text></Pressable>
  );

  return {
    ProfileHero: BookingAction,
    SpecializationsGrid: () => null,
    ExperienceSection: () => null,
    ReviewsSection: () => null,
    StickyBookingBar: () => null,
    BookingSidebar: BookingAction,
    PhotoGallerySection: () => null,
    VideoSection: () => null,
    ProfileSkeleton: () => null,
  };
});

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseTheme = jest.mocked(useTheme);
const mockedGetPublicSpecialistDetails = jest.mocked(
  specialistsService.getPublicSpecialistDetails
);
const mockedMapPublicSpecialistToProfile = jest.mocked(
  specialistsService.mapPublicSpecialistToProfile
);

const specialist: Specialist = {
  id: 'specialist-1',
  name: 'Especialista de prueba',
  title: 'Psicóloga',
  bio: 'Perfil profesional',
  rating: 5,
  reviewCount: 0,
  pricePerSession: 60,
  specializations: [],
  sessionTypes: ['VIDEO_CALL'],
  offersOnline: true,
  offersInPerson: false,
};

describe('PublicSpecialistProfileScreen booking navigation', () => {
  const navigate = jest.fn();
  const reset = jest.fn();
  const getState = jest.fn();

  beforeEach(() => {
    getState.mockReturnValue({ routeNames: ['Booking', 'RequiredLegalAcceptance'] });
    mockedUseNavigation.mockReturnValue({ navigate, reset, getState } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({
      params: { specialistId: specialist.id },
    } as ReturnType<typeof useRoute>);
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedGetPublicSpecialistDetails.mockResolvedValue({
      reviewCount: null,
      reviews: [],
    } as unknown as specialistsService.PublicSpecialistProfileData);
    mockedMapPublicSpecialistToProfile.mockReturnValue(specialist);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires pending legal documents before an authenticated client can book', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { type: 'client' },
      legalStatusSnapshot: { requiresAcceptance: true },
    } as ReturnType<typeof useAuth>);

    render(<PublicSpecialistProfileScreen />);

    const bookingActions = await screen.findAllByText('Reservar en prueba');
    fireEvent.press(bookingActions[0]);

    expect(navigate).toHaveBeenCalledWith('RequiredLegalAcceptance');
    expect(navigate).not.toHaveBeenCalledWith('Booking', expect.anything());
  });

  it('preserves the existing booking flow after legal acceptance', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { type: 'client' },
      legalStatusSnapshot: { requiresAcceptance: false },
    } as ReturnType<typeof useAuth>);

    render(<PublicSpecialistProfileScreen />);

    const bookingActions = await screen.findAllByText('Reservar en prueba');
    fireEvent.press(bookingActions[0]);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('Booking', expect.objectContaining({
        specialistId: specialist.id,
        pricePerSession: specialist.pricePerSession,
      }));
    });
  });

  it('uses the legal screen when a recovered legal state has not reached auth context yet', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { type: 'client' },
      legalStatusSnapshot: null,
    } as ReturnType<typeof useAuth>);
    getState.mockReturnValue({ routeNames: ['RequiredLegalAcceptance'] });

    render(<PublicSpecialistProfileScreen />);

    const bookingActions = await screen.findAllByText('Reservar en prueba');
    fireEvent.press(bookingActions[0]);

    expect(navigate).toHaveBeenCalledWith('RequiredLegalAcceptance');
    expect(navigate).not.toHaveBeenCalledWith('Booking', expect.anything());
  });

  it.each([
    ['client', 'Home', null, true],
    ['professional', 'ProfessionalHome', null, true],
    ['professional', 'ProfessionalVerification', null, false],
    ['clinic', 'ClinicDashboard', null, true],
    ['client', 'RequiredLegalAcceptance', { requiresAcceptance: true }, true],
  ] as const)(
    'returns an authenticated %s account to %s',
    async (userType, expectedRoute, legalStatusSnapshot, verificationSubmitted) => {
      mockedUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { type: userType },
        legalStatusSnapshot,
        verificationSubmitted,
      } as ReturnType<typeof useAuth>);

      render(<PublicSpecialistProfileScreen />);
      await screen.findAllByText('Reservar en prueba');
      fireEvent.press(screen.getByTestId('public-specialist-profile-home'));

      expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: expectedRoute }] });
    }
  );

  it('returns a visitor to the public landing from the profile logo', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      legalStatusSnapshot: null,
      verificationSubmitted: null,
    } as ReturnType<typeof useAuth>);

    render(<PublicSpecialistProfileScreen />);
    await screen.findAllByText('Reservar en prueba');
    fireEvent.press(screen.getByTestId('public-specialist-profile-home'));

    expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Landing' }] });
  });
});
