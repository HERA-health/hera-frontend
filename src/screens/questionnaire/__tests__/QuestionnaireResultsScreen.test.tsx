import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QuestionnaireResultsScreen } from '../QuestionnaireResultsScreen';
import { addFavoriteSpecialist, getFavoriteSpecialistStatus, removeFavoriteSpecialist, getMatchedSpecialists, type SpecialistData } from '../../../services/specialistsService';
import { getAssistedResults, withdrawQuestionnaireConsent, sendAdvice } from '../../../services/questionnaireService';
let mockAdviceId: string | undefined;
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]), useNavigation: () => ({navigate: mockNavigate}), useRoute: () => ({params: {adviceId: mockAdviceId}})}));
jest.mock('../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../constants/theme').lightTheme})}));
jest.mock('../../../hooks/useProfileOptions', () => ({useProfileOptions: () => ({options: null})}));
jest.mock('../../../services/specialistsService', () => ({getMatchedSpecialists: jest.fn(), invalidateSpecialistsCache: jest.fn(), addFavoriteSpecialist: jest.fn(), getFavoriteSpecialistStatus: jest.fn(), removeFavoriteSpecialist: jest.fn()}));
jest.mock('../../../services/questionnaireService', () => ({getAssistedResults: jest.fn(), withdrawQuestionnaireConsent: jest.fn(), sendAdvice: jest.fn()}));
jest.mock('../../../utils/secureRandom', () => ({createSecureRandomUuid: () => 'test-submission-id'}));
beforeEach(() => {jest.clearAllMocks(); mockAdviceId = undefined; jest.mocked(getFavoriteSpecialistStatus).mockResolvedValue(false); jest.mocked(addFavoriteSpecialist).mockResolvedValue(); jest.mocked(removeFavoriteSpecialist).mockResolvedValue();});
const professional: SpecialistData = {id: 'one', userId: 'user', user: {name: 'Resultado antiguo'}, specialization: '', professionalType: 'PSYCHOLOGIST_HEALTH', professionalTypeLabel: 'Psicólogo sanitario', description: '', pricePerSession: 50, rating: 0, reviewCount: 0, firstVisitFree: false, avatar: null};

test('results explain that therapy type and ages are not matched', async () => {
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists: [professional], hasCompletedQuestionnaire: true});
  render(<QuestionnaireResultsScreen />);
  await screen.findByText('Resultado antiguo');
  expect(screen.getByText(/El tipo de terapia y las edades indicadas no se usan/)).toBeTruthy();
  expect(screen.queryByText('Servicio compatible con tus preferencias')).toBeNull();
});

test('a recommendation response arriving after withdrawal cannot restore the cards', async () => {
  let finish!: (value: Awaited<ReturnType<typeof getMatchedSpecialists>>) => void;
  jest.mocked(getMatchedSpecialists).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  jest.mocked(withdrawQuestionnaireConsent).mockResolvedValue();
  render(<QuestionnaireResultsScreen />);
  fireEvent.press(screen.getByText('Retirar consentimiento para nuevas recomendaciones'));
  await waitFor(() => expect(screen.getByText('Actualiza tus respuestas para recibir recomendaciones.')).toBeTruthy());
  await act(async () => {finish({specialists: [professional], hasCompletedQuestionnaire: true});});
  expect(screen.queryByText('Resultado antiguo')).toBeNull();
});

test('reloading a withdrawn minor request explains withdrawal instead of absence of specialists', async () => {
  mockAdviceId = 'minor-request';
  jest.mocked(getAssistedResults).mockResolvedValue({specialists: [], consentWithdrawn: true, privateDraft: false, expiresAt: null});
  render(<QuestionnaireResultsScreen />);
  await waitFor(() => expect(screen.getByText('Has retirado el consentimiento para nuevas recomendaciones.')).toBeTruthy());
  expect(screen.queryByText(/Tu borrador es privado/)).toBeNull();
});

