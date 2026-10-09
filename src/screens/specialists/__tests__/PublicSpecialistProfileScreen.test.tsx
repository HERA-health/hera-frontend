import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useDiscoveryRevalidation } from '../../../hooks/useDiscoveryRevalidation';
import { useNavigation, useRoute } from '@react-navigation/native';

import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useWebPageMetadata } from '../../../hooks/useWebPageMetadata';
import * as specialistsService from '../../../services/specialistsService';
import type { Specialist } from '../../specialist-profile/types';
import { PublicSpecialistProfileScreen } from '../PublicSpecialistProfileScreen';

jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));

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
  PublicSpecialistProfileError: class extends Error {
    readonly status?: number;
    constructor(message: string, statusCode?: number) { super(message); this.status = statusCode; }
  },
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

jest.mock('../../specialist-profile/SpecialistProfileLayout', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    SpecialistProfileLayout: ({ onBookSession, onBrowseSpecialists, specialist: profile }: { onBookSession: () => void; onBrowseSpecialists: () => void; specialist: Specialist }) => {
      const [selected, setSelected] = ReactModule.useState(false);
      return <>
        <Pressable onPress={onBookSession}><Text>Reservar en prueba</Text></Pressable>
        <Pressable onPress={onBrowseSpecialists}><Text>Todos los especialistas</Text></Pressable>
        <Pressable onPress={() => setSelected(true)}><Text>{selected ? 'Horario elegido' : 'Seleccionar horario'}</Text></Pressable>
        <Text>Creencia: {profile.religionCode ?? 'oculta'}</Text>
      </>;
    },
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
const mockedUseWebPageMetadata = jest.mocked(useWebPageMetadata);
const mockedGetPublicSpecialistDetails = jest.mocked(
  specialistsService.getPublicSpecialistDetails
);
const mockedMapPublicSpecialistToProfile = jest.mocked(
  specialistsService.mapPublicSpecialistToProfile
);

const specialist: Specialist = {
  id: 'specialist-1',
  publicSlug: 'especialista-de-prueba',
  isPubliclyListed: true,
  name: 'Especialista de prueba',
  title: 'Psicóloga',
  avatar: 'https://example.com/specialist.jpg',
  bio: 'Perfil profesional',
  rating: 5,
  reviewCount: 0,
  pricePerSession: 60,
  specializations: [],
  sessionTypes: ['VIDEO_CALL', 'IN_PERSON'],
  offersOnline: true,
  offersInPerson: true,
  address: {
    street: 'Calle de Alcalá, 42',
    city: 'Madrid',
    postalCode: '28014',
    latitude: 40.418,
    longitude: -3.696,
  },
};

const publicProfileData: specialistsService.PublicSpecialistProfileData = {
  id: specialist.id,
  isPubliclyListed: true,
  specialization: 'Psicología sanitaria',
  professionalType: 'PSYCHOLOGIST_HEALTH',
  professionalTypeLabel: 'Psicóloga sanitaria',
  description: 'Perfil profesional',
  pricePerSession: 60,
  rating: null,
  reviewCount: null,
  firstVisitFree: false,
  matchingProfile: {},
  avatar: specialist.avatar ?? null,
  user: { name: specialist.name },
  offersOnline: true,
  offersInPerson: true,
  reviews: [],
};

describe('PublicSpecialistProfileScreen booking navigation', () => {
  const navigate = jest.fn();
  const reset = jest.fn();
  const getState = jest.fn();
  const popTo = jest.fn();

  beforeEach(() => {
    getState.mockReturnValue({ routeNames: ['Booking', 'RequiredLegalAcceptance'] });
    mockedUseNavigation.mockReturnValue({ navigate, reset, getState, popTo } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({
      params: { profileRef: specialist.id },
    } as ReturnType<typeof useRoute>);
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedGetPublicSpecialistDetails.mockResolvedValue(publicProfileData);
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
      expect(navigate).toHaveBeenCalledWith('Booking', {
        specialistId: specialist.id,
      });
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

  it('keeps the public profile indexable while its data is loading', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      legalStatusSnapshot: null,
      verificationSubmitted: null,
    } as ReturnType<typeof useAuth>);
    mockedGetPublicSpecialistDetails.mockImplementation(() => new Promise(() => undefined));

    const { unmount } = render(<PublicSpecialistProfileScreen />);

    expect(mockedUseWebPageMetadata).toHaveBeenLastCalledWith(expect.objectContaining({
      canonicalPath: `/especialista/${specialist.id}`,
      indexable: true,
    }));

    unmount();
  });

  it('keeps a resolved public profile indexable under its canonical slug', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      legalStatusSnapshot: null,
      verificationSubmitted: null,
    } as ReturnType<typeof useAuth>);

    render(<PublicSpecialistProfileScreen />);
    await screen.findAllByText('Reservar en prueba');

    await waitFor(() => {
      expect(mockedUseWebPageMetadata).toHaveBeenLastCalledWith(expect.objectContaining({
        canonicalPath: `/especialista/${specialist.publicSlug}`,
        indexable: true,
      }));
    });
  });

  it('applies noindex only after resolving a profile that is not publicly listed', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      legalStatusSnapshot: null,
      verificationSubmitted: null,
    } as ReturnType<typeof useAuth>);
    mockedMapPublicSpecialistToProfile.mockReturnValue({
      ...specialist,
      isPubliclyListed: false,
    });

    render(<PublicSpecialistProfileScreen />);
    await screen.findAllByText('Reservar en prueba');

    await waitFor(() => {
      expect(mockedUseWebPageMetadata).toHaveBeenLastCalledWith(expect.objectContaining({
        canonicalPath: `/especialista/${specialist.publicSlug}`,
        indexable: false,
      }));
    });
  });

  it('returns to the existing directory instead of pushing another screen', async () => {
    render(<PublicSpecialistProfileScreen />);
    await screen.findByText('Todos los especialistas');
    fireEvent.press(screen.getByText('Todos los especialistas'));
    expect(popTo).toHaveBeenCalledWith('PublicSpecialists', undefined, { merge: true });
    expect(navigate).not.toHaveBeenCalledWith('PublicSpecialists');
  });

  it('keeps the profile mounted and the selected slot during a background refresh', async () => {
    render(<PublicSpecialistProfileScreen />);
    await screen.findByText('Seleccionar horario');
    fireEvent.press(screen.getByText('Seleccionar horario'));
    let resolve: (value: specialistsService.PublicSpecialistProfileData) => void = () => undefined;
    mockedGetPublicSpecialistDetails.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const reload = jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)![0];
    let pending: void | Promise<unknown>;
    act(() => { pending = reload(); });
    expect(screen.getByText('Horario elegido')).toBeTruthy();
    await act(async () => { resolve(publicProfileData); await pending; });
    expect(screen.getByText('Horario elegido')).toBeTruthy();
  });

  it('shows a recoverable refresh error without removing the loaded profile', async () => {
    mockedMapPublicSpecialistToProfile.mockReturnValue({ ...specialist, religionCode: 'catholic' });
    render(<PublicSpecialistProfileScreen />);
    await screen.findByText('Seleccionar horario');
    expect(screen.getByText('Creencia: catholic')).toBeTruthy();
    mockedGetPublicSpecialistDetails.mockRejectedValueOnce(new Error('Error de conexión'));
    await act(async () => { await jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)![0](); });
    expect(screen.getByText('Reservar en prueba')).toBeTruthy();
    expect(screen.getByText(/No hemos podido actualizar el perfil/)).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
    expect(screen.getByText('Creencia: oculta')).toBeTruthy();
  });

  it('removes a profile that the server has withdrawn during revalidation', async () => {
    render(<PublicSpecialistProfileScreen />);
    await screen.findByText('Reservar en prueba');
    mockedGetPublicSpecialistDetails.mockRejectedValueOnce(new specialistsService.PublicSpecialistProfileError('Specialist not found', 404));
    await act(async () => { await jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)![0](); });
    expect(screen.queryByText('Reservar en prueba')).toBeNull();
    expect(screen.getByText('Perfil no disponible')).toBeTruthy();
  });
});
