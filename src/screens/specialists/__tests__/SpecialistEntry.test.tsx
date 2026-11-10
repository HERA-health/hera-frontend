import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SpecialistsScreen from '../SpecialistsScreen';
import * as service from '../../../services/specialistsService';
import { getMyClientProfile } from '../../../services/clientService';
import { useDiscoveryRevalidation } from '../../../hooks/useDiscoveryRevalidation';

const mockNavigation = { navigate: jest.fn(), popTo: jest.fn(), dispatch: jest.fn() };
let mockUser = { id: 'patient-one', type: 'client' };
jest.mock('@react-navigation/native', () => ({
  CommonActions: jest.requireActual('@react-navigation/native').CommonActions,
  useNavigation: () => mockNavigation,
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual<typeof React>('react').useEffect(effect, [effect]),
}));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme }) }));
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../hooks/useProfileOptions', () => ({ useProfileOptions: jest.fn() }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn() }));
jest.mock('../../../services/clientService', () => ({ getMyClientProfile: jest.fn() }));
jest.mock('../../../services/specialistsService', () => ({ getSpecialistPersonalization: jest.fn(), getAllSpecialists: jest.fn(), getMatchedSpecialists: jest.fn() }));
jest.mock('../SpecialistDetailScreen', () => ({ SpecialistProfileContent: ({ route, continuity }: { route: { params: { specialistId: string } }; continuity: boolean }) => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return <Text>{continuity ? 'Tu especialista: ' : ''}{route.params.specialistId}</Text>;
} }));

const empty: service.SpecialistPersonalizationResponse = { primarySpecialist: null, favoriteSpecialists: [], favoriteSpecialistIds: [] };
const linked: service.SpecialistPersonalizationResponse = { ...empty, primarySpecialist: {
  specialist: { id: 'existing-specialist', userId: 'pro-one', user: { name: 'Elena' }, avatar: null, specialization: 'Psicología',
    professionalType: null, professionalTypeLabel: 'Especialista', description: '', pricePerSession: 60, rating: 0, reviewCount: 0, firstVisitFree: false },
  session: { id: 'managed-session', date: '2027-01-01T10:00:00Z', status: 'CONFIRMED', type: 'VIDEO_CALL' },
} };
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'patient-one', type: 'client' };
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue(linked);
});

test('waits for continuity without fetching or flashing discovery, including linked managed sessions', async () => {
  let resolve!: (value: service.SpecialistPersonalizationResponse) => void;
  jest.mocked(service.getSpecialistPersonalization).mockReturnValue(new Promise(done => { resolve = done; }));
  render(<SpecialistsScreen />);
  expect(screen.getByLabelText('Cargando tu especialista')).toBeTruthy();
  expect(screen.queryByText('Encuentra tu especialista')).toBeNull();
  await act(async () => resolve(linked));
  expect(screen.getByText('Tu especialista: existing-specialist')).toBeTruthy();
  expect(service.getAllSpecialists).not.toHaveBeenCalled();
  expect(service.getMatchedSpecialists).not.toHaveBeenCalled();
  expect(getMyClientProfile).not.toHaveBeenCalled();
  expect(mockNavigation.popTo).not.toHaveBeenCalled();
});

test('no relationship opens or reuses the explicit directory', async () => {
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue(empty);
  render(<SpecialistsScreen />);
  await waitFor(() => expect(mockNavigation.popTo).toHaveBeenCalledWith('SpecialistsDirectory', undefined, { merge: true }));
});

test('failed resolution is not absence; retry and voluntary exploration remain available', async () => {
  jest.mocked(service.getSpecialistPersonalization).mockRejectedValueOnce(new Error('offline'));
  render(<SpecialistsScreen />);
  fireEvent.press(await screen.findByText('Ver todos los especialistas'));
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { name: 'SpecialistsDirectory', pop: true } }));
  expect(mockNavigation.popTo).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Tu especialista: existing-specialist')).toBeTruthy();
});

test('revalidation resolves a cancelled last relationship and account changes clear private content', async () => {
  const view = render(<SpecialistsScreen />);
  await screen.findByText('Tu especialista: existing-specialist');
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValueOnce(empty);
  await act(async () => { await jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)?.[0](); });
  expect(mockNavigation.popTo).toHaveBeenCalled();
  jest.mocked(service.getSpecialistPersonalization).mockReturnValue(new Promise(() => undefined));
  mockUser = { id: 'patient-two', type: 'client' };
  view.rerender(<SpecialistsScreen />);
  expect(screen.queryByText('Tu especialista: existing-specialist')).toBeNull();
  expect(screen.getByLabelText('Cargando tu especialista')).toBeTruthy();
});
