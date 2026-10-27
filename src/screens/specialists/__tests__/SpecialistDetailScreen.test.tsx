import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SpecialistDetailScreen } from '../SpecialistDetailScreen';
import { getSpecialistDetails } from '../../../services/specialistsService';
import type { SpecialistData } from '../../../services/specialistsService';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual<typeof React>('react').useEffect(effect, [effect]),
}));
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { type: 'client' } }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme }) }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn(), track: jest.fn() }));
jest.mock('../../../services/specialistsService', () => ({
  getSpecialistDetails: jest.fn(),
  mapSpecialistToProfile: (data: SpecialistData) => ({ ...data, name: data.user.name }),
}));
jest.mock('../../../components/packages/ProfilePackages', () => ({ ProfilePackages: () => null }));
jest.mock('../../../components/common/alert', () => ({ showAppAlert: jest.fn(), useAppAlert: () => ({}) }));
jest.mock('../../../components/common', () => ({
  Button: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Pressable onPress={onPress}><Text>{children}</Text></Pressable>;
  },
}));
jest.mock('../../specialist-profile/components', () => ({ ProfileSkeleton: () => null }));
jest.mock('../../specialist-profile/SpecialistProfileLayout', () => ({
  SpecialistProfileLayout: ({ specialist }: { specialist: { name: string } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{specialist.name}</Text>;
  },
}));

const data = (id: string): SpecialistData => ({
  id, userId: `user-${id}`, user: { name: `Perfil ${id}` }, specialization: 'Psicología',
  professionalType: null, professionalTypeLabel: 'Psicología', description: 'Descripción',
  pricePerSession: 60, rating: 0, reviewCount: 0, firstVisitFree: false, avatar: null,
});
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); });

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
