import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QuestionnaireScreen } from '../QuestionnaireScreen';
import {
  QuestionnaireDraftProvider,
  useQuestionnaireDraft,
} from '../../../contexts/QuestionnaireDraftContext';
import {
  getQuestionnaireDefinition,
  type QuestionnaireDefinition,
} from '../../../services/questionnaireService';
import {
  emptyQuestionnaire,
  updateQuestionnaire,
  questionnaireStepError,
} from '../../../utils/questionnaireForm';
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: require('../../../constants/theme').lightTheme,
    isDark: false,
  }),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  usePreventRemove: jest.fn(),
}));
jest.mock('../../../components/common/alert', () => ({
  useAppAlert: jest.fn(),
  showAppAlert: jest.fn(),
}));
jest.mock('../../../services/questionnaireService', () => ({
  getQuestionnaireDefinition: jest.fn(),
}));
jest.mock('../../../components/location/AddressAutocomplete', () => ({
  AddressAutocomplete: () => null,
}));
jest.mock('../../../utils/secureRandom', () => ({
  createSecureRandomUuid: () => 'c125a2d7-6087-4aa1-8c35-8e5068e1407b',
}));
const definition: QuestionnaireDefinition = {
  version: '2',
  notice: 'Aviso de privacidad',
  noticeVersion: 'v1',
  groups: [],
  labels: {},
  choices: {
    therapyType: [
      { value: 'individual', label: 'Individual' },
      { value: 'family', label: 'Familiar' },
    ],
  },
  steps: Array.from({ length: 8 }, (_, index) => ({
    title: `Pregunta ${index + 1}`,
    shortTitle: `Sección ${index + 1}`,
    fields: [],
  })),
};
beforeEach(() => {
  jest.mocked(getQuestionnaireDefinition).mockResolvedValue(definition);
});
test('intro details expand without changing either consent checkbox', async () => {
  render(<QuestionnaireDraftProvider><QuestionnaireScreen /></QuestionnaireDraftProvider>);
  const disclosure = await screen.findByRole('button', { name: 'Sobre el cuestionario y tus datos' });
  expect(disclosure.props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByText(definition.notice)).toBeNull();
  expect(screen.getAllByRole('checkbox').map(item => item.props.accessibilityState.checked)).toEqual([false, false]);
  fireEvent.press(disclosure);
  expect(screen.getByText(definition.notice)).toBeTruthy();
  expect(disclosure.props.accessibilityState.expanded).toBe(true);
  fireEvent.press(disclosure);
  expect(screen.queryByText(definition.notice)).toBeNull();
  expect(screen.getAllByRole('checkbox').map(item => item.props.accessibilityState.checked)).toEqual([false, false]);
});
test('public questionnaire requires adult confirmation and matching consent; back preserves answers', async () => {
  render(
    <QuestionnaireDraftProvider>
      <QuestionnaireScreen />
    </QuestionnaireDraftProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('Comenzar cuestionario')).toBeTruthy(),
  );
  fireEvent.press(screen.getByText('Comenzar cuestionario'));
  expect(
    screen.getByText(
      'Confirma que eres mayor de edad y acepta el uso del cuestionario.',
    ),
  ).toBeTruthy();
  fireEvent.press(
    screen.getByText('Soy mayor de 18 años y respondo como persona adulta.'),
  );
  fireEvent.press(
    screen.getByText(
      'Acepto el uso de mis respuestas para las recomendaciones y el almacenamiento descrito en este aviso.',
    ),
  );
  fireEvent.press(screen.getByText('Comenzar cuestionario'));
  fireEvent.press(screen.getByText('Individual'));
  expect(
    screen.getByText(/Guardamos el tipo de terapia y las edades como contexto/),
  ).toBeTruthy();
  fireEvent.press(screen.getByText('Continuar'));
  fireEvent.press(screen.getByText('Anterior'));
  expect(
    screen.getByRole('radio', { name: 'Individual' }).props.accessibilityState
      .checked,
  ).toBe(true);
});
test('hidden dependencies are removed without losing unrelated answers', () => {
  const before = {
    ...emptyQuestionnaire(),
    therapyType: 'child',
    childAgeGroup: 'children',
    respondentRole: 'mother',
    concerns: ['anxiety'],
    modalities: ['in-person'],
    city: 'Madrid',
    previousTherapy: 'positive',
    previousPositive: 'Contexto',
    contexts: ['religion'],
    religion: 'christian',
  };
  const adult = updateQuestionnaire(before, 'therapyType', 'individual');
  expect(adult.childAgeGroup).toBe('');
  expect(adult.respondentRole).toBe('');
  expect(adult.concerns).toEqual(['anxiety']);
  expect(updateQuestionnaire(adult, 'modalities', ['online']).city).toBe('');
  expect(
    updateQuestionnaire(adult, 'previousTherapy', 'first').previousPositive,
  ).toBe('');
  expect(updateQuestionnaire(adult, 'contexts', []).religion).toBe('');
});
test('five areas maximum and optional last steps', () => {
  expect(
    questionnaireStepError(
      {
        ...emptyQuestionnaire(),
        concerns: ['anxiety', 'panic', 'depression', 'grief', 'trauma', 'emotions'],
      },
      4,
    ),
  ).toMatch(/cinco/);
  expect(questionnaireStepError(emptyQuestionnaire(), 7)).toBeNull();
  expect(questionnaireStepError(emptyQuestionnaire(), 8)).toBeNull();
});

