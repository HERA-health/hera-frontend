import { useEffect, useRef } from 'react';
import type { ScrollView } from 'react-native';
import type { AgendaScrollPosition } from './ProfessionalAgendaTimeGrid';

/** Keep the scroll in memory while switching calendar views; never persist data. */
export function useAgendaScrollPosition(position?: AgendaScrollPosition, ready = true, scrollRequest = 0) {
  const ref = useRef<ScrollView | null>(null);
  const restored = useRef<number | null>(null);
  useEffect(() => {
    if (!position || !ready || restored.current === scrollRequest) return;
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: position.current ?? 0, animated: false });
      restored.current = scrollRequest;
    }, 0);
    return () => clearTimeout(timer);
  }, [position, ready, scrollRequest]);
  return ref;
}
