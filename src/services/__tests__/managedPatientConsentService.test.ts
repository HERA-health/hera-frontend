jest.mock('../treatmentConsentService', () => ({ uploadTreatmentPdf: jest.fn() }));
jest.mock('../professionalService', () => ({ createManagedClient: jest.fn(), getProfessionalClientDetail: jest.fn() }));
jest.mock('../../utils/secureRandom', () => ({ createSecureRandomUuid: () => 'operation-key' }));
import { createManagedPatientWithInitialConsent } from '../managedPatientConsentService';
import { uploadTreatmentPdf, type TreatmentConsent } from '../treatmentConsentService';
import * as professional from '../professionalService';
const client: professional.Client = { id: 'patient', userId: null, source: 'MANAGED', consentOnFile: false, user: { id: null, name: 'Synthetic Patient', email: '', userType: 'CLIENT' } };
const input = { firstName: 'Synthetic', lastName: 'Patient' };
const file = { uri: 'file:///synthetic.pdf', name: 'synthetic.pdf', mimeType: 'application/pdf' };
const signed: TreatmentConsent = { status: 'SIGNED', method: 'UPLOADED_PDF', eventId: 'event', recordedAt: '2026-10-27', signedAt: null, evidenceDocumentId: 'document', evidenceRequestId: null, activeRequest: null, capabilities: { canUpload: true, canPrepare: false, canSend: false, digitalUnavailableReason: null, legacyAuthorizationRequired: false } };
beforeEach(() => { jest.resetAllMocks(); jest.mocked(professional.createManagedClient).mockResolvedValue(client); });
test('creation without a PDF does not perform clinical writes', async () => {
  expect(await createManagedPatientWithInitialConsent({ client: input })).toEqual({ client, consentCompleted: false });
  expect(uploadTreatmentPdf).not.toHaveBeenCalled();
});
test('creation uploads one treatment PDF and never grants historical HERA authorization', async () => {
  jest.mocked(uploadTreatmentPdf).mockResolvedValue(signed);
  jest.mocked(professional.getProfessionalClientDetail).mockResolvedValue({ ...client, treatmentConsentStatus: 'GRANTED' });
  const result = await createManagedPatientWithInitialConsent({ client: input, consentDocument: file, clinicalAccessToken: 'unlock' });
  expect(uploadTreatmentPdf).toHaveBeenCalledWith('patient', 'unlock', file, 'operation-key');
  expect(result.consentCompleted).toBe(true);
  expect(result.client.consentOnFile).toBe(false);
  expect(result.client.treatmentConsentStatus).toBe('GRANTED');
});
test('detail refresh failure preserves confirmed treatment upload', async () => {
  jest.mocked(uploadTreatmentPdf).mockResolvedValue(signed);
  jest.mocked(professional.getProfessionalClientDetail).mockRejectedValue(new Error('Offline'));
  const result = await createManagedPatientWithInitialConsent({ client: input, consentDocument: file, clinicalAccessToken: 'unlock' });
  expect(result).toEqual({ client: { ...client, treatmentConsentStatus: 'GRANTED' }, consentCompleted: true });
});
test('uncertain upload preserves the created patient and reports that consent must be checked in the record', async () => {
  const error = new Error('Timeout');
  jest.mocked(uploadTreatmentPdf).mockRejectedValue(error);
  jest.mocked(professional.getProfessionalClientDetail).mockResolvedValue(client);
  const result = await createManagedPatientWithInitialConsent({ client: input, consentDocument: file, clinicalAccessToken: 'unlock' });
  expect(result).toEqual({ client, consentCompleted: false, consentError: error });
  expect(professional.createManagedClient).toHaveBeenCalledTimes(1);
});
test('PIN is required before creating a patient with a PDF', async () => {
  await expect(createManagedPatientWithInitialConsent({ client: input, consentDocument: file })).rejects.toThrow('Debes desbloquear');
  expect(professional.createManagedClient).not.toHaveBeenCalled();
});
test('a concurrent withdrawal returned by the server is not reported as signed', async () => {
  jest.mocked(uploadTreatmentPdf).mockResolvedValue({ ...signed, status: 'WITHDRAWN' });
  jest.mocked(professional.getProfessionalClientDetail).mockRejectedValue(new Error('Offline'));
  const result = await createManagedPatientWithInitialConsent({ client: input, consentDocument: file, clinicalAccessToken: 'unlock' });
  expect(result.consentCompleted).toBe(false);
  expect(result.client.treatmentConsentStatus).toBe('REVOKED');
});
