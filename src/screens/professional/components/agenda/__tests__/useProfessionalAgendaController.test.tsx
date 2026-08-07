import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as professionalService from '../../../../../services/professionalService';
import { useProfessionalAgendaController } from '../useProfessionalAgendaController';

jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
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
    getAgendaPreferencesMock.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the full loading state only before the first successful response', async () => {
    const initialRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(initialRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());

    expect(result.current.initialLoading).toBe(true);
    expect(result.current.refreshing).toBe(false);

    await act(async () => initialRequest.resolve(createAgendaResponse('initial')));
    await waitFor(() => expect(result.current.initialLoading).toBe(false));
    expect(result.current.hasLoadedOnce).toBe(true);
    expect(result.current.sessions[0]?.id).toBe('initial');
    unmount();
  });

  it('uses the initial error state when the agenda has never loaded', async () => {
    getProfessionalAgendaMock.mockRejectedValueOnce(new Error('Sin conexión'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());

    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasLoadedOnce).toBe(false);
    expect(result.current.sessions).toEqual([]);
    unmount();
  });

  it('keeps navigation non-blocking and never exposes sessions from another query', async () => {
    getProfessionalAgendaMock.mockResolvedValueOnce(createAgendaResponse('all'));
    const clinicRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(clinicRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('all'));

    act(() => result.current.setOriginFilter('CLINIC'));
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.sessions).toEqual([]);

    await act(async () => clinicRequest.resolve(createAgendaResponse('clinic')));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('clinic'));
    expect(result.current.refreshing).toBe(false);
    unmount();
  });

  it('reuses fresh entries and revalidates them after thirty seconds', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('first'))
      .mockResolvedValueOnce(createAgendaResponse('next'))
      .mockResolvedValueOnce(createAgendaResponse('next-refreshed'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
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
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
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
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
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

  it('keeps each cached summary paired with its sessions when stale revalidation fails', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('all', undefined, { today: 1, week: 2, pending: 0 }))
      .mockResolvedValueOnce(createAgendaResponse('clinic', undefined, { today: 4, week: 7, pending: 3 }));
    const staleClinicRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(staleClinicRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('all'));

    act(() => result.current.setOriginFilter('CLINIC'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('clinic'));
    expect(result.current.agendaSummary).toEqual({ today: 4, week: 7, pending: 3 });

    act(() => result.current.setOriginFilter('ALL'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('all'));
    expect(result.current.agendaSummary).toEqual({ today: 1, week: 2, pending: 0 });

    now += 30_001;
    act(() => result.current.setOriginFilter('CLINIC'));
    expect(result.current.sessions[0]?.id).toBe('clinic');
    expect(result.current.agendaSummary).toEqual({ today: 4, week: 7, pending: 3 });
    await act(async () => staleClinicRequest.reject(new Error('Sin conexión')));
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.sessions[0]?.id).toBe('clinic');
    expect(result.current.agendaSummary).toEqual({ today: 4, week: 7, pending: 3 });
    unmount();
  });

  it('invalidates every cached period after a mutation', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('first'))
      .mockResolvedValueOnce(createAgendaResponse('next'))
      .mockResolvedValueOnce(createAgendaResponse('first-updated'))
      .mockResolvedValueOnce(createAgendaResponse('next-updated'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
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

  it('keeps list pagination isolated in loadingMore and merges unique sessions', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('calendar'))
      .mockResolvedValueOnce({ ...createAgendaResponse('page-1'), nextCursor: 'next-page' });
    const nextPageRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(nextPageRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('calendar'));

    act(() => result.current.setViewMode('list'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('page-1'));
    act(() => { void result.current.loadMoreSessions(); });
    await waitFor(() => expect(result.current.loadingMore).toBe(true));
    expect(result.current.refreshing).toBe(false);
    expect(getProfessionalAgendaMock.mock.calls[2]?.[0]).toMatchObject({ cursor: 'next-page' });

    await act(async () => nextPageRequest.resolve(createAgendaResponse('page-2')));
    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    expect(result.current.sessions.map((session) => session.id)).toEqual(['page-1', 'page-2']);
    unmount();
  });

  it('keeps pagination errors local and retries without discarding loaded pages', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('calendar'))
      .mockResolvedValueOnce({ ...createAgendaResponse('page-1'), nextCursor: 'next-page' })
      .mockRejectedValueOnce(new Error('Falló la página siguiente'))
      .mockResolvedValueOnce(createAgendaResponse('page-2'));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('calendar'));

    act(() => result.current.setViewMode('list'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('page-1'));
    await act(async () => { await result.current.loadMoreSessions(); });

    expect(result.current.loadError).toBe(false);
    expect(result.current.loadMoreError).toBe(true);
    expect(result.current.loadMoreErrorMessage).toBe('Falló la página siguiente');
    expect(result.current.sessions.map((session) => session.id)).toEqual(['page-1']);
    expect(result.current.nextCursor).toBe('next-page');

    await act(async () => { await result.current.loadMoreSessions(); });

    expect(result.current.loadMoreError).toBe(false);
    expect(result.current.sessions.map((session) => session.id)).toEqual(['page-1', 'page-2']);
    expect(getProfessionalAgendaMock.mock.calls[2]?.[0]).toMatchObject({ cursor: 'next-page' });
    expect(getProfessionalAgendaMock.mock.calls[3]?.[0]).toMatchObject({ cursor: 'next-page' });
    unmount();
  });

  it('does not keep pagination busy after navigating away from an interrupted page request', async () => {
    getProfessionalAgendaMock
      .mockResolvedValueOnce(createAgendaResponse('calendar'))
      .mockResolvedValueOnce({ ...createAgendaResponse('page-1'), nextCursor: 'next-page' });
    const interruptedPageRequest = createDeferred<professionalService.ProfessionalAgendaResponse>();
    getProfessionalAgendaMock.mockReturnValueOnce(interruptedPageRequest.promise);
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('calendar'));

    act(() => result.current.setViewMode('list'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('page-1'));
    act(() => { void result.current.loadMoreSessions(); });
    await waitFor(() => expect(result.current.loadingMore).toBe(true));

    act(() => result.current.setViewMode('week'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('calendar'));
    expect(result.current.loadingMore).toBe(false);

    await act(async () => interruptedPageRequest.resolve(createAgendaResponse('stale-page')));
    act(() => result.current.setViewMode('list'));
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('page-1'));
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.sessions.map((session) => session.id)).toEqual(['page-1']);
    unmount();
  });

  it('evicts the least recently used period after twelve entries', async () => {
    getProfessionalAgendaMock.mockImplementation(async (query) => (
      createAgendaResponse(query.view === 'calendar' ? query.from : 'list')
    ));
    const { result, unmount } = renderHook(() => useProfessionalAgendaController());
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(1));

    for (let index = 1; index <= 12; index += 1) {
      act(() => result.current.navigateDate(1));
      await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(index + 1));
    }

    act(() => result.current.navigateDate(-12));
    await waitFor(() => expect(getProfessionalAgendaMock).toHaveBeenCalledTimes(14));
    unmount();
  });
});
