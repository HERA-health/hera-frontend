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
