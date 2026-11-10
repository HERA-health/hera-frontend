import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SpecialistsDirectoryScreen as SpecialistsScreen } from '../SpecialistsScreen';
jest.mock('../SpecialistDetailScreen', () => ({ SpecialistProfileContent: () => null }));
import * as service from '../../../services/specialistsService';
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
// Supply layout measurements missing from the native test host; keep real controls.
jest.mock('../../../components/common/AnimatedPressable', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const actual = jest.requireActual<typeof import('../../../components/common/AnimatedPressable')>('../../../components/common/AnimatedPressable');
  return { ...actual, AnimatedPressable: ({ focusRef, ...props }: Omit<React.ComponentProps<typeof actual.AnimatedPressable>, 'focusRef'> & { focusRef?: React.Ref<unknown> }) => {
    ReactModule.useImperativeHandle(focusRef, () => ({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(32, 220, 224, 44), focus: jest.fn(),
    }));
    return <actual.AnimatedPressable {...props} />;
  } };
});
let mockUser = { id: 'patient-one', type: 'client' };
jest.mock('@react-navigation/native', () => ({ CommonActions: jest.requireActual('@react-navigation/native').CommonActions, useNavigation: () => ({ navigate: mockNavigate, dispatch: mockDispatch }),
  useFocusEffect: (effect: () => void | (() => void)) => { jest.requireActual<typeof React>('react').useEffect(effect, [effect]); } }));
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn() }));
jest.mock('../../../services/clientService', () => ({ getMyClientProfile: jest.fn().mockResolvedValue({ homeLat: 40, homeLng: -3 }) }));
jest.mock('../../../hooks/useProfileOptions', () => ({ useProfileOptions: () => ({ options: { languages: [], religions: [], religionEnabled: false } }) }));
jest.mock('../../../services/specialistsService', () => ({
  resolveSpecialistAvatar: () => null, normalizeSpecialistDescription: (value: string) => value,
  getSpecialistPersonalization: jest.fn(), getMatchedSpecialists: jest.fn(), getAllSpecialists: jest.fn(),
  addFavoriteSpecialist: jest.fn(), removeFavoriteSpecialist: jest.fn(),
}));
const person: service.SpecialistData = { id: 'one', userId: 'pro-one', user: { name: 'Elena Martín' }, avatar: null,
  specialization: 'Psicología', professionalType: null, professionalTypeLabel: 'Especialista', description: 'Te acompaño.',
  pricePerSession: 60, firstVisitFree: false, rating: 0, reviewCount: 0, offersOnline: true,
  matchedOptionId: 'video', publicOptions: [{ specialistId: 'one', optionId: 'video', modality: 'VIDEO_CALL', priceCents: 6000, durationMinutes: 60 }] };
const empty = { favoriteSpecialistIds: [], favoriteSpecialists: [], primarySpecialist: null };
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'patient-one', type: 'client' };
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue(empty);
  jest.mocked(service.getMatchedSpecialists).mockResolvedValue({ specialists: [], hasCompletedQuestionnaire: true });
  jest.mocked(service.getAllSpecialists).mockResolvedValue([person]);
  jest.mocked(service.addFavoriteSpecialist).mockResolvedValue();
  jest.mocked(service.removeFavoriteSpecialist).mockResolvedValue();
});
test('opens the selected session and preserves recommendations without obsolete controls', async () => {
  render(<SpecialistsScreen />);
  fireEvent.press(await screen.findByLabelText('Abrir el perfil de Elena Martín'));
  expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetail', { specialistId: 'one', optionId: 'video' });
  fireEvent.press(screen.getByText('Ver recomendaciones'));
  expect(mockNavigate).toHaveBeenCalledWith('QuestionnaireResults', { adviceId: undefined });
  expect(screen.queryByText('Publicaciones')).toBeNull();
  expect(screen.queryByText('Top 1')).toBeNull();
});

test('recommendations opens the questionnaire when it is missing, without changing the button label', async () => {
  jest.mocked(service.getMatchedSpecialists).mockResolvedValue({ specialists: [], hasCompletedQuestionnaire: false });
  render(<SpecialistsScreen />);
  await screen.findByText('Elena Martín');
  fireEvent.press(screen.getByText('Ver recomendaciones'));
  expect(mockNavigate).toHaveBeenCalledWith('Questionnaire');
});

test('explicit exploration never redirects a linked patient and offers a quiet return action', async () => {
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue({ ...empty, primarySpecialist: {
    specialist: person, session: { id: 'appointment', date: '2027-01-01T10:00:00Z', status: 'CONFIRMED', type: 'VIDEO_CALL' },
  } });
  render(<SpecialistsScreen />);
  await screen.findByText('Elena Martín');
  expect(screen.getByText('Encuentra tu especialista')).toBeTruthy();
  expect(screen.queryByText('TU ESPECIALISTA')).toBeNull();
  expect(mockDispatch).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Mi especialista'));
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { name: 'Specialists', pop: true } }));
});

