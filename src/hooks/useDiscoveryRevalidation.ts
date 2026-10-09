import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const REVALIDATION_INTERVAL_MS = 30_000;

/** Refresh visible discovery data on return, without polling or duplicate web events. */
export function useDiscoveryRevalidation(reload: () => void | Promise<unknown>, navigationFocus = true) {
  const navigation = useNavigation();
  const lastReload = useRef(Date.now());
  const inFlight = useRef(false);
  useEffect(() => {
    // Consumers load initially and when their query changes; those reads are already fresh.
    lastReload.current = Date.now();
    const refresh = () => {
      const visible = Platform.OS === 'web'
        ? typeof document === 'undefined' || document.visibilityState !== 'hidden'
        : AppState.currentState === 'active';
      if (!navigation.isFocused() || !visible || inFlight.current
        || Date.now() - lastReload.current < REVALIDATION_INTERVAL_MS) return;
      lastReload.current = Date.now();
      inFlight.current = true;
      // Loaders own their user-facing error handling.
      void Promise.resolve().then(reload).finally(() => {
        lastReload.current = Date.now();
        inFlight.current = false;
      }).catch(() => undefined);
    };
    const unsubscribe = navigationFocus ? navigation.addListener('focus', refresh) : () => undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibilityChange = () => { if (document.visibilityState === 'visible') refresh(); };
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => { unsubscribe(); document.removeEventListener('visibilitychange', onVisibilityChange); };
    }
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { unsubscribe(); subscription.remove(); };
  }, [navigation, reload, navigationFocus]);
}
