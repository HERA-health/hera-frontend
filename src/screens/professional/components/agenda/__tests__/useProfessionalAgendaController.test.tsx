import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as professionalService from '../../../../../services/professionalService';
import { useProfessionalAgendaController } from '../useProfessionalAgendaController';

jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    useIsFocused: () => true,
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(effect, [effect]),
  };
});

jest.mock('../../../../../services/professionalService', () => ({
  getAgendaPreferences: jest.fn(),
  getProfessionalAgenda: jest.fn(),
}));

const getProfessionalAgendaMock = professionalService.getProfessionalAgenda as jest.MockedFunction<
  typeof professionalService.getProfessionalAgenda
>;
const getAgendaPreferencesMock = professionalService.getAgendaPreferences as jest.MockedFunction<
  typeof professionalService.getAgendaPreferences
>;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((error: Error) => void) | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: (value) => resolvePromise?.(value),
    reject: (error) => rejectPromise?.(error),
  };
}

function createAgendaResponse(
  id: string,
  startsAt = '2026-08-06T10:00:00.000Z',
  summary: professionalService.ProfessionalAgendaResponse['summary'] = { today: 1, week: 1, pending: 0 },
): professionalService.ProfessionalAgendaResponse {
  return {
    items: [{
      id,
      client: { id: `client-${id}`, displayName: `Paciente ${id}`, avatar: null },
      startsAt,
      durationMinutes: 60,
      status: 'CONFIRMED',
      type: 'VIDEO_CALL',
      hasInvoice: false,
      origin: 'PRIVATE',
      clinicContext: null,
      actions: {
        canConfirm: false,
        canCancel: true,
        canComplete: false,
        canModifySchedule: true,
        canJoinVideo: true,
        canOpenClinicalNotes: true,
      },
    }],
    summary,
    nextCursor: null,
  };
}

