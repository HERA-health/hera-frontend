import { useCallback, useEffect, useRef, useState } from 'react';
import * as service from '../../services/specialistsService';
import { useDiscoveryRevalidation } from '../../hooks/useDiscoveryRevalidation';

/** Private state lives only in the account-keyed screen, never in a shared cache. */
export function usePatientSpecialists(filters: service.SpecialistFilters, isClient: boolean) {
  const [available, setAvailable] = useState<service.SpecialistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [personalization, setPersonalization] = useState<service.SpecialistPersonalizationResponse | null>(null);
  const [personalLoading, setPersonalLoading] = useState(isClient);
  const [personalError, setPersonalError] = useState(false);
  const [matches, setMatches] = useState<service.MatchedSpecialistsResponse | null>(null);
  const [matchesError, setMatchesError] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const alive = useRef(true);
  const listRequest = useRef(0);
  const personalRequest = useRef(0);
  const matchRequest = useRef(0);
  const pending = useRef(new Set<string>());
  const personalRef = useRef(personalization);
  personalRef.current = personalization;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      listRequest.current++;
      personalRequest.current++;
      matchRequest.current++;
    };
  }, []);

  const loadDirectory = useCallback(async () => {
    const request = ++listRequest.current;
    setLoading(true);
    setError(false);
    try {
      const data = await service.getAllSpecialists(filters);
      if (alive.current && request === listRequest.current) setAvailable(data);
    } catch {
      if (alive.current && request === listRequest.current) setError(true);
    } finally {
      if (alive.current && request === listRequest.current) setLoading(false);
    }
  }, [filters]);

  const loadPersonalization = useCallback(async () => {
    if (!isClient || pending.current.size) return;
    const request = ++personalRequest.current;
    setPersonalLoading(true);
    setPersonalError(false);
    try {
      const data = await service.getSpecialistPersonalization();
      if (alive.current && request === personalRequest.current) {
        personalRef.current = data;
        setPersonalization(data);
      }
    } catch {
      if (alive.current && request === personalRequest.current) setPersonalError(true);
    } finally {
      if (alive.current && request === personalRequest.current) setPersonalLoading(false);
    }
  }, [isClient]);

  const loadMatches = useCallback(async () => {
    if (!isClient) return;
    const request = ++matchRequest.current;
    setMatchesError(false);
    try {
      const data = await service.getMatchedSpecialists();
      if (alive.current && request === matchRequest.current) setMatches(data);
    } catch {
      if (alive.current && request === matchRequest.current) setMatchesError(true);
    }
  }, [isClient]);

  useEffect(() => { void loadDirectory(); }, [loadDirectory]);
  useEffect(() => { void loadPersonalization(); void loadMatches(); }, [loadPersonalization, loadMatches]);
  const refresh = useCallback(async () => {
    await Promise.all([loadDirectory(), loadPersonalization(), loadMatches()]);
  }, [loadDirectory, loadPersonalization, loadMatches]);
  useDiscoveryRevalidation(refresh);

  const toggleFavorite = useCallback(async (specialist: service.SpecialistData) => {
    const current = personalRef.current;
    if (!isClient || !current || personalLoading || personalError || pending.current.has(specialist.id)) return;
    const wasFavorite = current.favoriteSpecialistIds.includes(specialist.id);
    pending.current.add(specialist.id);
    setPendingIds(new Set(pending.current));
    setFavoriteError(null);
    // A previously started read must not overwrite a confirmed mutation.
    personalRequest.current++;
    // Its finally block is obsolete too, including when refresh and save share a render.
    setPersonalLoading(false);
    try {
      await (wasFavorite ? service.removeFavoriteSpecialist : service.addFavoriteSpecialist)(specialist.id);
      if (!alive.current) return;
      const latest = personalRef.current;
      if (!latest) return;
      const updated = {
        ...latest,
        favoriteSpecialistIds: wasFavorite
          ? latest.favoriteSpecialistIds.filter(id => id !== specialist.id)
          : [...new Set([specialist.id, ...latest.favoriteSpecialistIds])],
        favoriteSpecialists: wasFavorite
          ? latest.favoriteSpecialists.filter(item => item.id !== specialist.id)
          : [specialist, ...latest.favoriteSpecialists.filter(item => item.id !== specialist.id)],
      };
      personalRef.current = updated;
      setPersonalization(updated);
    } catch {
      if (alive.current) setFavoriteError(`No se pudo ${wasFavorite ? 'quitar' : 'guardar'} a ${specialist.user.name}. Vuelve a intentarlo.`);
    } finally {
      pending.current.delete(specialist.id);
      if (alive.current) setPendingIds(new Set(pending.current));
    }
  }, [isClient, personalLoading, personalError]);

  return { available, loading, error, retry: loadDirectory, personalization, personalLoading, personalError,
    retryPersonalization: loadPersonalization, matches, matchesError, retryMatches: loadMatches,
    favoriteError, pendingIds, toggleFavorite };
}
