import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { ProfessionalSession, SessionViewMode } from '../../../../constants/types';
import { getErrorMessage } from '../../../../constants/errors';
import * as professionalService from '../../../../services/professionalService';
import {
  type AgendaOriginFilter,
  getAgendaCalendarRange,
  getWeekDays,
  isSameCalendarDay,
  mapAgendaItem,
  toCalendarDateKey,
} from './professionalAgendaUtils';

export interface AgendaSummary {
  today: number;
  week: number;
  pending: number;
}

interface AgendaCacheEntry {
  sessions: ProfessionalSession[];
  summary: AgendaSummary;
  nextCursor: string | null;
  loadedAt: number;
}

interface LoadAgendaOptions {
  append?: boolean;
  force?: boolean;
  invalidateCache?: boolean;
}

const AGENDA_CACHE_TTL_MS = 30_000;
const AGENDA_CACHE_MAX_ENTRIES = 12;
const EMPTY_SESSIONS: ProfessionalSession[] = [];
const EMPTY_AGENDA_SUMMARY: AgendaSummary = {
  today: 0,
  week: 0,
  pending: 0,
};

interface LoadingMoreRequest {
  queryKey: string;
  requestSeq: number;
}

interface LoadMoreErrorState {
  queryKey: string;
  message: string;
}

export interface ProfessionalAgendaController {
  viewMode: SessionViewMode;
  setViewMode: (viewMode: SessionViewMode) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  originFilter: AgendaOriginFilter;
  setOriginFilter: (origin: AgendaOriginFilter) => void;
  initialLoading: boolean;
  refreshing: boolean;
  hasLoadedOnce: boolean;
  loadError: boolean;
  loadErrorMessage: string;
  sessions: ProfessionalSession[];
  agendaSummary: AgendaSummary;
  nextCursor: string | null;
  loadingMore: boolean;
  loadMoreError: boolean;
  loadMoreErrorMessage: string;
  currentTime: Date;
  autoConfirmSessionRequests: boolean | null;
  weekDays: Date[];
  sessionsForDate: ProfessionalSession[];
  sessionsForWeek: ProfessionalSession[];
  sessionsByDate: Map<string, ProfessionalSession[]>;
  nextUpcomingSession: ProfessionalSession | null;
  refreshAgenda: () => Promise<void>;
  refreshAfterMutation: () => Promise<void>;
  loadMoreSessions: () => Promise<void>;
  navigateDate: (direction: number) => void;
  goToToday: () => void;
  jumpToNextSession: () => void;
}

