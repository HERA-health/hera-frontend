import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QuestionnaireResultsScreen } from '../QuestionnaireResultsScreen';
import { addFavoriteSpecialist, getFavoriteSpecialistStatus, removeFavoriteSpecialist, getMatchedSpecialists, type SpecialistData } from '../../../services/specialistsService';
import { getAssistedResults, withdrawQuestionnaireConsent, sendAdvice } from '../../../services/questionnaireService';
let mockAdviceId: string | undefined;
const mockNavigate = jest.fn();
const mockListeners = new Set<() => void>();
const mockNavigation = {navigate: mockNavigate, isFocused: () => true, addListener: (_event: string, callback: () => void) => {mockListeners.add(callback); return () => mockListeners.delete(callback);}};
jest.mock('@react-navigation/native', () => ({useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]), useNavigation: () => mockNavigation, useRoute: () => ({params: {adviceId: mockAdviceId}})}));
jest.mock('../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../constants/theme').lightTheme})}));
jest.mock('../../../hooks/useProfileOptions', () => ({useProfileOptions: () => ({options: null})}));
jest.mock('../../../services/specialistsService', () => ({getMatchedSpecialists: jest.fn(), invalidateSpecialistsCache: jest.fn(), addFavoriteSpecialist: jest.fn(), getFavoriteSpecialistStatus: jest.fn(), removeFavoriteSpecialist: jest.fn()}));
jest.mock('../../../services/questionnaireService', () => ({getAssistedResults: jest.fn(), withdrawQuestionnaireConsent: jest.fn(), sendAdvice: jest.fn()}));
jest.mock('../../../utils/secureRandom', () => ({createSecureRandomUuid: () => 'test-submission-id'}));
beforeEach(() => {jest.clearAllMocks(); mockAdviceId = undefined; jest.mocked(getFavoriteSpecialistStatus).mockResolvedValue(false); jest.mocked(addFavoriteSpecialist).mockResolvedValue(); jest.mocked(removeFavoriteSpecialist).mockResolvedValue();});
afterEach(() => jest.restoreAllMocks());
const professional: SpecialistData = {id: 'one', userId: 'user', user: {name: 'Resultado antiguo'}, specialization: '', professionalType: 'PSYCHOLOGIST_HEALTH', professionalTypeLabel: 'Psicólogo sanitario', description: '', pricePerSession: 50, rating: 0, reviewCount: 0, firstVisitFree: false, avatar: null};

test.each([undefined, 'minor-request'])('external consent withdrawal invalidates a pending result (%s)', async adviceId => {
  mockAdviceId = adviceId;
  let finish!: () => void;
  jest.mocked(getMatchedSpecialists).mockImplementationOnce(()=>new Promise(resolve=>{finish=()=>resolve({specialists:[professional],hasCompletedQuestionnaire:true});}));
  jest.mocked(getAssistedResults).mockImplementationOnce(()=>new Promise(resolve=>{finish=()=>resolve({specialists:[professional],consentWithdrawn:false,privateDraft:true,expiresAt:null});}));
  render(<QuestionnaireResultsScreen />);
  require('../../../utils/specialistDiscoveryRevision').invalidateSpecialistDiscovery();
  await act(async()=>finish());
  expect(screen.queryByText('Resultado antiguo')).toBeNull();
  expect(screen.getByText('La búsqueda ha cambiado. Actualiza los resultados.')).toBeTruthy();
  jest.mocked(getMatchedSpecialists).mockReset();
  jest.mocked(getAssistedResults).mockReset();
});

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

test.each([undefined, 'minor-request'])('clarification has a distinct explanation and an independent directory (%s)', async adviceId => {
  mockAdviceId = adviceId;
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists: [], hasCompletedQuestionnaire: true, needsClarification: true});
  jest.mocked(getAssistedResults).mockResolvedValue({specialists: [], consentWithdrawn: false, privateDraft: true, expiresAt: null, needsClarification: true});
  render(<QuestionnaireResultsScreen />);
  await screen.findByText('Necesitamos concretar un área de apoyo.');
  fireEvent.press(screen.getByText('Explorar directorio'));
  expect(mockNavigate).toHaveBeenCalledWith('Specialists');
});

