import { useLayoutEffect, type RefObject } from 'react';
import { Platform } from 'react-native';

/** Keep the readable initial page until the corresponding application screen commits. */
export function usePublicHtmlReady(ready = true, scrollContainer?: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !ready || typeof document === 'undefined') return;
    const initial = document.getElementById('hera-public-html');
    const scroll = initial && scrollContainer?.current ? window.scrollY : null;
    if (initial && scrollContainer?.current) {
      const container = scrollContainer.current;
      initial.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((item) => {
        const all = Array.from(initial.querySelectorAll('details'));
        const peer = container.querySelectorAll('details')[all.indexOf(item)];
        if (peer) peer.open = true;
      });
    }
    document.getElementById('hera-public-html')?.remove();
    document.getElementById('hera-public-pending')?.remove();
    // Apply the position after the document scrollbar is removed. Otherwise the
    // temporary, narrower container can reflow and browser anchoring shifts it.
    if (scroll !== null && scrollContainer?.current) scrollContainer.current.scrollTop = scroll;
  }, [ready, scrollContainer]);
}