export function useProfessionalAgendaController(): ProfessionalAgendaController {
  const [viewMode, setViewMode] = useState<SessionViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [originFilter, setOriginFilter] = useState<AgendaOriginFilter>('ALL');
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [loadingMoreRequest, setLoadingMoreRequest] = useState<LoadingMoreRequest | null>(null);
  const [loadMoreErrorState, setLoadMoreErrorState] = useState<LoadMoreErrorState | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [, setCacheRevision] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoConfirmSessionRequests, setAutoConfirmSessionRequests] = useState<boolean | null>(null);
  const sessionsLoadSeqRef = useRef(0);
  const agendaCacheRef = useRef<Map<string, AgendaCacheEntry>>(new Map());
  const loadAgendaRef = useRef<(options?: LoadAgendaOptions) => Promise<void>>(async () => undefined);
  const hasFocusedOnceRef = useRef(false);

  const agendaRange = useMemo(
    () => getAgendaCalendarRange(viewMode, selectedDate),
    [selectedDate, viewMode],
  );
  const agendaQuery = useMemo<professionalService.ProfessionalAgendaQuery>(() => {
    const origin = originFilter === 'ALL' ? undefined : originFilter;
    if (viewMode === 'list') return { view: 'list', origin, limit: 50 };
    return {
      view: 'calendar',
      origin,
      from: agendaRange?.from ?? '',
      to: agendaRange?.to ?? '',
    };
  }, [agendaRange?.from, agendaRange?.to, originFilter, viewMode]);
  const agendaQueryKey = JSON.stringify(agendaQuery);
  const [pendingQueryKey, setPendingQueryKey] = useState<string | null>(agendaQueryKey);
  const activeCacheEntry = agendaCacheRef.current.get(agendaQueryKey) ?? null;
  const sessions = activeCacheEntry?.sessions ?? EMPTY_SESSIONS;
  const agendaSummary = activeCacheEntry?.summary ?? EMPTY_AGENDA_SUMMARY;
  const nextCursor = activeCacheEntry?.nextCursor ?? null;
  const loadingMore = loadingMoreRequest?.queryKey === agendaQueryKey;
  const activeLoadMoreError = loadMoreErrorState?.queryKey === agendaQueryKey
    ? loadMoreErrorState
    : null;
  const loadMoreError = Boolean(activeLoadMoreError);
  const loadMoreErrorMessage = activeLoadMoreError?.message ?? '';
  const queryIsPending = pendingQueryKey === agendaQueryKey;
  const initialLoading = !hasLoadedOnce && !loadError && (!activeCacheEntry || queryIsPending);
  const refreshing = hasLoadedOnce && !loadError && (!activeCacheEntry || queryIsPending);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const writeCacheEntry = useCallback((key: string, entry: AgendaCacheEntry) => {
    const cache = agendaCacheRef.current;
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > AGENDA_CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (typeof oldestKey !== 'string') break;
      cache.delete(oldestKey);
    }
    setCacheRevision((revision) => revision + 1);
  }, []);

  const clearAgendaCache = useCallback(() => {
    agendaCacheRef.current.clear();
    setLoadMoreErrorState(null);
    setCacheRevision((revision) => revision + 1);
  }, []);

  const loadAgenda = useCallback(async (options: LoadAgendaOptions = {}) => {
    const append = options.append === true;
    if (options.invalidateCache) clearAgendaCache();

    const cachedEntry = agendaCacheRef.current.get(agendaQueryKey) ?? null;
    if (append && !cachedEntry?.nextCursor) return;

    const requestSeq = sessionsLoadSeqRef.current + 1;
    sessionsLoadSeqRef.current = requestSeq;
    if (
      !append
      && !options.force
      && cachedEntry
      && Date.now() - cachedEntry.loadedAt < AGENDA_CACHE_TTL_MS
    ) {
      agendaCacheRef.current.delete(agendaQueryKey);
      agendaCacheRef.current.set(agendaQueryKey, cachedEntry);
      setHasLoadedOnce(true);
      setLoadError(false);
      setLoadErrorMessage('');
      setPendingQueryKey((currentKey) => currentKey === agendaQueryKey ? null : currentKey);
      return;
    }

    try {
      if (append) {
        setLoadingMoreRequest({ queryKey: agendaQueryKey, requestSeq });
        setLoadMoreErrorState((currentError) => (
          currentError?.queryKey === agendaQueryKey ? null : currentError
        ));
      } else {
        setPendingQueryKey(agendaQueryKey);
        setLoadError(false);
        setLoadErrorMessage('');
        setLoadMoreErrorState((currentError) => (
          currentError?.queryKey === agendaQueryKey ? null : currentError
        ));
      }

      const response = await professionalService.getProfessionalAgenda(
        append && agendaQuery.view === 'list'
          ? { ...agendaQuery, cursor: cachedEntry?.nextCursor ?? undefined }
          : agendaQuery,
      );
      const mappedSessions = response.items.map(mapAgendaItem);
      if (sessionsLoadSeqRef.current !== requestSeq) return;

      const nextSessions = append
        ? Array.from(new Map(
          [...(cachedEntry?.sessions ?? EMPTY_SESSIONS), ...mappedSessions]
            .map((session) => [session.id, session]),
        ).values())
        : mappedSessions;
      writeCacheEntry(agendaQueryKey, {
        sessions: nextSessions,
        summary: response.summary,
        nextCursor: response.nextCursor,
        loadedAt: Date.now(),
      });
      setHasLoadedOnce(true);
      setLoadError(false);
      setLoadErrorMessage('');
      if (append) {
        setLoadMoreErrorState((currentError) => (
          currentError?.queryKey === agendaQueryKey ? null : currentError
        ));
      }
    } catch (error) {
      if (sessionsLoadSeqRef.current !== requestSeq) return;
      const message = getErrorMessage(error, 'No se pudieron cargar las sesiones');
      if (append) {
        setLoadMoreErrorState({ queryKey: agendaQueryKey, message });
      } else {
        setLoadError(true);
        setLoadErrorMessage(message);
      }
    } finally {
      if (append) {
        setLoadingMoreRequest((currentRequest) => (
          currentRequest?.queryKey === agendaQueryKey
          && currentRequest.requestSeq === requestSeq
            ? null
            : currentRequest
        ));
      }
      if (sessionsLoadSeqRef.current === requestSeq) {
        setPendingQueryKey((currentKey) => currentKey === agendaQueryKey ? null : currentKey);
      }
    }
  }, [agendaQuery, agendaQueryKey, clearAgendaCache, writeCacheEntry]);

  loadAgendaRef.current = loadAgenda;

  const loadAgendaPreference = useCallback(async () => {
    try {
      const preferences = await professionalService.getAgendaPreferences();
      setAutoConfirmSessionRequests(preferences?.autoConfirmSessionRequests ?? null);
    } catch {
      // A neutral chip is safer than blocking the calendar when preferences fail.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAgendaPreference();
    }, [loadAgendaPreference]),
  );

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      void loadAgendaRef.current({ force: true });
    }, []),
  );

  useEffect(() => () => {
    sessionsLoadSeqRef.current += 1;
  }, []);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const sessionsForDate = useMemo(
    () => sessions
      .filter((session) => isSameCalendarDay(session.date, selectedDate))
      .sort((left, right) => left.date.getTime() - right.date.getTime()),
    [selectedDate, sessions],
  );
  const sessionsForWeek = useMemo(
    () => sessions
      .filter((session) => weekDays.some((day) => isSameCalendarDay(day, session.date)))
      .sort((left, right) => left.date.getTime() - right.date.getTime()),
    [sessions, weekDays],
  );
  const sessionsByDate = useMemo(() => {
    const index = new Map<string, ProfessionalSession[]>();
    sessions.forEach((session) => {
      const key = toCalendarDateKey(session.date);
      const current = index.get(key) ?? [];
      current.push(session);
      index.set(key, current);
    });
    index.forEach((items) => items.sort((left, right) => left.date.getTime() - right.date.getTime()));
    return index;
  }, [sessions]);
  const nextUpcomingSession = useMemo(
    () => [...sessions]
      .filter((session) => session.status !== 'cancelled' && session.date.getTime() >= currentTime.getTime())
      .sort((left, right) => left.date.getTime() - right.date.getTime())[0] ?? null,
    [currentTime, sessions],
  );

  const refreshAgenda = useCallback(
    () => loadAgenda({ force: true }),
    [loadAgenda],
  );
  const refreshAfterMutation = useCallback(
    () => loadAgenda({ force: true, invalidateCache: true }),
    [loadAgenda],
  );
  const loadMoreSessions = useCallback(
    () => loadAgenda({ append: true }),
    [loadAgenda],
  );

  const navigateDate = useCallback((direction: number) => {
    setSelectedDate((previous) => {
      const next = new Date(previous);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + direction, 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setDate(next.getDate() + direction);
      }
      return next;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => setSelectedDate(new Date()), []);
  const jumpToNextSession = useCallback(() => {
    if (!nextUpcomingSession) return;
    setSelectedDate(new Date(nextUpcomingSession.date));
    setViewMode('day');
  }, [nextUpcomingSession]);

  return {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    originFilter,
    setOriginFilter,
    initialLoading,
    refreshing,
    hasLoadedOnce,
    loadError,
    loadErrorMessage,
    sessions,
    agendaSummary,
    nextCursor,
    loadingMore,
    loadMoreError,
    loadMoreErrorMessage,
    currentTime,
    autoConfirmSessionRequests,
    weekDays,
    sessionsForDate,
    sessionsForWeek,
    sessionsByDate,
    nextUpcomingSession,
    refreshAgenda,
    refreshAfterMutation,
    loadMoreSessions,
    navigateDate,
    goToToday,
    jumpToNextSession,
  };
}
