jest.mock('../clinicalService', () => ({
  uploadClinicalDocument: jest.fn(),
  attestClinicalConsent: jest.fn(),
}));

jest.mock('../professionalService', () => ({
  createManagedClient: jest.fn(),
  getProfessionalClientDetail: jest.fn(),
}));

import { createManagedPatientWithInitialConsent } from '../managedPatientConsentService';
import * as clinicalService from '../clinicalService';
import * as professionalService from '../professionalService';
import type { UploadAsset } from '../../utils/multipartUpload';

const mockedCreateManagedClient =
  professionalService.createManagedClient as jest.MockedFunction<typeof professionalService.createManagedClient>;
const mockedGetProfessionalClientDetail =
  professionalService.getProfessionalClientDetail as jest.MockedFunction<typeof professionalService.getProfessionalClientDetail>;
const mockedUploadClinicalDocument =
  clinicalService.uploadClinicalDocument as jest.MockedFunction<typeof clinicalService.uploadClinicalDocument>;
const mockedAttestClinicalConsent =
  clinicalService.attestClinicalConsent as jest.MockedFunction<typeof clinicalService.attestClinicalConsent>;

const clientInput: professionalService.CreateManagedClientInput = {
  firstName: 'Lucia',
  lastName: 'Gomez',
  consentVersion: 'v1',
};

const createdClient = {
  id: 'client-1',
  source: 'MANAGED',
  userId: null,
  consentOnFile: false,
  user: {
    id: null,
    email: '',
    name: 'Lucia Gomez',
    userType: 'CLIENT',
  },
} satisfies professionalService.Client;

const grantedClient = {
  ...createdClient,
  consentOnFile: true,
  consentDate: '2026-06-02T10:00:00.000Z',
};

const consentDocument: UploadAsset = {
  uri: 'file:///consentimiento.pdf',
  name: 'consentimiento.pdf',
  fileName: 'consentimiento.pdf',
  mimeType: 'application/pdf',
};

describe('createManagedPatientWithInitialConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the managed patient without clinical writes when no document is attached', async () => {
    mockedCreateManagedClient.mockResolvedValueOnce(createdClient);

    const result = await createManagedPatientWithInitialConsent({
      client: clientInput,
      consentDocument: null,
    });

    expect(result).toEqual({
      client: createdClient,
      consentCompleted: false,
    });
    expect(mockedCreateManagedClient).toHaveBeenCalledWith(clientInput);
    expect(mockedUploadClinicalDocument).not.toHaveBeenCalled();
    expect(mockedAttestClinicalConsent).not.toHaveBeenCalled();
  });

  it('uploads consent evidence and marks consent as granted when a document and token are provided', async () => {
    mockedCreateManagedClient.mockResolvedValueOnce(createdClient);
    mockedUploadClinicalDocument.mockResolvedValueOnce({
      id: 'document-1',
      category: 'CONSENT_EVIDENCE',
      fileName: 'consentimiento.pdf',
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-02T10:00:00.000Z',
      sizeBytes: 1200,
    });
    mockedAttestClinicalConsent.mockResolvedValueOnce({
      success: true,
      clinicalRecordId: 'clinical-record-1',
      consentStatus: 'GRANTED',
      consentGivenAt: '2026-06-02T10:00:00.000Z',
    });
    mockedGetProfessionalClientDetail.mockResolvedValueOnce(grantedClient);

    const result = await createManagedPatientWithInitialConsent({
      client: clientInput,
      consentDocument,
      clinicalAccessToken: 'clinical-token',
      consentVersion: 'v1',
    });

    expect(result).toEqual({
      client: grantedClient,
      consentCompleted: true,
    });
    expect(mockedUploadClinicalDocument).toHaveBeenCalledWith(
      'client-1',
      consentDocument,
      'clinical-token',
      'CONSENT_EVIDENCE'
    );
    expect(mockedAttestClinicalConsent).toHaveBeenCalledWith(
      'client-1',
      'clinical-token',
      'v1',
      'document-1'
    );
  });

  it('keeps consent completed when only the detail refresh fails after attestation', async () => {
    mockedCreateManagedClient.mockResolvedValueOnce(createdClient);
    mockedUploadClinicalDocument.mockResolvedValueOnce({
      id: 'document-1',
      category: 'CONSENT_EVIDENCE',
      fileName: 'consentimiento.pdf',
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-02T10:00:00.000Z',
      sizeBytes: 1200,
    });
    mockedAttestClinicalConsent.mockResolvedValueOnce({
      success: true,
      clinicalRecordId: 'clinical-record-1',
      consentStatus: 'GRANTED',
      consentGivenAt: '2026-06-02T10:00:00.000Z',
    });
    mockedGetProfessionalClientDetail.mockRejectedValueOnce(new Error('network refresh failed'));

    const result = await createManagedPatientWithInitialConsent({
      client: clientInput,
      consentDocument,
      clinicalAccessToken: 'clinical-token',
      consentVersion: 'v1',
    });

    expect(result).toEqual({
      client: {
        ...createdClient,
        consentOnFile: true,
        consentDate: '2026-06-02T10:00:00.000Z',
        consentVersion: 'v1',
      },
      consentCompleted: true,
    });
    expect(result).not.toHaveProperty('consentError');
  });

  it('returns a consent error only when upload or attestation fails', async () => {
    const consentFailure = new Error('attestation failed');
    mockedCreateManagedClient.mockResolvedValueOnce(createdClient);
    mockedUploadClinicalDocument.mockResolvedValueOnce({
      id: 'document-1',
      category: 'CONSENT_EVIDENCE',
      fileName: 'consentimiento.pdf',
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-02T10:00:00.000Z',
      sizeBytes: 1200,
    });
    mockedAttestClinicalConsent.mockRejectedValueOnce(consentFailure);
    mockedGetProfessionalClientDetail.mockResolvedValueOnce(createdClient);

    const result = await createManagedPatientWithInitialConsent({
      client: clientInput,
      consentDocument,
      clinicalAccessToken: 'clinical-token',
      consentVersion: 'v1',
    });

    expect(result).toEqual({
      client: createdClient,
      consentCompleted: false,
      consentError: consentFailure,
    });
  });

  it('requires clinical access before creating a patient with initial consent evidence', async () => {
    await expect(createManagedPatientWithInitialConsent({
      client: clientInput,
      consentDocument,
    })).rejects.toThrow('Debes desbloquear el área clínica');

    expect(mockedCreateManagedClient).not.toHaveBeenCalled();
  });
});