describe('useProfessionalAgendaController', () => {
  let now: number;

  beforeEach(() => {
    jest.clearAllMocks();
    now = new Date('2026-08-06T08:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([true, false])('reuses a pending date after navigating away and back (first resolves first: %s)', async (firstResolvesFirst) => {
    const first = createDeferred<professionalService.ProfessionalAgendaResponse>();
    const second = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));
    expect(result.current.dataReady).toBe(false);
    act(() => result.current.navigateDate(1));
    act(() => result.current.navigateDate(-1));
    if (firstResolvesFirst) {
      await act(async () => first.resolve(createAgendaResponse('first')));
      await act(async () => second.resolve(createAgendaResponse('second')));
    } else {
      await act(async () => second.resolve(createAgendaResponse('second')));
      await act(async () => first.resolve(createAgendaResponse('first')));
    }
    expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(2);
    expect(result.current.sessions.map(item => item.id)).toEqual(['first']);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.initialLoading).toBe(false);
    unmount();
  });

  it('shows the error of a rejoined date and allows retrying it', async () => {
    const first = createDeferred<professionalService.ProfessionalAgendaResponse>();
    const second = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      .mockResolvedValueOnce(createAgendaResponse('retried'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));
    act(() => result.current.navigateDate(1));
    act(() => result.current.navigateDate(-1));
    await act(async () => first.reject(new Error('Sin conexión')));
    await act(async () => second.resolve(createAgendaResponse('second')));
    expect(result.current.loadError).toBe(true);
    expect(result.current.refreshing).toBe(false);
    await act(async () => { await result.current.refreshAgenda(); });
    expect(result.current.sessions[0]?.id).toBe('retried');
    expect(result.current.loadError).toBe(false);
    unmount();
  });

  it('does not confuse request identities after rejoining an earlier date', async () => {
    const first = createDeferred<professionalService.ProfessionalAgendaResponse>();
    const second = createDeferred<professionalService.ProfessionalAgendaResponse>();
    const third = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));
    act(() => result.current.navigateDate(1));
    act(() => result.current.navigateDate(-1));
    act(() => result.current.navigateDate(2));
    await act(async () => third.resolve(createAgendaResponse('third')));
    await act(async () => second.reject(new Error('Old failure')));
    await act(async () => first.resolve(createAgendaResponse('first')));
    expect(result.current.sessions[0]?.id).toBe('third');
    expect(result.current.loadError).toBe(false);
    expect(result.current.refreshing).toBe(false);
    unmount();
  });



  it('uses the full loading state only before the first successful response', async () => {
    const initialRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(initialRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));

    expect(result.current.initialLoading).toBe(true);
    expect(result.current.refreshing).toBe(false);

    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));
    await act(async () => initialRequest.resolve(createAgendaResponse('initial')));
    await waitFor(() => expect(result.current.initialLoading).toBe(false));
    expect(result.current.hasLoadedOnce).toBe(true);
    expect(result.current.sessions[0]?.id).toBe('initial');
    unmount();
  });

  it('uses the initial error state when the agenda has never loaded', async () => {
    getProfessionalAgendaMock.mockRejectedValueOnce(new Error('Sin conexión'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));

    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasLoadedOnce).toBe(false);
    expect(result.current.sessions).toEqual([]);
    unmount();
  });



  it('reuses fresh entries and revalidates them after thirty seconds', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('first'))
      .mockResolvedValueOnce(createAgendaResponse('next'))
      .mockResolvedValueOnce(createAgendaResponse('next-refreshed'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('first'));

    act(() => result.current.navigateDate(1));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('next'));
    act(() => result.current.navigateDate(-1));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('first'));
    expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(2);

    now += 30_001;
    act(() => result.current.navigateDate(1));
    expect(result.current.sessions[0]?.id).toBe('next');
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('next-refreshed'));
    expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('ignores an older response when navigation changes again', async () => {
    getProfessionalAgendaMock.mockResolvedValueOnce(createAgendaResponse('initial'));
    const slowRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    const latestRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock
      .mockReturnValueOnce(slowRequest.promise)
      .mockReturnValueOnce(latestRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('initial'));

    act(() => result.current.navigateDate(1));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(2));
    act(() => result.current.navigateDate(1));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(3));

    await act(async () => latestRequest.resolve(createAgendaResponse('latest')));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('latest'));
    await act(async () => slowRequest.resolve(createAgendaResponse('stale')));
    expect(result.current.sessions[0]?.id).toBe('latest');
    unmount();
  });

  it('keeps cached data when a background refresh fails', async () => {
    getProfessionalAgendaMock.mockResolvedValueOnce(createAgendaResponse('cached'));
    const refreshRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(refreshRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('cached'));

    act(() => { void result.current.refreshAgenda(); });
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.sessions[0]?.id).toBe('cached');
    await act(async () => refreshRequest.reject(new Error('Sin conexión')));

    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.refreshing).toBe(false);
    expect(result.current.sessions[0]?.id).toBe('cached');
    unmount();
  });



  it('invalidates every cached period after a mutation', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('first'))
      .mockResolvedValueOnce(createAgendaResponse('next'))
      .mockResolvedValueOnce(createAgendaResponse('first-updated'))
      .mockResolvedValueOnce(createAgendaResponse('next-updated'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('first'));
    act(() => result.current.navigateDate(1));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('next'));
    act(() => result.current.navigateDate(-1));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('first'));
    expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(2);

    await act(async () => { await result.current.refreshAfterMutation(); });
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('first-updated'));
    act(() => result.current.navigateDate(1));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('next-updated'));
    expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(4);
    unmount();
  });







  it('evicts the least recently used period after twelve entries', async () => {
    getProfessionalAgendaMock.mockImplementation(async (query) => (
      createAgendaResponse(query.view === 'calendar' ? query.from : 'list')
    ));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));

    for (let index = 1; index <= 12; index += 1) {
      act(() => result.current.navigateDate(1));
      await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(index + 1));
    }

    act(() => result.current.navigateDate(-12));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(14));
    unmount();
  });


  it('filters the full period in every view and keeps the list on the selected past week', async () => {
    const response = createAgendaResponse('active', '2026-08-06T10:00:00Z');
    response.items[0].provenance = 'OWN';
    response.items.push({ ...response.items[0], id: 'cancelled', status: 'CANCELLED', provenance: 'DIRECTORY' });
    getProfessionalAgendaMock.mockResolvedValue(response);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(result.current.hasLoadedOnce).toBe(true));
    act(() => result.current.setSelectedDate(new Date('2026-08-06T12:00:00Z')));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    for (const view of ['day', 'week', 'month', 'list'] as const) {
      act(() => result.current.setViewMode(view));
      await waitFor(() => expect(result.current.refreshing).toBe(false));
      expect(result.current.sessions.map((item) => item.id)).toEqual(['active']);
      act(() => { result.current.setStatusFilter('CANCELLED'); result.current.setOriginFilter('DIRECTORY'); });
      expect(result.current.sessions.map((item) => item.id)).toEqual(['cancelled']);
      act(() => result.current.resetFilters());
    }
    expect(getProfessionalAgendaMock.mock.calls.every(([query]) => query.view === 'calendar')).toBe(true);
    act(() => result.current.navigateDate(-1));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenLastCalledWith({ view: 'calendar', from: '2026-07-27', to: '2026-08-02' }));
    unmount();
  });

  it('persists only view and filters per account and never exposes a previous account response', async () => {
    const pending = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(pending.promise).mockResolvedValue(createAgendaResponse('second-account'));
    const { result, rerender, unmount } = renderHook(({ id }: { id: string }) => useProfessionalAgendaController(id), { initialProps: { id: 'user-1' } });
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));
    act(() => { result.current.setOriginFilter('DIRECTORY'); result.current.setStatusFilter('ALL'); });
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('hera:agenda:v2:user-1', JSON.stringify({ view: 'week', origin: 'DIRECTORY', status: 'ALL' })));
    rerender({ id: 'user-2' });
    expect(result.current.sessions).toEqual([]);
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('second-account'));
    expect(result.current.originFilter).toBe('ALL');
    expect(result.current.statusFilter).toBe('ACTIVE');
    await act(async () => pending.resolve(createAgendaResponse('first-account-secret')));
    expect(result.current.sessions[0]?.id).toBe('second-account');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('hera:agenda:v2:user-2');
    unmount();
  });

  it('restores view and filters and discards responses invalidated by a mutation', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify({ view: 'day', origin: 'ALL', status: 'ALL' }));
    const obsolete = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(obsolete.promise).mockResolvedValueOnce(createAgendaResponse('updated'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));
    expect(result.current.viewMode).toBe('day');
    expect(result.current.statusFilter).toBe('ALL');
    await act(async () => { await result.current.refreshAfterMutation(); });
    await act(async () => obsolete.resolve(createAgendaResponse('obsolete')));
    expect(result.current.sessions[0]?.id).toBe('updated');
    unmount();
  });


  it('carries an explicit scroll target into Day and clears it on Today', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    getProfessionalAgendaMock.mockResolvedValue(createAgendaResponse('next', future));
    const { result } = renderHook(() => useProfessionalAgendaController('user-1'));
    await waitFor(() => expect(result.current.nextUpcomingSession?.id).toBe('next'));
    expect(result.current.dataReady).toBe(true);
    await act(async () => result.current.jumpToNextSession());
    expect(result.current.viewMode).toBe('day');
    expect(result.current.scrollTarget?.toISOString()).toBe(future);
    expect(result.current.dayScrollPosition.current).toBeNull();
    await act(async () => result.current.goToToday());
    expect(result.current.scrollTarget).toBeNull();
  });
});
