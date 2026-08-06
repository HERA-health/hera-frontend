import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import * as profileCompletionService from '../services/profileCompletionService';
import type { ProfileCompletionSnapshot } from '../services/profileCompletionService';

interface ProfileCompletionContextValue {
  snapshot: ProfileCompletionSnapshot | null;
  loading: boolean;
  status: 'loading' | 'ready' | 'stale' | 'error';
  error: string | null;
  refresh: () => Promise<void>;
  setClinicScope: (clinicId: string | null) => void;
}

const ProfileCompletionContext = createContext<ProfileCompletionContextValue | undefined>(undefined);

export function ProfileCompletionProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const userType = user?.type;
  const [snapshot, setSnapshot] = useState<ProfileCompletionSnapshot | null>(null);
  const [clinicScopeId, setClinicScopeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'stale' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);
  const requestInFlightRef = useRef<Promise<void> | null>(null);
  const snapshotRef = useRef<ProfileCompletionSnapshot | null>(null);
  const lastSuccessRef = useRef(0);

  const refresh = useCallback((): Promise<void> => {
    if (!isAuthenticated || !userType || userType === 'client') {
      snapshotRef.current = null;
      setSnapshot(null);
      setLoading(false);
      setStatus('ready');
      setError(null);
      return Promise.resolve();
    }

    if (userType === 'clinic' && !clinicScopeId) {
      return Promise.resolve();
    }

    if (requestInFlightRef.current) {
      const activeRequest = requestInFlightRef.current;
      const activeRequestSequence = requestSequenceRef.current;
      return activeRequest.then(() => (
        requestSequenceRef.current === activeRequestSequence
          ? (requestInFlightRef.current ?? refresh())
          : undefined
      ));
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    setLoading(true);
    setStatus('loading');
    setError(null);

    const request = (userType === 'professional'
        ? profileCompletionService.getProfessionalCompletion()
        : profileCompletionService.getClinicCompletion(clinicScopeId as string))
      .then((nextSnapshot) => {
        if (requestSequenceRef.current !== requestId) return;
        snapshotRef.current = nextSnapshot;
        lastSuccessRef.current = Date.now();
        setSnapshot(nextSnapshot);
        setStatus('ready');
      })
      .catch((refreshError: unknown) => {
        if (requestSequenceRef.current !== requestId) return;
        setError(refreshError instanceof Error ? refreshError.message : 'No se pudo actualizar el perfil');
        setStatus(snapshotRef.current ? 'stale' : 'error');
      })
      .finally(() => {
        if (requestSequenceRef.current !== requestId) return;
        setLoading(false);
        if (requestInFlightRef.current === request) requestInFlightRef.current = null;
      });

    requestInFlightRef.current = request;
    return request;
  }, [clinicScopeId, isAuthenticated, userType]);

  const setClinicScope = useCallback((clinicId: string | null): void => {
    setClinicScopeId((current) => current === clinicId ? current : clinicId);
  }, []);

  useEffect(() => {
    requestSequenceRef.current += 1;
    requestInFlightRef.current = null;
    snapshotRef.current = null;
    lastSuccessRef.current = 0;
    setSnapshot(null);
    setClinicScopeId(null);
    setError(null);
    setStatus(isAuthenticated && userType !== 'client' ? 'loading' : 'ready');
  }, [isAuthenticated, userId, userType]);

  useEffect(() => {
    if (userType !== 'clinic') return;
    requestSequenceRef.current += 1;
    requestInFlightRef.current = null;
    snapshotRef.current = null;
    lastSuccessRef.current = 0;
    setSnapshot(null);
    setError(null);
    setLoading(Boolean(clinicScopeId));
    setStatus(clinicScopeId ? 'loading' : 'ready');
  }, [clinicScopeId, userType]);

  useEffect(() => {
    if (isAuthenticated && userType === 'professional') {
      void refresh();
    }
  }, [isAuthenticated, refresh, userType]);

  useEffect(() => {
    if (userType === 'clinic' && clinicScopeId) {
      void refresh();
    }
  }, [clinicScopeId, refresh, userType]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        if (Date.now() - lastSuccessRef.current >= 30_000) void refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  return (
    <ProfileCompletionContext.Provider
      value={{ snapshot, loading, status, error, refresh, setClinicScope }}
    >
      {children}
    </ProfileCompletionContext.Provider>
  );
}

export function useProfileCompletion(): ProfileCompletionContextValue {
  const context = useContext(ProfileCompletionContext);
  if (!context) {
    throw new Error('useProfileCompletion must be used within ProfileCompletionProvider');
  }
  return context;
}
