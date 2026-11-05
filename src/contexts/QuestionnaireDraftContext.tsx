import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Platform, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { Button } from '../components/common/Button';
import { createSecureRandomUuid } from '../utils/secureRandom';
import { emptyQuestionnaire } from '../utils/questionnaireForm';
import {
  submitQuestionnaire,
  type QuestionnaireAnswers,
} from '../services/questionnaireService';
import { getErrorMessage } from '../constants/errors';

const destinationKey = '@hera_questionnaire_destination_v2';
// Only the destination and account scope persist. Answers never enter browser storage.
export async function takeQuestionnaireDestination(
  userId: string,
): Promise<{ adviceId?: string } | null> {
  const raw = await AsyncStorage.getItem(destinationKey);
  if (!raw) return null;
  await AsyncStorage.removeItem(destinationKey);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'userId' in parsed &&
      parsed.userId === userId
    ) {
      return 'adviceId' in parsed && typeof parsed.adviceId === 'string'
        ? { adviceId: parsed.adviceId }
        : {};
    }
  } catch {
    /* Ignore an invalid destination; the server still holds saved answers. */
  }
  return null;
}
interface DraftState {
  answers: QuestionnaireAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<QuestionnaireAnswers>>;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  accepted: boolean;
  setAccepted: (value: boolean) => void;
  adult: boolean;
  setAdult: (value: boolean) => void;
  ready: boolean;
  prepare: (notice: string) => void;
  save: () => Promise<void>;
  clear: () => void;
}
const DraftContext = createContext<DraftState | null>(null);
export function QuestionnaireDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState(emptyQuestionnaire);
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [adult, setAdult] = useState(false);
  const [ready, setReady] = useState(false);
  const notice = useRef('');
  const preparedContent = useRef('');
  const submission = useRef(createSecureRandomUuid());
  const owner = useRef<string | null>(user?.id ?? null);
  const inFlight = useRef<Promise<void> | null>(null);
  const generation = useRef(0);
  const clear = useCallback(() => {
    generation.current++;
    inFlight.current = null;
    setAnswers(emptyQuestionnaire());
    setStep(0);
    setAccepted(false);
    setAdult(false);
    setReady(false);
    submission.current = createSecureRandomUuid();
  }, []);
  useEffect(() => {
    if (owner.current && owner.current !== user?.id) clear();
    owner.current = user?.id ?? null;
  }, [user?.id, clear]);
  useEffect(() => {
    if (Platform.OS !== 'web' || step === 0) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [step]);
  const save = () => {
    if (inFlight.current) return inFlight.current;
    if (!user || user.type !== 'client' || !ready || !adult || !accepted)
      return Promise.reject(
        new Error(
          'Necesitamos una cuenta de paciente y tu aceptación para guardar.',
        ),
      );
    const userId = user.id;
    const savingGeneration = generation.current;
    const request = submitQuestionnaire(
      answers,
      notice.current,
      submission.current,
    )
      .then(async (result) => {
        if (owner.current !== userId || generation.current !== savingGeneration) return;
        await AsyncStorage.setItem(
          destinationKey,
          JSON.stringify({
            userId,
            ...(result.adviceId ? { adviceId: result.adviceId } : {}),
          }),
        );
        if (owner.current === userId && generation.current === savingGeneration) clear();
      })
      .finally(() => {
        if (inFlight.current === request) inFlight.current = null;
      });
    inFlight.current = request;
    return request;
  };
  return (
    <DraftContext.Provider
      value={{
        answers,
        setAnswers,
        step,
        setStep,
        adult,
        setAdult,
        accepted,
        setAccepted,
        ready,
        prepare: (version) => {
          const content = JSON.stringify({ answers, version });
          if (content !== preparedContent.current)
            submission.current = createSecureRandomUuid();
          preparedContent.current = content;
          notice.current = version;
          setReady(true);
        },
        save,
        clear,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}
export function useQuestionnaireDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error('QuestionnaireDraftProvider is required');
  return value;
}
export function QuestionnaireSaveGate() {
  const { save } = useQuestionnaireDraft();
  const { theme } = useTheme();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = () => {
    setBusy(true);
    setError('');
    void save()
      .catch((e) =>
        setError(
          getErrorMessage(
            e,
            'No se ha podido guardar. Tus respuestas siguen aquí; vuelve a intentarlo.',
          ),
        ),
      )
      .finally(() => setBusy(false));
  };
  useEffect(run, []);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: theme.fontHeading,
          fontSize: 28,
          color: theme.textPrimary,
        }}
      >
        Guardamos tus respuestas
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: theme.fontSans,
          color: theme.textSecondary,
          maxWidth: 520,
        }}
      >
        {error || 'Un momento. Después podrás continuar a tus resultados.'}
      </Text>
      {error ? (
        <Button loading={busy} onPress={run}>
          Reintentar guardado
        </Button>
      ) : null}
    </View>
  );
}
