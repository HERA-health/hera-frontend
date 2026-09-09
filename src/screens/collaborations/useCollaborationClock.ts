import { useEffect, useState } from 'react';

// Refresh labels at the next scheduled cutoff, also when the view stays open.
export function useCollaborationClock(cutOffs: Array<string | null>) {
  const [now, setNow] = useState(Date.now);
  const next = Math.min(...cutOffs.filter((value): value is string => !!value).map(Date.parse).filter(value => value > now));
  useEffect(() => {
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(next - Date.now() + 10, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [next, now]);
  return Math.max(now, Date.now());
}
