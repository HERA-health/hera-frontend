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
  const requestSequenceRef = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !userType || userType === 'client') {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    if (userType === 'clinic' && !clinicScopeId) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    setLoading(true);

    try {
      const nextSnapshot = userType === 'professional'
        ? await profileCompletionService.getProfessionalCompletion()
        : await profileCompletionService.getClinicCompletion(clinicScopeId as string);

      if (requestSequenceRef.current === requestId) {
        setSnapshot(nextSnapshot);
      }
    } catch (_error: unknown) {
      // Preserve the last server-confirmed snapshot and retry on the next focus/resume.
    } finally {
      if (requestSequenceRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [clinicScopeId, isAuthenticated, userType]);

  const setClinicScope = useCallback((clinicId: string | null): void => {
    setClinicScopeId((current) => current === clinicId ? current : clinicId);
  }, []);

  useEffect(() => {
    requestSequenceRef.current += 1;
    setSnapshot(null);
    setClinicScopeId(null);
  }, [isAuthenticated, userId, userType]);

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
        void refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  return (
    <ProfileCompletionContext.Provider
      value={{ snapshot, loading, refresh, setClinicScope }}
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
