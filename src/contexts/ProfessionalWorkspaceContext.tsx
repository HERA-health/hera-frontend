import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import {
  dashboardService,
  subscribeProfessionalHomeChanges,
  type ProfessionalHomeData,
} from '../services/dashboardService';
import {
  getSpecialistContactSummary,
  subscribeSpecialistContactSummary,
} from '../services/specialistContactService';

export type ProfessionalWorkspaceResourceStatus = 'loading' | 'ready' | 'stale' | 'error';

const HOME_ROUTE = 'ProfessionalHome';
const ACTIVE_REFRESH_MS = 60_000;
const RESUME_FRESHNESS_MS = 30_000;
const ATTENTION_FRESHNESS_MS = 15_000;

interface ProfessionalWorkspaceContextValue {
  homeData: ProfessionalHomeData | null;
  homeStatus: ProfessionalWorkspaceResourceStatus;
  homeError: string | null;
  unreadSupport: number;
  supportStatus: ProfessionalWorkspaceResourceStatus;
  supportError: string | null;
  refreshHome: (force?: boolean) => Promise<void>;
  refreshSupport: () => Promise<void>;
  refreshAttention: () => Promise<void>;
}

const ProfessionalWorkspaceContext = createContext<ProfessionalWorkspaceContextValue | undefined>(
  undefined,
);

interface ProfessionalWorkspaceProviderProps {
  children: ReactNode;
  currentRoute: string;
}

const isWebDocumentVisible = (): boolean => (
  Platform.OS !== 'web'
  || typeof document === 'undefined'
  || document.visibilityState === undefined
  || document.visibilityState === 'visible'
);

