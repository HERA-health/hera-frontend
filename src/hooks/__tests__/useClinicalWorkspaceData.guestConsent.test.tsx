import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useClinicalWorkspaceData } from '../useClinicalWorkspaceData';
import * as clinicalService from '../../services/clinicalService';

jest.mock('../../services/clinicalService', () => ({
  ClinicalGuestConsentAdminRequestError: class ClinicalGuestConsentAdminRequestError extends Error {
    classification = 'definitive';
  },
  getClinicalRecord: jest.fn(),
  requestClinicalGuestConsent: jest.fn(),
  requestDigitalConsent: jest.fn(),
  resendClinicalGuestConsent: jest.fn(),
  cancelClinicalGuestConsent: jest.fn(),
  requestClinicalGuestWithdrawal: jest.fn(),
  listClinicalNotes: jest.fn(),
}));

const recordFor = (clientId: string): clinicalService.ClinicalRecord => ({
  id: `record-${clientId}`,
  consentStatus: 'PENDING',
  consentGivenAt: null,
  consentVersion: null,
  consentMethod: null,
  consentRequestedAt: null,
  closedAt: null,
  retentionUntil: null,
  eligibleForManualReview: false,
  guestConsentActionsEnabled: true,
  guestConsentEligibility: 'ELIGIBLE',
  activeConsentRequest: null,
  client: {
    id: clientId,
    source: 'MANAGED',
    userId: null,
    user: { id: null, userType: 'CLIENT', name: 'Paciente de prueba', email: 'patient@example.com' },
    primaryEmail: 'patient@example.com',
  },
  notes: [],
  documents: [],
  sessionFolders: [],
  consentEvents: [],
  pagination: {
    notes: { limit: 20, total: 0, nextCursor: null, hasMore: false },
    documents: { limit: 20, total: 0, nextCursor: null, hasMore: false },
    sessionFolders: { limit: 20, total: 0, nextCursor: null, hasMore: false },
    consentEvents: { limit: 20, total: 0, nextCursor: null, hasMore: false },
  },
});

const pendingResult: clinicalService.ClinicalGuestConsentAdminResult = {
  requestId: 'request-a',
  channel: 'GUEST_EMAIL',
  requestKind: 'GRANT',
  status: 'PENDING',
  linkDeliveryStatus: 'PROVIDER_ACCEPTED',
  expiresAt: '2026-08-25T12:00:00.000Z',
  createdAt: '2026-08-24T12:00:00.000Z',
  redeemedAt: null,
  rejectedAt: null,
  revokedAt: null,
  expiredAt: null,
  cancelledAt: null,
};

describe('useClinicalWorkspaceData guest consent context', () => {
  afterEach(() => jest.restoreAllMocks());

  it('clears loading and ignores a late mutation after A → B → A', async () => {
    jest.spyOn(clinicalService, 'getClinicalRecord').mockImplementation(async (clientId) => recordFor(clientId));
    let resolveMutation: ((value: clinicalService.ClinicalGuestConsentAdminResult) => void) | undefined;
    jest.spyOn(clinicalService, 'requestClinicalGuestConsent').mockImplementation(() => new Promise((resolve) => {
      resolveMutation = resolve;
    }));
    const refresh = jest.fn(async () => undefined);
    const { result, rerender } = renderHook<
      ReturnType<typeof useClinicalWorkspaceData>,
      { clientId: string }
    >(
      ({ clientId }) => useClinicalWorkspaceData({
        clientId,
        token: 'token',
        onRequestRefreshClient: refresh,
      }),
      { initialProps: { clientId: 'client-a' } }
    );
    await waitFor(() => expect(result.current.record?.client.id).toBe('client-a'));

    let mutation: Promise<unknown> | undefined;
    act(() => {
      mutation = result.current.requestDigitalConsent();
    });
    expect(result.current.consentSubmitting).toBe(true);
    rerender({ clientId: 'client-b' });
    rerender({ clientId: 'client-a' });
    await waitFor(() => expect(result.current.consentSubmitting).toBe(false));

    await act(async () => {
      resolveMutation?.(pendingResult);
      await mutation;
    });
    expect(result.current.record?.activeConsentRequest).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not keep a terminal backend result as an active request when refresh fails', async () => {
    const getRecord = jest.spyOn(clinicalService, 'getClinicalRecord');
    getRecord.mockResolvedValueOnce(recordFor('client-a')).mockRejectedValueOnce(new Error('refresh failed'));
    jest.spyOn(clinicalService, 'requestClinicalGuestConsent').mockResolvedValue({
      ...pendingResult,
      status: 'CANCELLED',
      linkDeliveryStatus: 'FAILED',
      cancelledAt: '2026-08-24T12:01:00.000Z',
    });
    const { result } = renderHook(() => useClinicalWorkspaceData({
      clientId: 'client-a',
      token: 'token',
      onRequestRefreshClient: async () => { throw new Error('refresh failed'); },
    }));
    await waitFor(() => expect(result.current.record).not.toBeNull());

    await act(async () => {
      await result.current.requestDigitalConsent();
    });
    expect(result.current.record?.activeConsentRequest).toBeNull();
    expect(result.current.guestConsentSyncPending).toBe(true);
  });
});

