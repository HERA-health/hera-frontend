import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getClinicalAuthorization, type ClinicalRecord } from '../services/clinicalService';
import { cancelClinicalDownloads } from '../services/clinicalDownloads';
import { getErrorMessage } from '../constants/errors';

interface Options {
  clientId: string; token: string | null; status?: ClinicalRecord['consentStatus'];
  closedAt?: string | null; requestPending: boolean;
  onRefresh: () => Promise<unknown>; onAccessLost: (message: string) => Promise<void> | void;
}

export function useClinicalAuthorizationWatch(options: Options) {
  const callbacks = useRef(options); callbacks.current = options;
  const { clientId, token, status, closedAt, requestPending } = options;
  useFocusEffect(useCallback(() => {
    if (!token || (!requestPending && status !== 'GRANTED')) return;
    let active = true;
    let refreshing = false;
    const timer = setInterval(() => {
      if (refreshing) return;
      refreshing = true;
      void getClinicalAuthorization(clientId, token).then(async next => {
        if (!active) return;
        if (next.consentStatus !== status || next.closedAt !== closedAt || requestPending) {
          if (next.consentStatus !== 'GRANTED') cancelClinicalDownloads(token);
          await callbacks.current.onRefresh();
        }
      }).catch(error => {
        if (active) {
          cancelClinicalDownloads(token);
          void callbacks.current.onAccessLost(getErrorMessage(error, 'No se pudo verificar el acceso. Vuelve a desbloquear la ficha.'));
        }
      }).finally(() => { refreshing = false; });
    }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [clientId, token, status, closedAt, requestPending]));
}
