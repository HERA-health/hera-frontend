import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SpecialistsScreen from '../SpecialistsScreen';
import { directoryIntent } from '../../../services/heraCommissionService';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { type: 'client' } }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../components/common/alert', () => ({ showAppAlert: jest.fn(), useAppAlert: () => ({}) }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn() }));
jest.mock('../../../services/clientService', () => ({ getMyClientProfile: jest.fn().mockResolvedValue({ homeLat: null, homeLng: null }) }));
jest.mock('../../../services/heraCommissionService', () => ({ directoryIntent: jest.fn() }));
jest.mock('../../../services/specialistsService', () => ({
  resolveSpecialistAvatar: () => undefined,
  normalizeSpecialistDescription: () => '',
  getSpecialistPersonalization: jest.fn().mockResolvedValue({ favoriteSpecialistIds: [], favoriteSpecialists: [], primarySpecialist: null }),
  getMatchedSpecialists: jest.fn().mockResolvedValue({ hasCompletedQuestionnaire: false, specialists: [] }),
  getAllSpecialists: jest.fn().mockResolvedValue([{
    id: 'specialist-one', user: { name: 'Perfil disponible' }, specialization: 'Psicología',
    professionalType: 'PSYCHOLOGIST_HEALTH', pricePerSession: 60, rating: 0, reviewCount: 0,
  }]),
}));
jest.mock('../../../components/common/ProfileDiscoveryFilters', () => ({ ProfileDiscoveryFilters: () => null }));
jest.mock('../../../components/common/SearchableProfileSelect', () => ({ SearchableProfileSelect: () => null }));
jest.mock('../components', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Card = ({ specialist, onPress }: { specialist: { name: string }; onPress: () => void }) =>
    <Pressable onPress={onPress}><Text>{specialist.name}</Text></Pressable>;
  return {
    SpecialistCardGrid: Card, SpecialistListItem: Card,
    SearchBar: () => null, SpecialistsLoadingState: () => null,
    LocationFilterDropdown: () => null, TopicFilterDropdown: () => null, ViewToggle: () => null,
  };
});

it('opens a profile from the signed-in directory even when the old attribution service is unavailable', async () => {
  jest.mocked(directoryIntent).mockImplementation(() => { throw new Error('Auxiliary service unavailable'); });
  render(<SpecialistsScreen />);
  fireEvent.press(await screen.findByText('Perfil disponible'));
  expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetail', { specialistId: 'specialist-one', affinity: 0 });
  expect(directoryIntent).not.toHaveBeenCalled();
});
