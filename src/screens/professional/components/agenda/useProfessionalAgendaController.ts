import { AppState, Platform } from 'react-native';
import { getExternalCalendarEvents } from '../../../../services/googleCalendarService';
import type { ExternalCalendarEvent, ExternalCalendarVerification } from '../../../../services/externalCalendarContracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { z } from 'zod';
import { useRateLimitRecovery } from '../../../../hooks/useGeneralRateLimit';
import type { ProfessionalSession, SessionViewMode } from '../../../../constants/types';
import { getErrorMessage } from '../../../../constants/errors';
import * as professionalService from '../../../../services/professionalService';
import { getGoogleCalendarStatus, type GoogleCalendarStatus } from '../../../../services/googleCalendarService';
import { addCalendarDays, calendarDate, filterAgendaSessions, getAgendaCalendarRange, getMonthDays, getWeekDays, mapAgendaItem, toCalendarDateKey, type AgendaOriginFilter, type AgendaStatusFilter } from './professionalAgendaUtils';
import { getAgendaHours, sessionIntersectsDay } from './agendaTimeline';

interface CacheEntry { sessions: ProfessionalSession[]; loadedAt: number; }
const EMPTY: ProfessionalSession[] = [];
const preferenceSchema = z.object({
  view: z.enum(['day', 'week', 'month', 'list']),
  origin: z.enum(['ALL', 'DIRECTORY', 'OWN', 'REFERRAL', 'COLLABORATION', 'UNDETERMINED']),
  status: z.enum(['ACTIVE', 'ALL', 'PENDING', 'CANCELLED']),
}).strict();
const storageKey = (id: string) => `hera:agenda:v2:${id}`;

