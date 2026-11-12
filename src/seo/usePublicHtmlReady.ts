import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Keep the readable initial page until the corresponding application screen commits. */
export function usePublicHtmlReady(ready = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready || typeof document === 'undefined') return;
    document.getElementById('hera-public-html')?.remove();
    document.getElementById('hera-public-pending')?.remove();
  }, [ready]);
}
