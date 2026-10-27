jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
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

const mockLocalFile = { uri: 'file:///cache/clinical.pdf', exists: true, create: jest.fn(), write: jest.fn(), delete: jest.fn() };
jest.mock('expo-file-system', () => ({ File: jest.fn(() => mockLocalFile), Paths: { cache: 'file:///cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock('../../utils/secureRandom', () => ({ createSecureRandomUuid: () => 'synthetic-uuid' }));

import { api } from '../api';
import {
  getClinicalSessionFolder,
  hasAcceptedCurrentDataProcessingAgreement,
  createClinicalNote,
  getClinicalTimeline,
  getClinicalExercises,
  openClinicalDocument,
} from '../clinicalService';
import { Platform } from 'react-native';
import * as sharing from 'expo-sharing';

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

describe('clinical workspace contracts and document access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });
  afterEach(() => Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true }));

  it('preserves consent error codes so a revoked record can be cleared immediately', async () => {
    mockedApi.post.mockRejectedValueOnce({ response: { data: { code: 'CLINICAL_CONSENT_REQUIRED', message: 'Autorización retirada' } } });
    await expect(createClinicalNote('patient', 'Texto', 'token')).rejects.toMatchObject({ code: 'CLINICAL_CONSENT_REQUIRED', message: 'Autorización retirada' });
  });

  it('rejects malformed clinical payloads without displaying their contents', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { items: [{ title: 'private fixture' }], pageInfo: {} } } });
    await expect(getClinicalExercises('patient', 'token')).rejects.toThrow('La respuesta del expediente no tiene el formato esperado');
    mockedApi.get.mockResolvedValueOnce({ data: { data: { items: [], pageInfo: {}, counters: {} } } });
    await expect(getClinicalTimeline('patient', 'token')).rejects.toThrow('La respuesta del expediente no tiene el formato esperado');
  });

  it('writes a native download to a temporary file, waits for sharing and removes the copy', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockedApi.get.mockResolvedValueOnce({ data: new Uint8Array([37, 80, 68, 70]).buffer, headers: { 'content-type': 'application/pdf' } });
    await openClinicalDocument('document', 'informe.pdf', 'application/pdf', 'token');
    expect(mockLocalFile.create).toHaveBeenCalledTimes(1);
    expect(mockLocalFile.write).toHaveBeenCalledWith(new Uint8Array([37, 80, 68, 70]));
    expect(sharing.shareAsync).toHaveBeenCalledWith(mockLocalFile.uri, { mimeType: 'application/pdf', dialogTitle: 'informe.pdf' });
    expect(mockLocalFile.delete).toHaveBeenCalledTimes(1);
  });

  it('removes the temporary copy if the native share operation fails', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockedApi.get.mockResolvedValueOnce({ data: new Uint8Array([1, 2]).buffer, headers: {} });
    jest.mocked(sharing.shareAsync).mockRejectedValueOnce(new Error('No se pudo abrir'));
    await expect(openClinicalDocument('document', 'informe.pdf', 'application/pdf', 'token')).rejects.toThrow('No se pudo abrir');
    expect(mockLocalFile.delete).toHaveBeenCalledTimes(1);
  });

  it('preserves the unlock error even when the download error has a binary body', async () => {
    mockedApi.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 423, data: new ArrayBuffer(0) } });
    await expect(openClinicalDocument('document', 'informe.pdf', 'application/pdf', 'token')).rejects.toMatchObject({ code: 'CLINICAL_UNLOCK_REQUIRED' });
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


describe('pending document cancellation', () => {
  test('locking before the response prevents opening the downloaded document', async () => {
    Platform.OS = 'ios';
    let resolve!: (value: unknown) => void;
    mockedApi.get.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const before = jest.mocked(sharing.shareAsync).mock.calls.length;
    const pending = openClinicalDocument('doc', 'file.pdf', 'application/pdf', 'cancel-token');
    require('../clinicalDownloads').cancelClinicalDownloads('cancel-token');
    resolve({ data: new ArrayBuffer(3), headers: { 'content-type': 'application/pdf' } });
    await pending;
    expect(sharing.shareAsync).toHaveBeenCalledTimes(before);
    expect(mockedApi.get.mock.calls.at(-1)?.[1]?.signal?.aborted).toBe(true);
  });
  test('locking while native availability is checked prevents creating a local file', async () => {
    Platform.OS = 'ios';
    let resolve!: (value: boolean) => void;
    mockedApi.get.mockResolvedValueOnce({ data: new ArrayBuffer(3), headers: { 'content-type': 'application/pdf' } });
    jest.mocked(sharing.isAvailableAsync).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const before = mockLocalFile.write.mock.calls.length;
    const pending = openClinicalDocument('doc', 'file.pdf', 'application/pdf', 'cancel-native');
    await Promise.resolve(); await Promise.resolve();
    require('../clinicalDownloads').cancelClinicalDownloads('cancel-native');
    resolve(true);
    await pending;
    expect(mockLocalFile.write).toHaveBeenCalledTimes(before);
  });
});
