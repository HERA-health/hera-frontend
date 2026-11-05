import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { SpecialistDetailScreen } from '../SpecialistDetailScreen';
import { getSpecialistDetails, SpecialistDetailsError } from '../../../services/specialistsService';
import type { SpecialistData } from '../../../services/specialistsService';
import { getAvailableSlots } from '../../../services/sessionsService';
import { useDiscoveryRevalidation } from '../../../hooks/useDiscoveryRevalidation';
import { ProfilePackages } from '../../../components/packages/ProfilePackages';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual<typeof React>('react').useEffect(effect, [effect]),
}));
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { type: 'client' } }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme }) }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn(), track: jest.fn() }));
jest.mock('../../../services/api', () => ({ api: { get: jest.fn(), defaults: { baseURL: 'http://localhost:3000/api' } } }));
jest.mock('../../../services/specialistsService', () => ({
  ...jest.requireActual<typeof import('../../../services/specialistsService')>('../../../services/specialistsService'),
  getSpecialistDetails: jest.fn(),
}));
jest.mock('../../../components/packages/ProfilePackages', () => ({ ProfilePackages: jest.fn(() => null) }));
jest.mock('../../../components/common/alert', () => ({ showAppAlert: jest.fn(), useAppAlert: () => ({}) }));
jest.mock('../../../components/common', () => ({
  AnimatedPressable: jest.requireActual<typeof import('../../../components/common/AnimatedPressable')>('../../../components/common/AnimatedPressable').AnimatedPressable,
  Button: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Pressable onPress={onPress}><Text>{children}</Text></Pressable>;
  },
}));
jest.mock('../../../hooks/useProfileOptions', () => ({ useProfileOptions: () => ({ options: null, error: false, retry: jest.fn() }) }));
jest.mock('../../../services/sessionsService', () => ({ getAvailableSlots: jest.fn() }));
jest.mock('../../specialist-profile/useSpecialistProfileActions', () => ({ useSpecialistProfileActions: () => ({
  shareProfile: jest.fn(), toggleFavorite: jest.fn(), isFavorite: false, favoriteLoading: false,
}) }));
jest.mock('../../specialist-profile/components/ReviewsSection', () => ({ ReviewsSection: () => null }));
jest.mock('../../specialist-profile/components/VideoSection', () => ({ VideoSection: () => null }));
jest.mock('../../specialist-profile/components/PhotoGallerySection', () => ({ PhotoGallerySection: () => null }));
jest.mock('../../specialist-profile/components/ExperienceSection', () => ({ ExperienceSection: () => null }));
jest.mock('../../../components/location', () => ({ LocationMapPreview: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));

const data = (id: string): SpecialistData => ({
  id, userId: `user-${id}`, user: { name: `Perfil ${id}` }, specialization: 'Psicología',
  professionalType: null, professionalTypeLabel: 'Psicología', description: 'Descripción',
  pricePerSession: 60, rating: 0, reviewCount: 0, firstVisitFree: false, avatar: null,
  nextAvailable: '2099-07-29',
  publicOptions: [
    { specialistId: id, optionId: 'video', serviceId: 'general', serviceName: 'General', modality: 'VIDEO_CALL', durationMinutes: 60, priceCents: 6000 },
    { specialistId: id, optionId: 'phone', serviceId: 'general', serviceName: 'General', modality: 'PHONE_CALL', durationMinutes: 30, priceCents: 3000 },
  ],
});
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const slot = { startTime: '11:00', endTime: '11:30', available: true };
const summary = () => within(screen.getByTestId('public-booking-summary'));
const refreshProfile = () => act(async () => {
  const reload = jest.mocked(useDiscoveryRevalidation).mock.calls.find(call => call[1] === false)?.[0];
  if (!reload) throw new Error('Profile revalidation was not registered');
  await reload();
});
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getAvailableSlots).mockResolvedValue([slot]); });

it('keeps a temporary failure on the profile and recovers when retried', async () => {
  jest.mocked(getSpecialistDetails).mockRejectedValueOnce(new Error('Fallo temporal')).mockResolvedValueOnce(data('one'));
  render(<SpecialistDetailScreen route={{ params: { specialistId: 'one' } }} navigation={navigation} />);
  await waitFor(() => expect(screen.getByText('Fallo temporal')).toBeTruthy());
  expect(navigation.goBack).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Reintentar'));
  await waitFor(() => expect(screen.getByText('Perfil one')).toBeTruthy());
  expect(getSpecialistDetails).toHaveBeenCalledTimes(2);
});

it('can open the public view after an expired session without granting private access', async () => {
  jest.mocked(getSpecialistDetails).mockRejectedValueOnce(new Error('Tu sesión ya no está activa.'));
  render(<SpecialistDetailScreen route={{ params: { specialistId: 'one' } }} navigation={navigation} />);
  await waitFor(() => expect(screen.getByText('Ver perfil público')).toBeTruthy());
  fireEvent.press(screen.getByText('Ver perfil público'));
  expect(navigation.navigate).toHaveBeenCalledWith('PublicSpecialistProfile', { profileRef: 'one' });
});

it('ignores a late failure from the previous profile while browsing quickly', async () => {
  let rejectOld: (error: Error) => void = () => { throw new Error('Not started'); };
  jest.mocked(getSpecialistDetails).mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject; }))
    .mockResolvedValueOnce(data('two'));
  const { rerender } = render(<SpecialistDetailScreen route={{ params: { specialistId: 'one' } }} navigation={navigation} />);
  await waitFor(() => expect(getSpecialistDetails).toHaveBeenCalledWith('one'));
  rerender(<SpecialistDetailScreen route={{ params: { specialistId: 'two' } }} navigation={navigation} />);
  await waitFor(() => expect(screen.getByText('Perfil two')).toBeTruthy());
  await act(async () => rejectOld(new Error('Error del perfil anterior')));
  expect(screen.getByText('Perfil two')).toBeTruthy();
  expect(screen.queryByText('Error del perfil anterior')).toBeNull();
  expect(navigation.goBack).not.toHaveBeenCalled();
});

