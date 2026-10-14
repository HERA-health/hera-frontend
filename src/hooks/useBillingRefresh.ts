import { useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** Refresh on app focus; poll only while the focused screen has outstanding work. */
export function useBillingRefresh(refresh: () => Promise<unknown>, hasDeliveries: boolean) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useFocusEffect(useCallback(() => {
    let active = true;
    let running = false;
    const foreground = () => Platform.OS === 'web'
      ? typeof document === 'undefined' || document.visibilityState === 'visible'
      : AppState.currentState === 'active';
    const run = async () => {
      if (!active || running || !foreground()) return;
      running = true;
      try { await callback.current(); } finally { running = false; }
    };
    const subscription = AppState.addEventListener('change', () => { void run(); });
    const onFocus = () => { void run(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onFocus);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    const timer = hasDeliveries ? setInterval(() => { void run(); }, 10_000) : undefined;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onFocus);
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, [hasDeliveries]));
}
