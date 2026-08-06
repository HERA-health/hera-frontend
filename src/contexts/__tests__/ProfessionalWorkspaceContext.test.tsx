import React from 'react';
import { AppState, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const homePayload = {
  generatedAt: '2026-08-04T08:00:00.000Z',
  timeZone: 'Europe/Madrid',
  nextSession: null,
  today: { date: '2026-08-04', bookedMinutes: 0, sessions: [] },
  week: {
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    totalSessions: 0,
    bookedMinutes: 0,
    completedSessions: 0,
    pendingSessions: 0,
    days: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 3).padStart(2, '0')}`,
      sessions: 0,
      bookedMinutes: 0,
    })),
  },
  availabilityConfiguredDays: 5,
  pendingRequests: { total: 0, items: [] },
  draftInvoices: 0,
  automation: {
    sessionConfirmation: true,
    invoiceGeneration: true,
    invoiceDelivery: true,
  },
} as const;

const mockGetProfessionalHome = jest.fn();
const mockGetCachedProfessionalHome = jest.fn();
const mockGetSpecialistContactSummary = jest.fn();
let mockHomeChangeListener: (() => void) | null = null;
let mockSupportChangeListener: (() => void) | null = null;

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve; });
  return { promise, resolve };
};

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { id: 'professional-a', type: 'professional' } }),
}));

jest.mock('../../services/dashboardService', () => ({
  dashboardService: {
    getProfessionalHome: (...args: unknown[]) => mockGetProfessionalHome(...args),
    getCachedProfessionalHome: () => mockGetCachedProfessionalHome(),
  },
  subscribeProfessionalHomeChanges: (listener: () => void) => {
    mockHomeChangeListener = listener;
    return () => { mockHomeChangeListener = null; };
  },
}));

jest.mock('../../services/specialistContactService', () => ({
  getSpecialistContactSummary: () => mockGetSpecialistContactSummary(),
  subscribeSpecialistContactSummary: (listener: () => void) => {
    mockSupportChangeListener = listener;
    return () => { mockSupportChangeListener = null; };
  },
}));

import {
  ProfessionalWorkspaceProvider,
  useProfessionalWorkspace,
} from '../ProfessionalWorkspaceContext';

function StatusProbe(): React.ReactElement {
  const workspace = useProfessionalWorkspace();
  return (
    <Text>
      {workspace.homeStatus}:{workspace.supportStatus}:{workspace.homeData?.today.date ?? 'none'}
    </Text>
  );
}

function AttentionProbe(): React.ReactElement {
  const { refreshAttention } = useProfessionalWorkspace();
  return <Text testID="refresh-attention" onPress={() => { void refreshAttention(); }}>Atención</Text>;
}

describe('ProfessionalWorkspaceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomeChangeListener = null;
    mockSupportChangeListener = null;
    mockGetCachedProfessionalHome.mockReturnValue(null);
    mockGetProfessionalHome.mockResolvedValue(homePayload);
    mockGetSpecialistContactSummary.mockResolvedValue({ unreadHelpRequests: 0 });
  });

  it('loads each shared source once and does not refetch fresh data on route changes', async () => {
    const view = render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );

    await waitFor(() => expect(view.getByText('ready:ready:2026-08-04')).toBeTruthy());
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1);
    expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(1);

    view.rerender(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalSessions">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );

    await waitFor(() => expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1));
    expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(1);
  });

  it('preserves cached home data and marks it stale when refresh fails', async () => {
    mockGetCachedProfessionalHome.mockReturnValue(homePayload);
    mockGetProfessionalHome.mockRejectedValue(new Error('network'));

    const view = render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );

    await waitFor(() => expect(view.getByText('stale:ready:2026-08-04')).toBeTruthy());
  });

  it('reports an unavailable source instead of treating a first-load error as ready', async () => {
    mockGetProfessionalHome.mockRejectedValue(new Error('network'));

    const view = render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );

    await waitFor(() => expect(view.getByText('error:ready:none')).toBeTruthy());
  });

  it('subscribes once to domain invalidations and refreshes only the changed source', async () => {
    render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );
    await waitFor(() => expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1));

    await act(async () => { mockHomeChangeListener?.(); });
    await waitFor(() => expect(mockGetProfessionalHome).toHaveBeenCalledTimes(2));
    expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(1);

    await act(async () => { mockSupportChangeListener?.(); });
    await waitFor(() => expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(2));
  });

  it('refreshes both sources every 60 seconds only while Home remains mounted', async () => {
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    jest.useFakeTimers();
    const view = render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );

    await act(async () => { await Promise.resolve(); });
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1);
    expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(2);
    expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(2);

    view.unmount();
    jest.advanceTimersByTime(60_000);
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('queues one fresh Home request when invalidated during an in-flight load', async () => {
    const first = createDeferred<typeof homePayload>();
    const refreshed = {
      ...homePayload,
      today: { ...homePayload.today, date: '2026-08-05' },
    } as const;
    mockGetProfessionalHome
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(refreshed);

    const view = render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );
    await act(async () => { mockHomeChangeListener?.(); });
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve(homePayload);
      await first.promise;
      await Promise.resolve();
    });

    await waitFor(() => expect(view.getByText('ready:ready:2026-08-05')).toBeTruthy());
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(2);
  });

  it('queues one fresh support request when invalidated during an in-flight load', async () => {
    const first = createDeferred<{ unreadHelpRequests: number }>();
    mockGetSpecialistContactSummary
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ unreadHelpRequests: 1 });

    render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <StatusProbe />
      </ProfessionalWorkspaceProvider>,
    );
    await act(async () => { mockSupportChangeListener?.(); });
    expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve({ unreadHelpRequests: 0 });
      await first.promise;
      await Promise.resolve();
    });

    await waitFor(() => expect(mockGetSpecialistContactSummary).toHaveBeenCalledTimes(2));
  });

  it('does not queue a duplicate Home request when Attention opens during a load', async () => {
    const first = createDeferred<typeof homePayload>();
    mockGetProfessionalHome.mockReturnValueOnce(first.promise);

    const view = render(
      <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome">
        <AttentionProbe />
      </ProfessionalWorkspaceProvider>,
    );

    fireEvent.press(view.getByTestId('refresh-attention'));
    expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve(homePayload);
      await first.promise;
    });
    await waitFor(() => expect(mockGetProfessionalHome).toHaveBeenCalledTimes(1));
  });
});
