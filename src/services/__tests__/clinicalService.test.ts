jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../utils/multipartUpload', () => ({
  buildMultipartFormData: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { api } from '../api';
import {
  getClinicalSessionFolder,
  hasAcceptedCurrentDataProcessingAgreement,
  requestClinicalGuestConsent,
  cancelClinicalGuestConsent,
  resendClinicalGuestConsent,
} from '../clinicalService';

const mockedApi = api as jest.Mocked<typeof api>;

const baseStatus = {
  hasPin: false,
  pinLockedUntil: null,
  pinUpdatedAt: null,
  acceptedDataProcessingAgreementAt: null,
  dataProcessingAgreementVersion: null,
  session: {
    active: false,
    sessionId: null,
    createdAt: null,
    absoluteExpiresAt: null,
    idleExpiresAt: null,
  },
};

describe('hasAcceptedCurrentDataProcessingAgreement', () => {
  it('uses the backend acceptance requirement when it is present', () => {
    expect(
      hasAcceptedCurrentDataProcessingAgreement({
        ...baseStatus,
        acceptedDataProcessingAgreementAt: '2026-04-01T10:00:00.000Z',
        dataProcessingAgreementVersion: 'legacy-v0',
        requiresDataProcessingAgreementAcceptance: false,
      })
    ).toBe(true);

    expect(
      hasAcceptedCurrentDataProcessingAgreement({
        ...baseStatus,
        acceptedDataProcessingAgreementAt: '2026-04-01T10:00:00.000Z',
        dataProcessingAgreementVersion: 'legacy-v0',
        requiresDataProcessingAgreementAcceptance: true,
      })
    ).toBe(false);

    expect(
      hasAcceptedCurrentDataProcessingAgreement({
        ...baseStatus,
        requiresDataProcessingAgreementAcceptance: false,
      })
    ).toBe(false);
  });

  it('falls back to comparing versions when the current version is available', () => {
    expect(
      hasAcceptedCurrentDataProcessingAgreement({
        ...baseStatus,
        acceptedDataProcessingAgreementAt: '2026-04-01T10:00:00.000Z',
        dataProcessingAgreementVersion: 'v2',
        currentDataProcessingAgreementVersion: 'v2',
      })
    ).toBe(true);

    expect(
      hasAcceptedCurrentDataProcessingAgreement({
        ...baseStatus,
        acceptedDataProcessingAgreementAt: '2026-04-01T10:00:00.000Z',
        dataProcessingAgreementVersion: 'v1',
        currentDataProcessingAgreementVersion: 'v2',
      })
    ).toBe(false);
  });
});

describe('specialist guest consent administration', () => {
  beforeEach(() => jest.clearAllMocks());

  const result = {
    requestId: 'request_123',
    channel: 'GUEST_EMAIL',
    requestKind: 'GRANT',
    status: 'PENDING',
    linkDeliveryStatus: 'PROVIDER_ACCEPTED',
    expiresAt: '2026-08-31T10:00:00.000Z',
    createdAt: '2026-08-24T10:00:00.000Z',
    redeemedAt: null,
    rejectedAt: null,
    revokedAt: null,
    expiredAt: null,
    cancelledAt: null,
  } as const;

  it('sends the adult declaration, clinical token and idempotency key', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: result } });
    await expect(requestClinicalGuestConsent('client-1', 'clinical-token', 'operation-1'))
      .resolves.toEqual(result);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/clinical/records/client-1/consent/guest-requests',
      { channel: 'GUEST_EMAIL', confirmsAdultAndSelfActing: true },
      expect.objectContaining({
        headers: {
          'x-clinical-access-token': 'clinical-token',
          'Idempotency-Key': 'operation-1',
        },
      })
    );
  });

  it('keeps cancellation independent from the feature flag and idempotency header', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { ...result, status: 'CANCELLED', cancelledAt: '2026-08-24T10:05:00.000Z' } },
    });
    await cancelClinicalGuestConsent('client-1', 'request_123', 'clinical-token');
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/clinical/records/client-1/consent/guest-requests/request_123/cancel',
      {},
      { headers: { 'x-clinical-access-token': 'clinical-token' }, timeout: 30000 }
    );
  });

  it('resends with a fresh idempotency key but no repeated eligibility assertion', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: result } });
    await resendClinicalGuestConsent('client-1', 'request_123', 'clinical-token', 'operation-2');
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/clinical/records/client-1/consent/guest-requests/request_123/resend',
      {},
      expect.objectContaining({
        headers: {
          'x-clinical-access-token': 'clinical-token',
          'Idempotency-Key': 'operation-2',
        },
      })
    );
  });
});

describe('getClinicalSessionFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads a single session folder with the clinical access token', async () => {
    const folder = {
      session: {
        id: 'session-1',
        date: '2026-06-01T10:00:00.000Z',
        duration: 60,
        status: 'COMPLETED',
        type: 'VIDEO_CALL',
        invoice: null,
      },
      notes: [],
      documents: [],
    };

    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: folder,
      },
    });

    await expect(
      getClinicalSessionFolder('client-1', 'session-1', 'clinical-token')
    ).resolves.toBe(folder);
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/clinical/records/client-1/session-folders/session-1',
      {
        headers: {
          'x-clinical-access-token': 'clinical-token',
        },
      }
    );
  });
});