test.each([undefined, 'minor-request'])('agenda retry identifies the selected professional (%s)', async adviceId => {
  mockAdviceId = adviceId;
  const specialists = [{...professional, availabilityStatus: 'UNKNOWN' as const}];
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists, hasCompletedQuestionnaire: true});
  jest.mocked(getAssistedResults).mockResolvedValue({specialists, consentWithdrawn: false, privateDraft: true, expiresAt: null});
  render(<QuestionnaireResultsScreen />);
  fireEvent.press(await screen.findByText('Reintentar agenda'));
  await screen.findByText('Resultado antiguo');
  if (adviceId) expect(getAssistedResults).toHaveBeenLastCalledWith(adviceId, {prioritizeAvailabilityFor: 'one'});
  else expect(getMatchedSpecialists).toHaveBeenLastCalledWith({prioritizeAvailabilityFor: 'one', forceRefresh: true});
});

test('counts, declared presentation, selected option and focus refresh survive return from booking', async () => {
  const specialists = Array.from({length: 5}, (_, i) => ({...professional, id: `pro-${i}`, matchedOptionId: 'chosen', description: 'Presentación declarada por la profesional.', matchingProfile: {therapeuticApproach: ['cbt', 'emdr', 'eft'], customTherapeuticApproaches: ['Enfoque propio']}}));
  jest.mocked(getMatchedSpecialists).mockResolvedValue({specialists, hasCompletedQuestionnaire: true});
  render(<QuestionnaireResultsScreen />);
  await screen.findByText('Mostrando 3 de 5 profesionales. Quedan 2 por ver.');
  fireEvent.press(screen.getAllByText('Ver presentación completa')[0]);
  expect(screen.getByText(/Enfoque propio/)).toBeTruthy();
  fireEvent.press(screen.getAllByText('Ver perfil')[0]);
  expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetail', {adviceId: undefined, specialistId: 'pro-0', optionId: 'chosen'});
  fireEvent.press(screen.getByText('Ver más profesionales'));
  expect(screen.getByText('Mostrando 5 de 5 profesionales. Quedan 0 por ver.')).toBeTruthy();
  require('../../../utils/specialistDiscoveryRevision').invalidateSpecialistDiscovery();
  jest.replaceProperty(Platform, 'OS', 'web');
  await act(async () => {mockListeners.forEach(listener => listener());});
  expect(getMatchedSpecialists).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Mostrando 5 de 5 profesionales. Quedan 0 por ver.')).toBeTruthy();
});

test('an ineligible retry can recover with a fresh search', async () => {
  jest.mocked(getMatchedSpecialists)
    .mockResolvedValueOnce({specialists:[{...professional,availabilityStatus:'UNKNOWN'}],hasCompletedQuestionnaire:true})
    .mockRejectedValueOnce(new Error('La búsqueda ha cambiado. Actualiza los resultados.'))
    .mockResolvedValueOnce({specialists:[],hasCompletedQuestionnaire:true});
  render(<QuestionnaireResultsScreen />);
  fireEvent.press(await screen.findByText('Reintentar agenda'));
  await screen.findByText('La búsqueda ha cambiado. Actualiza los resultados.');
  fireEvent.press(screen.getByText('Actualizar búsqueda'));
  await screen.findByText('No encontramos un encaje suficiente con estas preferencias.');
});

test('changing assisted search discards a late response from the previous search', async () => {
  let finish!: (value: Awaited<ReturnType<typeof getAssistedResults>>) => void;
  mockAdviceId = 'old-search';
  jest.mocked(getAssistedResults).mockImplementationOnce(() => new Promise(resolve => {finish=resolve;}))
    .mockResolvedValueOnce({specialists:[],consentWithdrawn:false,privateDraft:true,expiresAt:null,needsClarification:true});
  const view = render(<QuestionnaireResultsScreen />);
  mockAdviceId = 'new-search';
  view.rerender(<QuestionnaireResultsScreen />);
  await screen.findByText('Necesitamos concretar un área de apoyo.');
  await act(async () => finish({specialists:[professional],consentWithdrawn:false,privateDraft:true,expiresAt:null}));
  expect(screen.queryByText('Resultado antiguo')).toBeNull();
});