export function useProfessionalAgendaController(userId: string | null, initialView: SessionViewMode = 'week') {
  const isFocused = useIsFocused();
  const [viewMode, setViewMode] = useState(initialView);
  const [selectedDate, setSelectedDate] = useState(() => calendarDate(toCalendarDateKey(new Date())));
  const [originFilter, setOriginFilter] = useState<AgendaOriginFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('ACTIVE');
  const [readyUser, setReadyUser] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState('');
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [externalData, setExternalData] = useState<{ key: string; receivedAt: number; events: ExternalCalendarEvent[]; verification: ExternalCalendarVerification } | null>(null);
  const [externalRefreshing, setExternalRefreshing] = useState(false);
  const [externalLoadError, setExternalLoadError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [loadedUser, setLoadedUser] = useState<string | null>(null);
  const [, refreshCache] = useState(0);
  const cache = useRef(new Map<string, CacheEntry>());
  const inFlight = useRef(new Map<string, Promise<void>>());
  const generation = useRef(0);
  const alive = useRef(true);
  const dirtyPreferences = useRef(false);
  const writeQueue = useRef(Promise.resolve());
  const dayScrollPosition = useRef<number | null>(null);
  const listScrollPosition = useRef<number | null>(null);
  const monthScrollPosition = useRef<number | null>(null);
  const weekScrollPosition = useRef<number | null>(null);
  const [scrollRequest, setScrollRequest] = useState(0);
  const [scrollTarget, setScrollTarget] = useState<Date | null>(null);
  const range = useMemo(() => getAgendaCalendarRange(viewMode, selectedDate), [viewMode, selectedDate]);
  const query = useMemo<professionalService.ProfessionalAgendaQuery>(() => ({ view: 'calendar', from: range.from, to: range.to }), [range.from, range.to]);
  const key = JSON.stringify([userId, query, 'provenanceDetails=1']);
  const activeKey = useRef(key); activeKey.current = key;
  const activeUser = useRef(userId); activeUser.current = userId;
  const entry = cache.current.get(key);
  const rawSessions = entry?.sessions ?? EMPTY;
  const sessions = useMemo(() => filterAgendaSessions(rawSessions, originFilter, statusFilter), [rawSessions, originFilter, statusFilter]);
  const hasLoadedOnce = loadedUser === userId && Boolean(userId);
  const isPending = pendingKey === key || (!entry && !loadErrorMessage);

  useEffect(() => {
    let cancelled = false;
    dirtyPreferences.current = false;
    setReadyUser(null); setLoadedUser(null); setLoadErrorMessage(''); setPreferenceError('');
    setViewMode(initialView); setOriginFilter('ALL'); setStatusFilter('ACTIVE');
    setScrollTarget(null);
    setSelectedDate(calendarDate(toCalendarDateKey(new Date())));
    dayScrollPosition.current = null; weekScrollPosition.current = null; listScrollPosition.current = null; monthScrollPosition.current = null;
    cache.current.clear(); inFlight.current.clear(); generation.current += 1;
    if (!userId) return;
    void AsyncStorage.getItem(storageKey(userId)).then((value) => {
      if (cancelled || dirtyPreferences.current || !value) return;
      let parsed: unknown;
      try { parsed = JSON.parse(value); } catch { return; }
      const saved = preferenceSchema.safeParse(parsed);
      if (saved.success) { setViewMode(saved.data.view); setOriginFilter(saved.data.origin); setStatusFilter(saved.data.status); }
    }).catch(() => { if (!cancelled) setPreferenceError('No se pudieron recuperar las preferencias de vista.'); })
      .finally(() => { if (!cancelled) setReadyUser(userId); });
    return () => { cancelled = true; };
    // Use the entry viewport, not subsequent resizes, for the default view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || readyUser !== userId || !dirtyPreferences.current) return;
    const value = JSON.stringify({ view: viewMode, origin: originFilter, status: statusFilter });
    writeQueue.current = writeQueue.current.then(() => AsyncStorage.setItem(storageKey(userId), value))
      .then(() => { if (activeUser.current === userId) setPreferenceError(''); })
      .catch(() => { if (activeUser.current === userId) setPreferenceError('La vista se ha aplicado, pero no se pudo recordar en este dispositivo.'); });
  }, [userId, readyUser, viewMode, originFilter, statusFilter]);

  const load = useCallback(async (force = false) => {
    if (!userId || readyUser !== userId) return;
    const existing = inFlight.current.get(key);
    if (existing) { setPendingKey(key); return existing; }
    const cached = cache.current.get(key);
    if (!force && cached && Date.now() - cached.loadedAt < 30_000) { setLoadErrorMessage(''); setLoadedUser(userId); setPendingKey(null); return; }
    const requestGeneration = generation.current;
    setPendingKey(key); setLoadErrorMessage('');
    const request = professionalService.getProfessionalAgenda(query).then((response) => {
      if (!alive.current || requestGeneration !== generation.current) return;
      cache.current.delete(key);
      cache.current.set(key, { sessions: response.items.map(mapAgendaItem), loadedAt: Date.now() });
      while (cache.current.size > 12) {
        const oldest = cache.current.keys().next().value;
        if (oldest) cache.current.delete(oldest);
      }
      if (activeKey.current === key) { setLoadedUser(userId); setLoadErrorMessage(''); refreshCache((revision) => revision + 1); }
    }).catch((error: unknown) => {
      if (alive.current && requestGeneration === generation.current && activeKey.current === key) setLoadErrorMessage(getErrorMessage(error, 'No se pudieron cargar las sesiones'));
    }).finally(() => {
      if (inFlight.current.get(key) === request) inFlight.current.delete(key);
      if (alive.current && requestGeneration === generation.current && activeKey.current === key) setPendingKey(null);
    });
    inFlight.current.set(key, request);
    return request;
  }, [key, query, readyUser, userId]);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => { void load(); }, [load]);
  const focusSeen = useRef(false);
  useFocusEffect(useCallback(() => {
    if (focusSeen.current) void loadRef.current(true);
    focusSeen.current = true;
  }, []));
  useFocusEffect(useCallback(() => {
    let active = true;
    setGoogleCalendarStatus(null);
    if (userId) {
      void getGoogleCalendarStatus().then((status) => {
        if (active) setGoogleCalendarStatus(status);
      }).catch(() => {
        if (active) setGoogleCalendarStatus(null);
      });
    }
    return () => { active = false; };
  }, [userId]));
  useRateLimitRecovery(isFocused, () => { void loadRef.current(true); }, { reloadsOnFocus: true });
  useEffect(() => {
    alive.current = true;
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => { alive.current = false; generation.current += 1; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!isFocused || !userId || !googleCalendarStatus?.import?.enabled) { setExternalData(null); setExternalRefreshing(false); setExternalLoadError(''); return; }
    let active = true, pending = false, lastRead = 0;
    const fromHours = getAgendaHours(calendarDate(range.from));
    const toHours = getAgendaHours(calendarDate(range.to));
    const from = new Date(fromHours[0].start).toISOString(), to = new Date(toHours[toHours.length - 1].end).toISOString();
    const refresh = async () => {
      if (pending || Date.now() - lastRead < 60_000) return;
      pending = true; lastRead = Date.now(); setExternalRefreshing(true);
      try {
        const result = await getExternalCalendarEvents(from, to);
        lastRead = Date.now();
        if (active) { setExternalLoadError(''); setExternalData({ key, receivedAt: lastRead, ...result }); }
      } catch {
        if (active) setExternalLoadError('No hemos podido cargar los eventos de Google en HERA. Vuelve a intentarlo.');
        if (active) setExternalData(previous => ({ key, receivedAt: previous?.receivedAt ?? 0, events: previous?.key === key ? previous.events.filter(event => event.expiresAt && Date.parse(event.expiresAt) > Date.now()) : [], verification: { status: 'UNAVAILABLE', checkedAt: null } }));
      } finally { pending = false; if (active) setExternalRefreshing(false); }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 60_000);
    const focus = () => { void refresh(); };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') focus(); });
    if (Platform.OS === 'web') window.addEventListener('focus', focus);
    return () => { active = false; clearInterval(timer); subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('focus', focus); };
  }, [isFocused, userId, key, range.from, range.to, googleCalendarStatus?.import?.enabled, googleCalendarStatus?.import?.revision]);
  const externalEvents = externalData?.key === key ? externalData.events : [];
  const externalVerification = externalData?.key === key ? externalData.verification : null;

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const sessionsForDate = useMemo(() => sessions.filter((session) => sessionIntersectsDay(session, selectedDate)), [sessions, selectedDate]);
  const sessionsForWeek = useMemo(() => sessions.filter((session) => weekDays.some((day) => sessionIntersectsDay(session, day))), [sessions, weekDays]);
  const sessionsByDate = useMemo(() => new Map(getMonthDays(selectedDate).map((day) => [toCalendarDateKey(day), sessions.filter((session) => sessionIntersectsDay(session, day))])), [sessions, selectedDate]);
  const nextUpcomingSession = useMemo(() => sessions.filter((session) => session.status !== 'cancelled' && session.date >= currentTime).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null, [sessions, currentTime]);
  const changeView = useCallback((view: SessionViewMode) => { dirtyPreferences.current = true; setViewMode(view); }, []);
  const changeOrigin = useCallback((origin: AgendaOriginFilter) => { dirtyPreferences.current = true; setOriginFilter(origin); }, []);
  const changeStatus = useCallback((status: AgendaStatusFilter) => { dirtyPreferences.current = true; setStatusFilter(status); }, []);
  const resetFilters = useCallback(() => { changeOrigin('ALL'); changeStatus('ACTIVE'); }, [changeOrigin, changeStatus]);
  const navigateDate = useCallback((direction: number) => setSelectedDate((previous) => {
    if (viewMode !== 'month') return addCalendarDays(previous, direction * (viewMode === 'day' ? 1 : 7));
    const date = calendarDate(`${toCalendarDateKey(previous).slice(0, 7)}-01`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    return date;
  }), [viewMode]);
  const goToToday = useCallback(() => {
    setScrollTarget(null);
    setSelectedDate(calendarDate(toCalendarDateKey(new Date())));
    dayScrollPosition.current = null; weekScrollPosition.current = null; listScrollPosition.current = null; monthScrollPosition.current = null; setScrollRequest((value) => value + 1);
  }, []);
  const refreshAfterMutation = useCallback(async () => {
    generation.current += 1; cache.current.clear(); inFlight.current.clear();
    await loadRef.current(true);
  }, []);

  return {
    viewMode, setViewMode: changeView, selectedDate, setSelectedDate,
    originFilter, setOriginFilter: changeOrigin, statusFilter, setStatusFilter: changeStatus, resetFilters,
    externalEvents, externalVerification, externalRefreshing, externalLoadError, preferenceError, googleCalendarStatus, sessions, rawSessionCount: rawSessions.length,
    initialLoading: Boolean(userId) && (!hasLoadedOnce && !loadErrorMessage && (readyUser !== userId || isPending)),
    dataReady: Boolean(entry),
    refreshing: hasLoadedOnce && isPending, hasLoadedOnce, loadError: Boolean(loadErrorMessage), loadErrorMessage,
    currentTime, weekDays, sessionsForDate, sessionsForWeek, sessionsByDate, nextUpcomingSession,
    dayScrollPosition, weekScrollPosition, listScrollPosition, monthScrollPosition, scrollRequest, scrollTarget,
    refreshAgenda: () => load(true), refreshAfterMutation, navigateDate, goToToday,
    jumpToNextSession: () => { if (nextUpcomingSession) { setScrollTarget(nextUpcomingSession.date); setSelectedDate(calendarDate(toCalendarDateKey(nextUpcomingSession.date))); dayScrollPosition.current = null; changeView('day'); setScrollRequest((value) => value + 1); } },
  };
}