test('a recommendations failure does not send the patient to a new questionnaire', async () => {
  jest.mocked(service.getMatchedSpecialists).mockRejectedValue(new Error('offline'));
  render(<SpecialistsScreen />);
  await screen.findByText('No se pudieron cargar tus recomendaciones.');
  fireEvent.press(screen.getByText('Ver recomendaciones'));
  expect(mockNavigate).not.toHaveBeenCalled();
});
test('favorite actions do not navigate, persist through tabs and show the last-removal empty state', async () => {
  render(<SpecialistsScreen />);
  fireEvent.press(await screen.findByLabelText('Guardar a Elena Martín en favoritos'));
  await waitFor(() => expect(screen.getByLabelText('Quitar a Elena Martín de favoritos')).toBeTruthy());
  expect(mockNavigate).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('tab', { name: 'Favoritos' }));
  expect(screen.queryByText('Tus favoritos')).toBeNull();
  fireEvent.press(screen.getByLabelText('Quitar a Elena Martín de favoritos'));
  expect(await screen.findByText('Todavía no tienes favoritos')).toBeTruthy();
  expect(service.removeFavoriteSpecialist).toHaveBeenCalledWith('one');
});
test('search requires submission, handles accents and preserves criteria across tabs', async () => {
  render(<SpecialistsScreen />);
  await screen.findByText('Elena Martín');
  fireEvent.changeText(screen.getByLabelText('Buscar especialistas'), 'a');
  fireEvent.press(screen.getByText('Buscar'));
  expect(screen.getByText('Escribe entre 2 y 80 caracteres para buscar.')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Buscar especialistas'), 'MARTIN');
  fireEvent(screen.getByLabelText('Buscar especialistas'), 'submitEditing');
  expect(screen.getByText('Elena Martín')).toBeTruthy();
  fireEvent.press(screen.getByRole('tab', { name: 'Favoritos' }));
  expect(screen.getByLabelText('Buscar especialistas').props.value).toBe('MARTIN');
  fireEvent.press(screen.getByRole('tab', { name: 'Todos' }));
  expect(screen.getByText('Elena Martín')).toBeTruthy();
});
test('the content width controls sidebar visibility and proximity selects presencial', async () => {
  render(<SpecialistsScreen />);
  await screen.findByText('Elena Martín');
  fireEvent(screen.getByTestId('patient-directory'), 'layout', { nativeEvent: { layout: { width: 1200 } } });
  expect(screen.queryByLabelText('Abrir filtros')).toBeNull();
  fireEvent.press(screen.getByLabelText('Distancia'));
  fireEvent.press(screen.getByText('Hasta 10 km'));
  await waitFor(() => expect(service.getAllSpecialists).toHaveBeenLastCalledWith(expect.objectContaining({ modality: 'IN_PERSON', near: true, maxDistance: 10 })));
  fireEvent.press(screen.getByLabelText('Modalidad'));
  fireEvent.press(screen.getByText('Terapia online'));
  await waitFor(() => expect(service.getAllSpecialists).toHaveBeenLastCalledWith(expect.objectContaining({ modality: 'ONLINE', near: undefined })));
  expect(service.getSpecialistPersonalization).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByTestId('patient-directory'), 'layout', { nativeEvent: { layout: { width: 700 } } });
  expect(screen.getByLabelText('Filtros: 1 activos')).toBeTruthy();
});
test('changing accounts clears visible private state before the next response arrives', async () => {
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValueOnce({ ...empty, favoriteSpecialists: [person], favoriteSpecialistIds: ['one'] });
  const view = render(<SpecialistsScreen />);
  await screen.findByText('Favoritos · 1');
  jest.mocked(service.getSpecialistPersonalization).mockReturnValueOnce(new Promise(() => undefined));
  mockUser = { id: 'patient-two', type: 'client' };
  await act(async () => view.rerender(<SpecialistsScreen />));
  expect(screen.queryByText('Favoritos · 1')).toBeNull();
});
test('personalization failure is not presented as zero favorites and can recover', async () => {
  jest.mocked(service.getSpecialistPersonalization).mockRejectedValueOnce(new Error('offline'));
  render(<SpecialistsScreen />);
  await screen.findByText('Elena Martín');
  fireEvent.press(screen.getByRole('tab', { name: 'Favoritos' }));
  expect(screen.getByText('No se pudieron cargar tus favoritos')).toBeTruthy();
  expect(screen.queryByText('Todavía no tienes favoritos')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Todavía no tienes favoritos')).toBeTruthy();
});

test('favorites use current catalog prices and omit legacy amounts when offers are unavailable', async () => {
  const legacy = { ...person, pricePerSession: 10, publicOptions: undefined, matchedOptionId: undefined };
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue({ ...empty, favoriteSpecialists: [legacy], favoriteSpecialistIds: ['one'] });
  const view = render(<SpecialistsScreen />);
  await screen.findByText('Elena Martín');
  fireEvent.press(screen.getByRole('tab', { name: 'Favoritos' }));
  expect(screen.getByText('60\u00a0€')).toBeTruthy();
  expect(screen.queryByText('10\u00a0€')).toBeNull();
  view.unmount();
  jest.mocked(service.getAllSpecialists).mockRejectedValueOnce(new Error('offline'));
  render(<SpecialistsScreen />);
  await screen.findByText('No se pudo cargar el listado');
  fireEvent.press(screen.getByRole('tab', { name: 'Favoritos' }));
  expect(screen.getByText('Consulta las sesiones en el perfil')).toBeTruthy();
  expect(screen.queryByText('10\u00a0€')).toBeNull();
});