test('the most recent record refresh wins even when an older response arrives last', async () => {
  let resolveOlder: ((record: clinicalService.ClinicalRecord) => void) | undefined;
  jest.mocked(clinicalService.getClinicalRecord).mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
    .mockResolvedValueOnce({ ...recordFor('patient'), consentStatus: 'GRANTED' });
  const { result } = renderHook(() => useClinicalWorkspaceData({ clientId: 'patient', token: 'unlocked' }));
  await act(async () => { await result.current.loadRecord(); });
  expect(result.current.record?.consentStatus).toBe('GRANTED');
  await act(async () => { resolveOlder?.(recordFor('patient')); });
  expect(result.current.record?.consentStatus).toBe('GRANTED');
});

test('a late notes page cannot repopulate a record after locking and unlocking', async () => {
  const initial = recordFor('patient');
  initial.pagination.notes = { ...initial.pagination.notes, hasMore: true, nextCursor: 'previous-note' };
  jest.mocked(clinicalService.getClinicalRecord).mockResolvedValue(initial);
  let resolvePage: ((page: { items: clinicalService.ClinicalNote[]; pageInfo: clinicalService.ClinicalPageInfo }) => void) | undefined;
  jest.mocked(clinicalService.listClinicalNotes).mockImplementation(() => new Promise(resolve => { resolvePage = resolve; }));
  const { result, rerender } = renderHook(({ token }: { token: string | null }) => useClinicalWorkspaceData({ clientId: 'patient', token }), { initialProps: { token: 'first' } });
  await waitFor(() => expect(result.current.record).not.toBeNull());
  let loading: Promise<unknown> | undefined;
  act(() => { loading = result.current.loadMoreNotes(); });
  rerender({ token: null });
  rerender({ token: 'second' });
  await waitFor(() => expect(result.current.record).not.toBeNull());
  await act(async () => {
    resolvePage?.({ items: [{ id: 'late-sensitive-note', content: 'Old content', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z' }], pageInfo: { limit: 10, total: 1, hasMore: false, nextCursor: null } });
    await loading;
  });
  expect(result.current.record?.notes).toEqual([]);
  expect(result.current.loadingMoreNotes).toBe(false);
});


it('does not restore a late clinical record after the unlock token is cleared', async () => {
  let finish: ((record: clinicalService.ClinicalRecord) => void) | undefined;
  jest.mocked(clinicalService.getClinicalRecord).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ token }: { token: string | null }) => useClinicalWorkspaceData({ clientId: 'client-a', token }), { initialProps: { token: 'unlocked' as string | null } });
  await waitFor(() => expect(result.current.recordLoading).toBe(true));
  rerender({ token: null });
  await act(async () => { finish?.(recordFor('client-a')); });
  expect(result.current.record).toBeNull();
  expect(result.current.recordLoading).toBe(false);
});
