import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QuestionnaireResultsScreen } from '../QuestionnaireResultsScreen';
import { getMatchedSpecialists, type SpecialistData } from '../../../services/specialistsService';
import { getAssistedResults, withdrawQuestionnaireConsent } from '../../../services/questionnaireService';
let mockAdviceId: string | undefined;
jest.mock('@react-navigation/native', () => ({useNavigation: () => ({navigate: jest.fn()}), useRoute: () => ({params: {adviceId: mockAdviceId}})}));
jest.mock('../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../constants/theme').lightTheme})}));
jest.mock('../../../hooks/useProfileOptions', () => ({useProfileOptions: () => ({options: null})}));
jest.mock('../../../services/specialistsService', () => ({getMatchedSpecialists: jest.fn(), invalidateSpecialistsCache: jest.fn(), addFavoriteSpecialist: jest.fn()}));
jest.mock('../../../services/questionnaireService', () => ({getAssistedResults: jest.fn(), withdrawQuestionnaireConsent: jest.fn()}));
beforeEach(() => {jest.clearAllMocks(); mockAdviceId = undefined;});
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
