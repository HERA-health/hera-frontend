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
  guestConsentActionsEnabled: true,
  guestConsentEligibility: 'ELIGIBLE',
  activeConsentRequest: null,
  client: {
    id: clientId,
    source: 'MANAGED',
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
} as unknown as clinicalService.ClinicalRecord);

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
