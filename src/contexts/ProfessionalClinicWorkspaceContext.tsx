import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  getProfessionalClinicAccess,
  getProfessionalClinicContexts,
  type ProfessionalClinicContext,
} from '../services/clinic/professionalWorkspaceService';

const STORAGE_PREFIX = 'hera:professional-clinic:selected:';
const RESUME_REVALIDATION_MS = 30_000;

type ContextStatus = 'loading' | 'ready' | 'error';

interface ProfessionalClinicWorkspaceValue {
  contexts: ProfessionalClinicContext[];
  hasActiveCareLink: boolean | null;
  selectedClinicId: string | null;
  selectedContext: ProfessionalClinicContext | null;
  status: ContextStatus;
  error: string | null;
  totalPendingTasks: number | null;
  selectClinic: (clinicId: string) => Promise<boolean>;
  refreshContexts: (force?: boolean) => Promise<void>;
}

const Context = createContext<ProfessionalClinicWorkspaceValue | undefined>(undefined);

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };
const settle = async <T,>(promise: Promise<T>): Promise<Settled<T>> => {
  try {
    return { ok: true, value: await promise };
  } catch (error: unknown) {
    return { ok: false, error };
  }
};

const storageKeyFor = (userId: string): string => `${STORAGE_PREFIX}${userId}`;

export function ProfessionalClinicWorkspaceProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [contexts, setContexts] = useState<ProfessionalClinicContext[]>([]);
  const [hasActiveCareLink, setHasActiveCareLink] = useState<boolean | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [status, setStatus] = useState<ContextStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const lastSuccessAt = useRef(0);
  const appState = useRef<AppStateStatus>(AppState.currentState ?? 'active');

  const refreshContexts = useCallback(async (force = false): Promise<void> => {
    if (!userId) {
      requestSequence.current += 1;
      setContexts([]);
      setHasActiveCareLink(false);
      setSelectedClinicId(null);
      setStatus('ready');
      setError(null);
      return;
    }
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setStatus('loading');
    setError(null);
    try {
      const [contextsResult, accessResult, storedClinicId] = await Promise.all([
        settle(getProfessionalClinicContexts(userId, force)),
        settle(getProfessionalClinicAccess(userId, force)),
        AsyncStorage.getItem(storageKeyFor(userId)).catch(() => null),
      ]);
      if (requestSequence.current !== requestId) return;
      setHasActiveCareLink(
        accessResult.ok
          ? accessResult.value.hasActiveCareLink
          : contextsResult.ok
            ? contextsResult.value.length > 0
            : null,
      );
      if (!contextsResult.ok) throw contextsResult.error;
      const nextContexts = contextsResult.value;
      const currentIsValid = selectedClinicId
        ? nextContexts.some((item) => item.clinic.id === selectedClinicId)
        : false;
      const storedIsValid = storedClinicId
        ? nextContexts.some((item) => item.clinic.id === storedClinicId)
        : false;
      const nextSelectedId = currentIsValid
        ? selectedClinicId
        : storedIsValid
          ? storedClinicId
          : nextContexts[0]?.clinic.id ?? null;
      setContexts(nextContexts);
      setSelectedClinicId(nextSelectedId);
      setStatus('ready');
      lastSuccessAt.current = Date.now();
      if (nextSelectedId && nextSelectedId !== storedClinicId) {
        await AsyncStorage.setItem(storageKeyFor(userId), nextSelectedId).catch(() => undefined);
      }
      if (!nextSelectedId) {
        await AsyncStorage.removeItem(storageKeyFor(userId)).catch(() => undefined);
      }
    } catch (loadError: unknown) {
      if (requestSequence.current !== requestId) return;
      setContexts([]);
      setSelectedClinicId(null);
      setStatus('error');
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus clínicas.');
    }
  }, [selectedClinicId, userId]);

  useEffect(() => {
    setContexts([]);
    setHasActiveCareLink(null);
    setSelectedClinicId(null);
    setError(null);
    setStatus('loading');
    void refreshContexts();
    return () => { requestSequence.current += 1; };
  }, [userId]); // The callback intentionally resets with the authentication boundary.

  useEffect(() => {
    const refreshAfterResume = (): void => {
      if (Date.now() - lastSuccessAt.current >= RESUME_REVALIDATION_MS) {
        void refreshContexts(true);
      }
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasInactive = appState.current !== 'active';
      appState.current = nextState;
      if (nextState === 'active' && wasInactive) refreshAfterResume();
    });
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return () => subscription.remove();
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') refreshAfterResume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      subscription.remove();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshContexts]);

  const selectClinic = useCallback(async (clinicId: string): Promise<boolean> => {
    if (!userId || !contexts.some((item) => item.clinic.id === clinicId)) return false;
    requestSequence.current += 1;
    // Clear the selected context immediately so children cannot render data from
    // the previous clinic while the new namespace is loading.
    setSelectedClinicId(null);
    await Promise.resolve();
    setSelectedClinicId(clinicId);
    await AsyncStorage.setItem(storageKeyFor(userId), clinicId).catch(() => undefined);
    return true;
  }, [contexts, userId]);

  const selectedContext = useMemo(
    () => contexts.find((item) => item.clinic.id === selectedClinicId) ?? null,
    [contexts, selectedClinicId],
  );
  const totalPendingTasks = useMemo(() => {
    if (contexts.some((item) => item.attention.pendingTaskCount === null)) return null;
    return contexts.reduce((sum, item) => sum + (item.attention.pendingTaskCount ?? 0), 0);
  }, [contexts]);

  return (
    <Context.Provider value={{
      contexts,
      hasActiveCareLink,
      selectedClinicId,
      selectedContext,
      status,
      error,
      totalPendingTasks,
      selectClinic,
      refreshContexts,
    }}>
      {children}
    </Context.Provider>
  );
}

export const useProfessionalClinicWorkspace = (): ProfessionalClinicWorkspaceValue => {
  const value = useContext(Context);
  if (!value) throw new Error('useProfessionalClinicWorkspace must be used inside its provider.');
  return value;
};

export const useOptionalProfessionalClinicWorkspace = (): ProfessionalClinicWorkspaceValue | null =>
  useContext(Context) ?? null;
