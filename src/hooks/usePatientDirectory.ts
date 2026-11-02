import { useCallback, useEffect, useRef, useState } from 'react';
import { getPatientDirectory, type DirectoryFilters, type DirectoryPatient } from '../services/patientDirectoryService';
import { getErrorMessage } from '../constants/errors';

/** Bounded pages; stale requests cannot overwrite another search or filter. */
export function usePatientDirectory(filters: DirectoryFilters = {}, enabled = true) {
  const key = JSON.stringify(filters);
  const [items, setItems] = useState<DirectoryPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const loadedKey = useRef('');
  const inFlight = useRef(false);
  const filtersRef = useRef(filters); filtersRef.current = filters;
  const load = useCallback(async (page: number, id: number, requestKey: string) => {
    const controller = new AbortController(); abort.current = controller;
    inFlight.current = true; setLoading(true); setError('');
    try {
      const response = await getPatientDirectory({ ...filtersRef.current, page }, controller.signal);
      if (generation.current !== id || controller.signal.aborted) return;
      loadedKey.current = requestKey;
      setItems(previous => page === 1 ? response.items : [...previous, ...response.items.filter(row => !previous.some(p => p.id === row.id))]);
      setNextPage(response.pageInfo.nextPage);
    } catch (failure) {
      if (generation.current === id && !controller.signal.aborted) setError(getErrorMessage(failure, 'No se pudieron cargar las fichas.'));
    } finally { if (generation.current === id) { inFlight.current = false; setLoading(false); } }
  }, []);
  useEffect(() => {
    const id = ++generation.current;
    abort.current?.abort(); inFlight.current = false;
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => { void load(1, id, key); }, filtersRef.current.q ? 300 : 0);
    return () => { clearTimeout(timer); abort.current?.abort(); generation.current++; };
  }, [key, enabled, attempt, load]);
  const loadMore = useCallback(() => { if (enabled && !loading && nextPage && !inFlight.current && loadedKey.current === key) void load(nextPage, generation.current, key); }, [enabled, loading, nextPage, key, load]);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  return { items: loadedKey.current === key ? items : [], loading, error, hasMore: loadedKey.current === key && nextPage !== null, loadMore, refresh };
}
