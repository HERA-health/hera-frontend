import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getMySubscription, getAdminSubscription, type SubscriptionSummary } from '../services/subscriptionService';
import { getErrorMessage } from '../constants/errors';

export function useSubscription(specialistId?: string) {
  const focused = useIsFocused();
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = () => setRevision(v => v + 1);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') setRevision(v => v + 1); });
    const onFocus = () => setRevision(v => v + 1);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => { listener.remove(); if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', onFocus); };
  }, []);
  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController(); setLoading(true); setError('');
    void (specialistId ? getAdminSubscription(specialistId, controller.signal) : getMySubscription(controller.signal))
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(failure => { if (!controller.signal.aborted) { setError(getErrorMessage(failure)); setData(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [focused, specialistId, revision]);
  return { data, loading, error, refresh };
}
