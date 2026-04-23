jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
  },
}));

jest.mock('../../utils/multipartUpload', () => ({
  buildImageFormData: jest.fn(),
  buildMultipartFormData: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { api } from '../api';
import { getVerificationStatus } from '../professionalService';

const mockedApi = api as jest.Mocked<typeof api>;

describe('professionalService.getVerificationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes legacy verification timestamp fields from the backend response', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          verificationStatus: 'VERIFIED',
          colegiadoNumber: 'M-12345',
          verificationSubmittedAt: '2026-04-10T10:00:00.000Z',
          verificationResolvedAt: '2026-04-11T10:00:00.000Z',
        },
      },
    });

    await expect(getVerificationStatus()).resolves.toEqual({
      verificationStatus: 'VERIFIED',
      colegiadoNumber: 'M-12345',
      submittedAt: '2026-04-10T10:00:00.000Z',
      reviewedAt: '2026-04-11T10:00:00.000Z',
      rejectionReason: undefined,
    });
  });

  it('normalizes a pending specialist without submission timestamp as NOT_SUBMITTED', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          verificationStatus: 'PENDING',
          colegiadoNumber: null,
          verificationSubmittedAt: null,
          verificationResolvedAt: null,
        },
      },
    });

    await expect(getVerificationStatus()).resolves.toEqual({
      verificationStatus: 'NOT_SUBMITTED',
      colegiadoNumber: undefined,
      submittedAt: undefined,
      reviewedAt: undefined,
      rejectionReason: undefined,
    });
  });

  it('returns NOT_SUBMITTED when the verification endpoint responds with 404', async () => {
    mockedApi.get.mockRejectedValue({
      response: {
        status: 404,
      },
    });

    await expect(getVerificationStatus()).resolves.toEqual({
      verificationStatus: 'NOT_SUBMITTED',
    });
  });

  it('does not mask non-404 verification errors as NOT_SUBMITTED', async () => {
    const error = {
      response: {
        status: 500,
      },
    };

    mockedApi.get.mockRejectedValue(error);

    await expect(getVerificationStatus()).rejects.toBe(error);
  });
});
