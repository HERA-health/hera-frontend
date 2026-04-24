import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { darkTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { AlertProvider } from '../../../components/common/alert';
import { getMatchedSpecialists } from '../../../services/specialistsService';
import { submitQuestionnaire } from '../../../services/questionnaireService';
import { QuestionnaireScreen } from '../QuestionnaireScreen';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../services/specialistsService', () => ({
  getMatchedSpecialists: jest.fn(),
}));

jest.mock('../../../services/questionnaireService', () => ({
  submitQuestionnaire: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  trackScreen: jest.fn(),
  track: jest.fn(),
}));

jest.mock('../../../utils/questionnaireData', () => ({
  categoryLabels: {
    specialties: 'Motivo de consulta',
  },
  questionnaire: [
    {
      id: 'q1',
      text: '¿Qué te gustaría trabajar?',
      type: 'single',
      category: 'specialties',
      options: [
        { id: 'q1-1', text: 'Ansiedad', value: 'anxiety', emoji: '🧠' },
      ],
    },
  ],
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedGetMatchedSpecialists = jest.mocked(getMatchedSpecialists);
const mockedSubmitQuestionnaire = jest.mocked(submitQuestionnaire);

describe('QuestionnaireScreen', () => {
  const navigate = jest.fn();
  const replace = jest.fn();
  const goBack = jest.fn();

  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockedUseNavigation.mockReturnValue({
      navigate,
      replace,
      goBack,
    } as ReturnType<typeof useNavigation>);

    mockedGetMatchedSpecialists.mockResolvedValue({
      hasCompletedQuestionnaire: false,
      specialists: [],
    });

    mockedSubmitQuestionnaire.mockResolvedValue({
      message: 'ok',
      specialists: [
        {
          id: 'specialist-1',
          userId: 'user-1',
          affinity: 90,
          matchedAttributes: ['specialty'],
          specialization: 'General',
          rating: 5,
          reviewCount: 2,
          description: 'Perfil compatible',
          pricePerSession: 50,
          firstVisitFree: true,
          avatar: null,
          user: { name: 'Hera' },
        },
      ],
    });

  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates submission to the questionnaire service and navigates to results', async () => {
    render(
      <AlertProvider>
        <QuestionnaireScreen />
      </AlertProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText('Verificando tu cuestionario...')).toBeNull();
    });

    fireEvent.press(screen.getByText('Comenzar'));
    fireEvent.press(screen.getByText('Ansiedad'));
    fireEvent.press(screen.getByText('Continuar'));
    fireEvent.press(screen.getByText('Buscar especialistas'));

    await waitFor(() => {
      expect(mockedSubmitQuestionnaire).toHaveBeenCalledWith({ q1: 'anxiety' });
      expect(navigate).toHaveBeenCalledWith(
        'QuestionnaireResults',
        expect.objectContaining({ results: expect.any(Array) })
      );
    });
  });
});