it('uses the shared profile and carries the recommended service, intent and chosen time into booking', async () => {
  jest.mocked(getSpecialistDetails).mockResolvedValue(data('one'));
  render(<SpecialistDetailScreen route={{ params: { specialistId: 'one', optionId: 'phone', intentToken: 'intent' } }} navigation={navigation} />);
  await screen.findByText('11:00');
  expect(summary().getByText('General · Teléfono')).toBeTruthy();
  expect(summary().getByText('30\u00a0€')).toBeTruthy();
  expect(jest.mocked(ProfilePackages).mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ presentation: 'dialog', specialistId: 'one', intentToken: 'intent' }));
  fireEvent.press(summary().getByText('Reservar'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Booking', { specialistId: 'one', optionId: 'phone', intentToken: 'intent' });
  fireEvent.press(screen.getByText('11:00'));
  fireEvent.press(summary().getByText('Reservar'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Booking', {
    specialistId: 'one', optionId: 'phone', intentToken: 'intent', initialDate: '2099-07-29', initialSlotStartTime: '11:00', initialSlotEndTime: '11:30',
  });
  fireEvent.press(screen.getByRole('link', { name: 'Ver todos los especialistas' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Specialists');
});

it.each(['video', undefined, 'unavailable'])('resets the service and previous time when the route option changes to %s for the same specialist', async optionId => {
  jest.mocked(getSpecialistDetails).mockResolvedValue(data('one'));
  const { rerender } = render(<SpecialistDetailScreen route={{ params: { specialistId: 'one', optionId: 'phone', intentToken: 'intent' } }} navigation={navigation} />);
  fireEvent.press(await screen.findByText('11:00'));
  expect(summary().getByText('General · Teléfono')).toBeTruthy();
  expect(screen.getByLabelText('Quitar 11:00')).toBeTruthy();

  rerender(<SpecialistDetailScreen route={{ params: { specialistId: 'one', optionId, intentToken: 'intent' } }} navigation={navigation} />);
  await screen.findByText('11:00');
  expect(summary().getByText('General · Videollamada')).toBeTruthy();
  expect(summary().getByText('60\u00a0€')).toBeTruthy();
  expect(summary().getByText('· sesión de 60 min')).toBeTruthy();
  expect(screen.queryByLabelText('Quitar 11:00')).toBeNull();
  fireEvent.press(summary().getByText('Reservar'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Booking', {
    specialistId: 'one', optionId: 'video', intentToken: 'intent',
  });
});

it('keeps the assisted entry out of availability and package purchasing', async () => {
  jest.mocked(getSpecialistDetails).mockResolvedValue(data('one'));
  render(<SpecialistDetailScreen route={{ params: { specialistId: 'one', adviceId: 'advice' } }} navigation={navigation} />);
  await screen.findByText('Perfil one');
  expect(screen.queryByText('Disponibilidad')).toBeNull();
  expect(getAvailableSlots).not.toHaveBeenCalled();
  expect(ProfilePackages).not.toHaveBeenCalled();
  fireEvent.press(summary().getByText('Pedir ayuda para la primera cita'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('MatchingAdvice', { id: 'advice', specialistId: 'one' });
});

it('preserves service and time through a refresh and a recoverable refresh failure', async () => {
  jest.mocked(getSpecialistDetails).mockResolvedValue(data('one'));
  const { rerender } = render(<SpecialistDetailScreen route={{ params: { specialistId: 'one', optionId: 'video' } }} navigation={navigation} />);
  await screen.findByText('11:00');
  fireEvent.press(screen.getByRole('radio', { name: /General · Teléfono · 30 min/ }));
  fireEvent.press(await screen.findByText('11:00'));
  rerender(<SpecialistDetailScreen route={{ params: { specialistId: 'one', optionId: 'video' } }} navigation={navigation} />);
  await refreshProfile();
  expect(summary().getByText('General · Teléfono')).toBeTruthy();
  expect(screen.getByLabelText('Quitar 11:00')).toBeTruthy();
  jest.mocked(getSpecialistDetails).mockRejectedValueOnce(new Error('Network'));
  await refreshProfile();
  expect(screen.getByText(/No hemos podido actualizar el perfil/)).toBeTruthy();
  expect(screen.getByLabelText('Quitar 11:00')).toBeTruthy();
  fireEvent.press(screen.getByText('Reintentar'));
  await waitFor(() => expect(screen.queryByText(/No hemos podido actualizar el perfil/)).toBeNull());
  expect(screen.getByLabelText('Quitar 11:00')).toBeTruthy();
});

it.each([401, 403, 404, 410])('removes the loaded profile when revalidation loses access (%s)', async status => {
  jest.mocked(getSpecialistDetails).mockResolvedValueOnce(data('one'));
  render(<SpecialistDetailScreen route={{ params: { specialistId: 'one' } }} navigation={navigation} />);
  await screen.findByText('11:00');
  jest.mocked(getSpecialistDetails).mockRejectedValueOnce(new SpecialistDetailsError('Perfil no disponible', status));
  await refreshProfile();
  expect(screen.queryByText('Perfil one')).toBeNull();
  expect(screen.getByText('Perfil no disponible')).toBeTruthy();
  expect(screen.queryByTestId('public-booking-summary')).toBeNull();
});
