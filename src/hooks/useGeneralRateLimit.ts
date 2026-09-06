import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { getGeneralRateLimitRetryAt, getRateLimitSessionGeneration, subscribeGeneralRateLimit } from '../services/generalRateLimit';

export const useGeneralRateLimit = (): number =>
  useSyncExternalStore(subscribeGeneralRateLimit, getGeneralRateLimitRetryAt, () => 0);

/** Recover once, only when this consumer is active and the app is visible. */
export function useRateLimitRecovery(
  active: boolean,
  recover: () => void,
  { reloadsOnFocus = false }: { reloadsOnFocus?: boolean } = {},
): void {
  const retryAt = useGeneralRateLimit();
  const pending = useRef(false);
  const generation = useRef(getRateLimitSessionGeneration());
  const recoverRef = useRef(recover);
  const previouslyActive = useRef(active);
  recoverRef.current = recover;
  useEffect(() => {
    const gainedFocus = active && !previouslyActive.current;
    previouslyActive.current = active;
    if (generation.current !== getRateLimitSessionGeneration()) {
      generation.current = getRateLimitSessionGeneration();
      pending.current = false;
    }
    if (retryAt > 0) pending.current = true;
    // The screen's focus loader owns this recovery. Do not launch a second read.
    if (gainedFocus && reloadsOnFocus && retryAt === 0) pending.current = false;
    const resume = (): void => {
      const visible = Platform.OS === 'web'
        ? typeof document === 'undefined' || document.visibilityState !== 'hidden'
        : AppState.currentState === 'active';
      if (active && visible && pending.current && getGeneralRateLimitRetryAt() === 0) {
        pending.current = false;
        recoverRef.current();
      }
    };
    resume();
    const subscription = AppState.addEventListener('change', resume);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', resume);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', resume);
    };
  }, [active, retryAt, reloadsOnFocus]);
}

export function useFocusedRateLimitRecovery(recover: () => void): void {
  useRateLimitRecovery(useIsFocused(), recover, { reloadsOnFocus: true });
}
