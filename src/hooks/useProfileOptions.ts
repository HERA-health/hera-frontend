import { useCallback, useEffect, useState } from 'react';
import { getProfileOptions, ProfileOptions } from '../services/profileDiscoveryService';

export function useProfileOptions() {
  const [options, setOptions] = useState<ProfileOptions | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    getProfileOptions().then(value => { if (active) setOptions(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { options, error, retry };
}
