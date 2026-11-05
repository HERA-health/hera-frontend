import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QuestionnaireScreen } from '../QuestionnaireScreen';
import { QuestionnaireDraftProvider } from '../../../contexts/QuestionnaireDraftContext';
import { getQuestionnaireDefinition, type QuestionnaireDefinition } from '../../../services/questionnaireService';
import { emptyQuestionnaire, updateQuestionnaire, questionnaireStepError } from '../../../utils/questionnaireForm';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), usePreventRemove: jest.fn() }));
jest.mock('../../../components/common/alert', () => ({useAppAlert: jest.fn(), showAppAlert: jest.fn()}));
jest.mock('../../../services/questionnaireService', () => ({ getQuestionnaireDefinition: jest.fn() }));
jest.mock('../../../components/location/AddressAutocomplete', () => ({ AddressAutocomplete: () => null }));
jest.mock('../../../utils/secureRandom', () => ({ createSecureRandomUuid: () => 'c125a2d7-6087-4aa1-8c35-8e5068e1407b' }));
const definition: QuestionnaireDefinition = { version: '2', notice: 'Aviso de privacidad', noticeVersion: 'v1',
  groups: [], labels: {}, choices: { therapyType: [{value:'individual',label:'Individual'}, {value:'family',label:'Familiar'}] },
  steps: Array.from({length: 8}, (_, index) => ({title:`Pregunta ${index + 1}`,shortTitle:`Sección ${index + 1}`,fields:[]})),
};
beforeEach(() => { jest.mocked(getQuestionnaireDefinition).mockResolvedValue(definition); });
test('public questionnaire requires adult confirmation and matching consent; back preserves answers', async () => {
  render(<QuestionnaireDraftProvider><QuestionnaireScreen /></QuestionnaireDraftProvider>);
  await waitFor(() => expect(screen.getByText('Comenzar')).toBeTruthy());
  fireEvent.press(screen.getByText('Comenzar'));
  expect(screen.getByText('Confirma que eres mayor de edad y acepta el uso del cuestionario.')).toBeTruthy();
  fireEvent.press(screen.getByText('Soy mayor de 18 años y respondo como persona adulta.'));
  fireEvent.press(screen.getByText('Acepto el uso de mis respuestas para las recomendaciones y el almacenamiento descrito en este aviso.'));
  fireEvent.press(screen.getByText('Comenzar'));
  fireEvent.press(screen.getByText('Individual'));
  expect(screen.getByText(/Guardamos el tipo de terapia y las edades como contexto/)).toBeTruthy();
  fireEvent.press(screen.getByText('Continuar'));
  fireEvent.press(screen.getByText('Anterior'));
  expect(screen.getByRole('radio', {name:'Individual'}).props.accessibilityState.checked).toBe(true);
});
test('hidden dependencies are removed without losing unrelated answers', () => {
  const before = {...emptyQuestionnaire(), therapyType:'child', childAgeGroup:'children', respondentRole:'mother', concerns:['anxiety'], modalities:['in-person'], city:'Madrid', previousTherapy:'positive', previousPositive:'Contexto', contexts:['religion'], religion:'christian'};
  const adult = updateQuestionnaire(before, 'therapyType', 'individual');
  expect(adult.childAgeGroup).toBe(''); expect(adult.respondentRole).toBe(''); expect(adult.concerns).toEqual(['anxiety']);
  expect(updateQuestionnaire(adult, 'modalities', ['online']).city).toBe('');
  expect(updateQuestionnaire(adult, 'previousTherapy', 'first').previousPositive).toBe('');
  expect(updateQuestionnaire(adult, 'contexts', []).religion).toBe('');
});
test('three areas maximum and optional last steps', () => {
  expect(questionnaireStepError({...emptyQuestionnaire(), concerns:['anxiety','panic','depression','grief']},4)).toMatch(/tres/);
  expect(questionnaireStepError(emptyQuestionnaire(),7)).toBeNull();
  expect(questionnaireStepError(emptyQuestionnaire(),8)).toBeNull();
});