export function ProfessionalWorkspaceProvider({
  children,
  currentRoute,
}: ProfessionalWorkspaceProviderProps): React.ReactElement {
  const { user } = useAuth();
  const initialHome = dashboardService.getCachedProfessionalHome();
  const [homeData, setHomeData] = useState<ProfessionalHomeData | null>(initialHome);
  const homeDataRef = useRef<ProfessionalHomeData | null>(initialHome);
  const [homeStatus, setHomeStatus] = useState<ProfessionalWorkspaceResourceStatus>('loading');
  const [homeError, setHomeError] = useState<string | null>(null);
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [supportStatus, setSupportStatus] = useState<ProfessionalWorkspaceResourceStatus>('loading');
  const [supportError, setSupportError] = useState<string | null>(null);
  const supportHasDataRef = useRef(false);
  const homeRequestSequence = useRef(0);
  const supportRequestSequence = useRef(0);
  const homeInFlightRef = useRef<Promise<void> | null>(null);
  const homeRefreshRequiredRef = useRef(false);
  const supportInFlightRef = useRef<Promise<void> | null>(null);
  const supportRefreshRequiredRef = useRef(false);
  const homeLastSuccessRef = useRef(0);
  const supportLastSuccessRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState ?? 'active');
  const isWorkspaceActive = (): boolean => Platform.OS === 'web'
    ? isWebDocumentVisible()
    : appStateRef.current === 'active';

  const refreshHome = useCallback((
    force = false,
    queueIfInFlight = true,
  ): Promise<void> => {
    if (homeInFlightRef.current) {
      if (force && queueIfInFlight) homeRefreshRequiredRef.current = true;
      return homeInFlightRef.current;
    }

    const requestId = homeRequestSequence.current + 1;
    homeRequestSequence.current = requestId;
    setHomeStatus('loading');
    setHomeError(null);

    const request = dashboardService.getProfessionalHome({ force })
      .then((nextHome) => {
        if (homeRequestSequence.current !== requestId) return;
        homeDataRef.current = nextHome;
        homeLastSuccessRef.current = Date.now();
        setHomeData(nextHome);
        setHomeStatus('ready');
      })
      .catch((error: unknown) => {
        if (homeRequestSequence.current !== requestId) return;
        setHomeError(error instanceof Error ? error.message : 'No se pudo actualizar el inicio');
        setHomeStatus(homeDataRef.current ? 'stale' : 'error');
      })
      .finally(() => {
        if (homeInFlightRef.current === request) {
          homeInFlightRef.current = null;
          if (homeRefreshRequiredRef.current) {
            homeRefreshRequiredRef.current = false;
            void refreshHome(true);
          }
        }
      });

    homeInFlightRef.current = request;
    return request;
  }, []);

  const refreshSupport = useCallback((queueIfInFlight = true): Promise<void> => {
    if (supportInFlightRef.current) {
      if (queueIfInFlight) supportRefreshRequiredRef.current = true;
      return supportInFlightRef.current;
    }

    const requestId = supportRequestSequence.current + 1;
    supportRequestSequence.current = requestId;
    setSupportStatus('loading');
    setSupportError(null);

    const request = getSpecialistContactSummary()
      .then((summary) => {
        if (supportRequestSequence.current !== requestId) return;
        supportHasDataRef.current = true;
        supportLastSuccessRef.current = Date.now();
        setUnreadSupport(summary.unreadHelpRequests);
        setSupportStatus('ready');
      })
      .catch((error: unknown) => {
        if (supportRequestSequence.current !== requestId) return;
        setSupportError(error instanceof Error ? error.message : 'No se pudo actualizar soporte');
        setSupportStatus(supportHasDataRef.current ? 'stale' : 'error');
      })
      .finally(() => {
        if (supportInFlightRef.current === request) {
          supportInFlightRef.current = null;
          if (supportRefreshRequiredRef.current) {
            supportRefreshRequiredRef.current = false;
            void refreshSupport(false);
          }
        }
      });

    supportInFlightRef.current = request;
    return request;
  }, []);

  const refreshAttention = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const refreshes: Promise<void>[] = [];
    if (now - homeLastSuccessRef.current >= ATTENTION_FRESHNESS_MS) {
      refreshes.push(refreshHome(true, false));
    }
    if (now - supportLastSuccessRef.current >= ATTENTION_FRESHNESS_MS) {
      refreshes.push(refreshSupport(false));
    }
    await Promise.all(refreshes);
  }, [refreshHome, refreshSupport]);

  const refreshAfterResume = useCallback((): void => {
    if (!isWebDocumentVisible()) return;
    const now = Date.now();
    if (now - homeLastSuccessRef.current >= RESUME_FRESHNESS_MS) void refreshHome(true, false);
    if (now - supportLastSuccessRef.current >= RESUME_FRESHNESS_MS) void refreshSupport(false);
  }, [refreshHome, refreshSupport]);

  useEffect(() => {
    void refreshHome();
    void refreshSupport();
  }, [refreshHome, refreshSupport]);

  useEffect(() => {
    if (currentRoute !== HOME_ROUTE || !isWorkspaceActive()) {
      return undefined;
    }

    const interval = setInterval(() => {
      if (isWorkspaceActive()) {
        void refreshHome(true, false);
        void refreshSupport(false);
      }
    }, ACTIVE_REFRESH_MS);

    return () => clearInterval(interval);
  }, [currentRoute, refreshHome, refreshSupport]);

  useEffect(() => {
    if (currentRoute === HOME_ROUTE && homeLastSuccessRef.current > 0) {
      refreshAfterResume();
    }
  }, [currentRoute, refreshAfterResume]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasInactive = appStateRef.current !== 'active';
      appStateRef.current = nextState;
      if (nextState === 'active' && wasInactive) refreshAfterResume();
    });
    return () => subscription.remove();
  }, [refreshAfterResume]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') refreshAfterResume();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshAfterResume]);

  useEffect(
    () => subscribeProfessionalHomeChanges(() => { void refreshHome(true); }),
    [refreshHome],
  );

  useEffect(
    () => subscribeSpecialistContactSummary(() => { void refreshSupport(); }),
    [refreshSupport],
  );

  useEffect(() => () => {
    homeRequestSequence.current += 1;
    supportRequestSequence.current += 1;
    homeInFlightRef.current = null;
    homeRefreshRequiredRef.current = false;
    supportInFlightRef.current = null;
    supportRefreshRequiredRef.current = false;
  }, [user?.id]);

  return (
    <ProfessionalWorkspaceContext.Provider
      value={{
        homeData,
        homeStatus,
        homeError,
        unreadSupport,
        supportStatus,
        supportError,
        refreshHome,
        refreshSupport,
        refreshAttention,
      }}
    >
      {children}
    </ProfessionalWorkspaceContext.Provider>
  );
}

export function useProfessionalWorkspace(): ProfessionalWorkspaceContextValue {
  const context = useContext(ProfessionalWorkspaceContext);
  if (!context) {
    throw new Error('useProfessionalWorkspace must be used within ProfessionalWorkspaceProvider');
  }
  return context;
}

export const useOptionalProfessionalWorkspace = (): ProfessionalWorkspaceContextValue | undefined =>
  useContext(ProfessionalWorkspaceContext);
