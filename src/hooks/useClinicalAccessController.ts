import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as clinicalService from '../services/clinicalService';

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;
const VISIBILITY_REFRESH_THRESHOLD_MS = 30 * 1000;

interface UseClinicalAccessControllerOptions {
  onAccessLost?: (message: string) => void;
}

export function useClinicalAccessController({
  onAccessLost,
}: UseClinicalAccessControllerOptions = {}) {
  const [accessStatus, setAccessStatus] = useState<clinicalService.ClinicalAccessStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isForegroundRef = useRef(true);
  const hiddenAtRef = useRef<number | null>(null);

  const syncToken = useCallback((nextToken: string | null) => {
    tokenRef.current = nextToken;
    setToken(nextToken);
  }, []);

  const updateSessionView = useCallback(
    (session: clinicalService.ClinicalUnlockResponse | clinicalService.ClinicalAccessSessionStatus | null) => {
      setAccessStatus((current) =>
        current
          ? {
              ...current,
              session: session
                ? {
                    active: true,
                    sessionId: session.sessionId,
                    createdAt: 'createdAt' in session ? session.createdAt : current.session.createdAt,
                    absoluteExpiresAt: session.absoluteExpiresAt,
                    idleExpiresAt: session.idleExpiresAt,
                  }
                : {
                    active: false,
                    sessionId: null,
                    createdAt: null,
                    absoluteExpiresAt: null,
                    idleExpiresAt: null,
                  },
            }
          : current
      );
    },
    []
  );

  const clearAccessState = useCallback(
    async (message?: string) => {
      syncToken(null);
      setAccessStatus((current) =>
        current
          ? {
              ...current,
              session: {
                active: false,
                sessionId: null,
                createdAt: null,
                absoluteExpiresAt: null,
                idleExpiresAt: null,
              },
            }
          : current
      );

      if (message) {
        onAccessLost?.(message);
      }
    },
    [onAccessLost, syncToken]
  );

  const refreshStatus = useCallback(
    async (sessionToken?: string | null) => {
      const status = await clinicalService.getClinicalAccessStatus(sessionToken || undefined);
      setAccessStatus(status);

      if (!status.session.active && sessionToken) {
        syncToken(null);
      }

      return status;
    },
    [syncToken]
  );

  const loadStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      return await refreshStatus(tokenRef.current);
    } catch {
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, [refreshStatus]);

  const sendHeartbeat = useCallback(
    async (mode: clinicalService.ClinicalHeartbeatMode, silent = false) => {
      const activeToken = tokenRef.current;
      if (!activeToken) {
        return null;
      }

      try {
        const session = await clinicalService.heartbeatClinicalArea(activeToken, mode);
        updateSessionView(session);
        return session;
      } catch {
        await clearAccessState(
          silent ? undefined : 'El área clínica se ha bloqueado. Vuelve a desbloquearla para continuar.'
        );
        return null;
      }
    },
    [clearAccessState, updateSessionView]
  );

  const acceptDataProcessingAgreement = useCallback(async (version = 'v1') => {
    setAccessSubmitting(true);
    try {
      await clinicalService.acceptDataProcessingAgreement(version);
      await loadStatus();
    } finally {
      setAccessSubmitting(false);
    }
  }, [loadStatus]);

  const setupClinicalPin = useCallback(async (pin: string) => {
    setAccessSubmitting(true);
    try {
      await clinicalService.setupClinicalPin(pin);
      await loadStatus();
    } finally {
      setAccessSubmitting(false);
    }
  }, [loadStatus]);

  const rotateClinicalPin = useCallback(async (currentPin: string, nextPin: string) => {
    setAccessSubmitting(true);
    try {
      await clinicalService.rotateClinicalPin(currentPin, nextPin);
      await clearAccessState();
      await loadStatus();
    } finally {
      setAccessSubmitting(false);
    }
  }, [clearAccessState, loadStatus]);

  const unlockClinicalArea = useCallback(async (pin: string) => {
    setAccessSubmitting(true);
    try {
      const session = await clinicalService.unlockClinicalArea(pin);
      syncToken(session.token);
      updateSessionView({
        active: true,
        sessionId: session.sessionId,
        createdAt: new Date().toISOString(),
        absoluteExpiresAt: session.absoluteExpiresAt,
        idleExpiresAt: session.idleExpiresAt,
      });
      await refreshStatus(session.token);
      return session;
    } finally {
      setAccessSubmitting(false);
    }
  }, [refreshStatus, syncToken, updateSessionView]);

  const lockClinicalArea = useCallback(async () => {
    setAccessSubmitting(true);
    const activeToken = tokenRef.current;

    try {
      if (activeToken) {
        try {
          await clinicalService.lockClinicalArea(activeToken);
        } catch {
          // Ignore transport errors while clearing local access state.
        }
      }

      await clearAccessState();
      await loadStatus();
    } finally {
      setAccessSubmitting(false);
    }
  }, [clearAccessState, loadStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (!isForegroundRef.current) {
        return;
      }

      void sendHeartbeat('ACTIVE', true);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sendHeartbeat, token]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (!tokenRef.current) {
        return;
      }

      isForegroundRef.current = nextState === 'active';

      if (previousState.match(/inactive|background/) && nextState === 'active') {
        void loadStatus();
        return;
      }

      if (nextState.match(/inactive|background/)) {
        void sendHeartbeat('NATIVE_BACKGROUND', true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadStatus, sendHeartbeat]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (!tokenRef.current) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        isForegroundRef.current = false;
        hiddenAtRef.current = Date.now();
        void sendHeartbeat('WEB_HIDDEN', true);
      } else {
        isForegroundRef.current = true;
        const hiddenDuration = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        hiddenAtRef.current = null;

        if (hiddenDuration >= VISIBILITY_REFRESH_THRESHOLD_MS) {
          void loadStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadStatus, sendHeartbeat]);

  return {
    accessStatus,
    token,
    statusLoading,
    accessSubmitting,
    loadStatus,
    refreshStatus,
    acceptDataProcessingAgreement,
    setupClinicalPin,
    rotateClinicalPin,
    unlockClinicalArea,
    lockClinicalArea,
    clearAccessState,
  };
}