test('review uses answer labels and editing a section preserves the selection', async () => {
  jest.mocked(getQuestionnaireDefinition).mockResolvedValue({
    ...definition,
    labels: { therapyType: 'Tipo de terapia' },
    steps: definition.steps.map((step, index) => ({
      ...step,
      fields: index === 0 ? ['therapyType'] : [],
    })),
  });
  function SeedReview() {
    const draft = useQuestionnaireDraft();
    React.useEffect(() => {
      draft.setAnswers({ ...emptyQuestionnaire(), therapyType: 'individual' });
      draft.setStep(8);
    }, []);
    return <QuestionnaireScreen />;
  }
  render(
    <QuestionnaireDraftProvider>
      <SeedReview />
    </QuestionnaireDraftProvider>,
  );
  await screen.findByText('Individual');
  expect(screen.getByText('Tipo de terapia')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Editar Sección 1' }));
  expect(
    screen.getByRole('radio', { name: 'Individual' }).props.accessibilityState
      .checked,
  ).toBe(true);
});

test('a sixth area shows an inline error and keeps the five existing selections', async () => {
  jest.mocked(getQuestionnaireDefinition).mockResolvedValue({
    ...definition,
    groups: [['emotional', 'Bienestar emocional']],
    choices: {
      concerns: ['Ansiedad', 'Tristeza', 'Pánico', 'Duelo', 'Emociones', 'Soledad'].map(
        (label, index) => ({ value: String(index), label, group: 'emotional' }),
      ),
    },
  });
  function SeedAreas() {
    const draft = useQuestionnaireDraft();
    React.useEffect(() => {
      draft.setStep(4);
    }, []);
    return <QuestionnaireScreen />;
  }
  render(
    <QuestionnaireDraftProvider>
      <SeedAreas />
    </QuestionnaireDraftProvider>,
  );
  await screen.findByRole('checkbox', { name: 'Ansiedad' });
  for (const name of ['Ansiedad', 'Tristeza', 'Pánico', 'Duelo', 'Emociones', 'Soledad']) {
    fireEvent.press(screen.getByRole('checkbox', { name }));
  }
  expect(
    screen.getByRole('checkbox', { name: 'Soledad' }).props.accessibilityState
      .checked,
  ).toBe(false);
  expect(
    screen
      .getAllByRole('checkbox')
      .filter((option) => option.props.accessibilityState.checked),
  ).toHaveLength(5);
  expect(screen.getByRole('alert').props.children).toMatch(/hasta cinco áreas/);
  fireEvent.press(screen.getByRole('checkbox', { name: 'Pánico' }));
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Soledad' }));
  expect(
    screen.getByRole('checkbox', { name: 'Soledad' }).props.accessibilityState
      .checked,
  ).toBe(true);
});

test('precise goals keep saved generic answers, enforce uncertainty exclusivity and appear in review', async () => {
  const goals = [
    {value:'pain',label:'Elaborar una experiencia dolorosa, un trauma o una pérdida'},
    {value:'trauma-recovery',label:'Superar experiencias traumáticas'},
    {value:'boundaries',label:'Aprender a establecer límites'},
    {value:'couple-family-conflicts',label:'Resolver conflictos de pareja o familiares'},
    {value:'unsure',label:'Todavía no lo tengo claro'},
  ];
  jest.mocked(getQuestionnaireDefinition).mockResolvedValue({...definition,labels:{goals:'Objetivos'},choices:{goals},steps:definition.steps.map((step,index)=>({...step,fields:index===4?['goals']:[]}))});
  function SeedGoals() {
    const draft = useQuestionnaireDraft();
    React.useEffect(() => {draft.setAnswers({...emptyQuestionnaire(),workingStyles:['guided'],goals:['pain'],previousTherapy:'first'});draft.setStep(5);}, []);
    return <QuestionnaireScreen />;
  }
  render(<QuestionnaireDraftProvider><SeedGoals /></QuestionnaireDraftProvider>);
  await screen.findByRole('checkbox',{name:goals[0].label});
  expect(screen.getByRole('checkbox',{name:goals[0].label})).toBeChecked();
  fireEvent.press(screen.getByRole('checkbox',{name:goals[1].label}));
  expect(screen.getByRole('checkbox',{name:goals[0].label})).toBeChecked();
  fireEvent.press(screen.getByRole('checkbox',{name:goals[4].label}));
  expect(screen.getByRole('checkbox',{name:goals[0].label})).not.toBeChecked();
  expect(screen.getByRole('checkbox',{name:goals[1].label})).not.toBeChecked();
  for (const goal of goals.slice(1,4)) fireEvent.press(screen.getByRole('checkbox',{name:goal.label}));
  expect(screen.getByRole('checkbox',{name:goals[4].label})).not.toBeChecked();
  fireEvent.press(screen.getByText('Continuar'));
  fireEvent.press(screen.getByText('Continuar'));
  fireEvent.press(screen.getByText('Continuar'));
  expect(screen.getByText(goals.slice(1,4).map(goal=>goal.label).join(' · '))).toBeTruthy();
});
