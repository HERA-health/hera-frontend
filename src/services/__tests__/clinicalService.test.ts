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

import { hasAcceptedCurrentDataProcessingAgreement } from '../clinicalService';

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
