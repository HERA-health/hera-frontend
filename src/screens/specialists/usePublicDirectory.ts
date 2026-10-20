import { useCallback, useEffect, useRef, useState } from 'react';
import { useDiscoveryRevalidation } from '../../hooks/useDiscoveryRevalidation';
import {
  getPublicSpecialistDirectory,
  type PublicSpecialistDirectoryFilters,
  type PublicSpecialistDirectoryPage,
} from '../../services/specialistsService';

/** Keep the committed page visible until its replacement has actually arrived. */
export function usePublicDirectory(filters: PublicSpecialistDirectoryFilters) {
  const [data, setData] = useState<PublicSpecialistDirectoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const activeRequest = useRef<number | null>(null);
  const currentFilters = useRef(filters);
  currentFilters.current = filters;
  const committed = useRef<{ filters: PublicSpecialistDirectoryFilters; page: number } | null>(null);
  const retryPage = useRef(1);

  const loadPage = useCallback(async (requestedPage: number, refresh = false) => {
    if (refresh && activeRequest.current !== null) return;
    const request = ++sequence.current;
    activeRequest.current = request;
    retryPage.current = requestedPage;
    const isCurrent = () => mounted.current && sequence.current === request && currentFilters.current === filters;
    if (committed.current?.filters !== filters) {
      committed.current = null;
      setData(null);
    }
    setLoading(true);
    setError(null);
    try {
      let response = await getPublicSpecialistDirectory({ ...filters, page: requestedPage });
      if (!isCurrent()) return;
      const lastPage = Math.max(1, Math.ceil(response.total / response.pageSize));
      if (response.page > lastPage) {
        response = await getPublicSpecialistDirectory({ ...filters, page: lastPage });
      }
      if (!isCurrent()) return;
      committed.current = { filters, page: response.page };
      retryPage.current = response.page;
      setData(response);
    } catch (cause: unknown) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el directorio');
    } finally {
      if (activeRequest.current === request) activeRequest.current = null;
      if (isCurrent()) setLoading(false);
    }
  }, [filters]);

  const refresh = useCallback(() => loadPage(
    committed.current?.filters === filters ? committed.current.page : 1, true,
  ), [filters, loadPage]);
  useDiscoveryRevalidation(refresh);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; sequence.current += 1; activeRequest.current = null; };
  }, []);
  useEffect(() => { void loadPage(1); }, [loadPage]);

  return { data, loading, error, loadPage, retry: () => loadPage(retryPage.current) };
}
