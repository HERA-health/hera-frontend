import React from 'react';
import { act, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QuestionnaireDraftProvider,
  useQuestionnaireDraft,
  takeQuestionnaireDestination,
} from '../QuestionnaireDraftContext';
import { submitQuestionnaire } from '../../services/questionnaireService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockUser: { id: string; type: string; emailVerified: boolean } | null =
  null;
jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/questionnaireService', () => ({
  submitQuestionnaire: jest.fn(),
}));
jest.mock('../../utils/secureRandom', () => ({
  createSecureRandomUuid: () => 'test-submission',
}));
let draft: ReturnType<typeof useQuestionnaireDraft>;
function Probe() {
  draft = useQuestionnaireDraft();
  return null;
}

beforeEach(async () => {
  mockUser = null;
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('anonymous draft survives authentication and a failed save, saves before email verification, and stores only the destination', async () => {
  const tree = render(
    <QuestionnaireDraftProvider>
      <Probe />
    </QuestionnaireDraftProvider>,
  );
  act(() => {
    draft.setAnswers({
      version: '2',
      additionalNote: 'Private fixture context',
    });
    draft.setStep(8);
    draft.setAdult(true);
    draft.setAccepted(true);
  });
  act(() => draft.prepare('notice-v2'));
  mockUser = { id: 'owner', type: 'client', emailVerified: false };
  tree.rerender(
    <QuestionnaireDraftProvider>
      <Probe />
    </QuestionnaireDraftProvider>,
  );
  jest
    .mocked(submitQuestionnaire)
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ saved: true, adviceId: 'private-draft-id' });
  await act(async () => {
    await expect(draft.save()).rejects.toThrow('Offline');
  });
  expect(draft.answers.additionalNote).toBe('Private fixture context');
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
  await act(async () => {
    await draft.save();
  });
  const keys = await AsyncStorage.getAllKeys();
  expect(JSON.stringify(await AsyncStorage.multiGet(keys))).not.toContain(
    'Private fixture context',
  );
  expect(draft.ready).toBe(false);
  expect(draft.step).toBe(0);
  expect(await takeQuestionnaireDestination('owner')).toEqual({
    adviceId: 'private-draft-id',
  });
  expect(await takeQuestionnaireDestination('owner')).toBeNull();
  expect(jest.mocked(submitQuestionnaire).mock.calls[0]).toEqual(
    jest.mocked(submitQuestionnaire).mock.calls[1],
  );
});

test('changing accounts clears an unsaved health draft and cannot consume another account destination', async () => {
  mockUser = { id: 'first', type: 'client', emailVerified: true };
  const tree = render(
    <QuestionnaireDraftProvider>
      <Probe />
    </QuestionnaireDraftProvider>,
  );
  act(() => {
    draft.setAnswers({
      version: '2',
      additionalNote: 'Private fixture context',
    });
    draft.setStep(4);
  });
  mockUser = { id: 'second', type: 'client', emailVerified: true };
  tree.rerender(
    <QuestionnaireDraftProvider>
      <Probe />
    </QuestionnaireDraftProvider>,
  );
  expect(draft.answers.additionalNote).not.toBe('Private fixture context');
  await AsyncStorage.setItem(
    '@hera_questionnaire_destination_v2',
    JSON.stringify({ userId: 'first', adviceId: 'private-draft-id' }),
  );
  expect(await takeQuestionnaireDestination('second')).toBeNull();
});

test('a late save from a previous account cannot clear or block the new account draft', async () => {
  mockUser = {id: 'first', type: 'client', emailVerified: true};
  const tree = render(<QuestionnaireDraftProvider><Probe /></QuestionnaireDraftProvider>);
  act(() => {draft.setAdult(true); draft.setAccepted(true); draft.setStep(8);});
  act(() => draft.prepare('notice'));
  let finishFirst!: (result: {saved: boolean; adviceId: string | null}) => void;
  jest.mocked(submitQuestionnaire).mockImplementationOnce(() => new Promise(resolve => {finishFirst = resolve;}));
  let first!: Promise<void>;
  act(() => {first = draft.save();});
  mockUser = {id: 'second', type: 'client', emailVerified: true};
  tree.rerender(<QuestionnaireDraftProvider><Probe /></QuestionnaireDraftProvider>);
  act(() => {draft.setAnswers({version: '2', additionalNote: 'Second account'}); draft.setAdult(true); draft.setAccepted(true); draft.setStep(8);});
  act(() => draft.prepare('notice'));
  jest.mocked(submitQuestionnaire).mockResolvedValueOnce({saved: true, adviceId: null});
  await act(async () => {await draft.save();});
  expect(submitQuestionnaire).toHaveBeenCalledTimes(2);
  await act(async () => {finishFirst({saved: true, adviceId: 'first-private'}); await first;});
  expect(await takeQuestionnaireDestination('second')).toEqual({});
});
