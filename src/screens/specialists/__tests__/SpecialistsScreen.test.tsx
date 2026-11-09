import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import SpecialistsScreen from '../SpecialistsScreen';
import { directoryIntent } from '../../../services/heraCommissionService';
import { getMatchedSpecialists } from '../../../services/specialistsService';

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
jest.mock('../../../components/common/SearchableProfileSelect', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SearchableProfileSelect: ({ label, options, values, onChange }: {
      label: string; options: { value: string }[]; values: string[]; onChange: (values: string[]) => void;
    }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onChange([options[0].value])}>
      <Text>{label}: {values.length}</Text>
    </Pressable>,
  };
});
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
  expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetail', { specialistId: 'specialist-one', optionId: undefined });
  expect(directoryIntent).not.toHaveBeenCalled();
});

it('keeps filters in the panel, counts selections and clears every selected group', async () => {
  render(<SpecialistsScreen />);
  await screen.findByText('Perfil disponible');
  expect(screen.queryByText('Especialidades: 0')).toBeNull();
  fireEvent.press(screen.getByLabelText('Abrir filtros'));
  await act(async () => {
    for (const label of ['Especialidades', 'Enfoques terapéuticos', 'Tipo profesional', 'Motivo de consulta']) {
      fireEvent.press(screen.getByLabelText(label));
    }
  });
  fireEvent.press(screen.getByLabelText('Cerrar filtros'));
  fireEvent.press(screen.getByLabelText('Filtros: 4 activos'));
  await act(async () => { fireEvent.press(screen.getByLabelText('Limpiar filtros')); });
  for (const label of ['Especialidades', 'Enfoques terapéuticos', 'Tipo profesional', 'Motivo de consulta']) {
    expect(screen.getByText(`${label}: 0`)).toBeTruthy();
  }
  fireEvent.press(screen.getByLabelText('Cerrar filtros'));
  expect(screen.getByLabelText('Abrir filtros')).toBeTruthy();
});

it('hides specialist controls on the publications tab and restores them on return', async () => {
  render(<SpecialistsScreen />);
  await screen.findByText('Perfil disponible');
  fireEvent.press(screen.getByRole('tab', { name: 'Publicaciones' }));
  expect(screen.queryByLabelText('Abrir filtros')).toBeNull();
  expect(screen.getByText('Publicaciones, pronto')).toBeTruthy();
  fireEvent.press(screen.getByRole('tab', { name: 'Especialistas' }));
  expect(screen.getByLabelText('Abrir filtros')).toBeTruthy();
});

it.each([false, true])('opens saved recommendations only after completing the questionnaire (%s)', async (completed) => {
  jest.mocked(getMatchedSpecialists).mockResolvedValueOnce({ hasCompletedQuestionnaire: completed, specialists: [] });
  render(<SpecialistsScreen />);
  await screen.findByText('Perfil disponible');
  fireEvent.press(screen.getByLabelText(completed ? 'Ver recomendaciones' : 'Hacer cuestionario'));
  if (completed) {
    expect(mockNavigate).toHaveBeenLastCalledWith('QuestionnaireResults', { adviceId: undefined });
  } else {
    expect(mockNavigate).toHaveBeenLastCalledWith('Questionnaire');
  }
});