test('favorite reflects persisted state and toggles without navigating', async () => {
  jest.mocked(getFavoriteSpecialistStatus).mockResolvedValue(true);
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists: [professional], hasCompletedQuestionnaire: true});
  render(<QuestionnaireResultsScreen />);
  fireEvent.press(await screen.findByRole('button', {name: 'Quitar a Resultado antiguo de favoritos'}));
  await screen.findByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'});
  expect(removeFavoriteSpecialist).toHaveBeenCalledWith('one');
  fireEvent.press(screen.getByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'}));
  await screen.findByRole('button', {name: 'Quitar a Resultado antiguo de favoritos'});
  expect(addFavoriteSpecialist).toHaveBeenCalledWith('one');
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('failed favorite update preserves its state and displays a local error', async () => {
  jest.mocked(addFavoriteSpecialist).mockRejectedValueOnce(new Error('No se pudo guardar el favorito.'));
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists: [professional], hasCompletedQuestionnaire: true});
  render(<QuestionnaireResultsScreen />);
  fireEvent.press(await screen.findByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'}));
  await screen.findByText('No se pudo guardar el favorito.');
  expect(screen.getByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'})).toBeTruthy();
  expect(screen.getByText('Elegir cita')).toBeTruthy();
});

test('unknown favorite state can be retried and pending updates cannot be duplicated', async () => {
  jest.mocked(getFavoriteSpecialistStatus).mockRejectedValueOnce(new Error('No se pudo consultar el favorito.'));
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists: [professional], hasCompletedQuestionnaire: true});
  render(<QuestionnaireResultsScreen />);
  await screen.findByText(/No se pudo consultar el favorito/);
  expect(screen.queryByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'})).toBeNull();
  fireEvent.press(screen.getByRole('button', {name: 'Consultar favorito'}));
  const button = await screen.findByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'});
  let finish!: () => void;
  jest.mocked(addFavoriteSpecialist).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  fireEvent.press(button);
  fireEvent.press(button);
  expect(addFavoriteSpecialist).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', {name: 'Guardar a Resultado antiguo en favoritos'})).toBeDisabled();
  await act(async () => { finish(); });
  expect(screen.getByRole('button', {name: 'Quitar a Resultado antiguo de favoritos'})).toBeTruthy();
});

test('reasons expand without hiding the partial match and booking retains the matched option', async () => {
  const result = {...professional, partialMatch: true, matchedOptionId: 'option-1', matchingReasons: [1,2,3,4].map(index => ({kind: 'direct' as const, answer: 'anxiety', evidence: 'anxiety', label: `Motivo ${index}`}))};
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists: [result], hasCompletedQuestionnaire: true});
  render(<QuestionnaireResultsScreen />);
  await screen.findByText('Coincidencia parcial con tus áreas');
  expect(screen.queryByText('Motivo 4')).toBeNull();
  fireEvent.press(screen.getByText('Ver todos los motivos (4)'));
  expect(screen.getByText('Motivo 4')).toBeTruthy();
  fireEvent.press(screen.getByText('Elegir cita'));
  expect(mockNavigate).toHaveBeenCalledWith('Booking', {specialistId: 'one', optionId: 'option-1'});
});

test('assisted results direct interest to orientation instead of booking', async () => {
  mockAdviceId = 'minor-request';
  jest.mocked(getAssistedResults).mockResolvedValue({specialists: [professional], consentWithdrawn: false, privateDraft: true, expiresAt: null});
  render(<QuestionnaireResultsScreen />);
  fireEvent.press(await screen.findByText('Me interesa este profesional'));
  expect(screen.getByLabelText('Cuéntanos qué necesitas')).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Cuéntanos qué necesitas'), 'Me interesa este profesional');
  jest.mocked(sendAdvice).mockRejectedValueOnce(new Error('Sin conexión'));
  fireEvent.press(screen.getByText('Enviar solicitud al equipo'));
  await screen.findByText('Sin conexión');
  expect(sendAdvice).toHaveBeenCalledWith(expect.objectContaining({specialistId: 'one', shareQuestionnaire: false}), 'minor-request');
  expect(screen.queryByText('Elegir cita')).toBeNull();
});
