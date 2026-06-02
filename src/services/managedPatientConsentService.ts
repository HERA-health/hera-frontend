import type { UploadAsset } from '../utils/multipartUpload';
import * as clinicalService from './clinicalService';
import * as professionalService from './professionalService';

export interface CreateManagedPatientWithConsentInput {
  client: professionalService.CreateManagedClientInput;
  consentDocument?: UploadAsset | null;
  clinicalAccessToken?: string | null;
  consentVersion?: string;
}

export interface CreateManagedPatientWithConsentResult {
  client: professionalService.Client;
  consentCompleted: boolean;
  consentError?: unknown;
}

export const createManagedPatientWithInitialConsent = async ({
  client,
  consentDocument,
  clinicalAccessToken,
  consentVersion = 'v1',
}: CreateManagedPatientWithConsentInput): Promise<CreateManagedPatientWithConsentResult> => {
  const activeClinicalAccessToken = clinicalAccessToken ?? null;

  if (consentDocument && !activeClinicalAccessToken) {
    throw new Error('Debes desbloquear el área clínica antes de adjuntar el consentimiento firmado.');
  }

  const createdClient = await professionalService.createManagedClient(client);

  if (!consentDocument) {
    return {
      client: createdClient,
      consentCompleted: false,
    };
  }

  if (!activeClinicalAccessToken) {
    throw new Error('Debes desbloquear el área clínica antes de adjuntar el consentimiento firmado.');
  }

  const uploadClinicalAccessToken = activeClinicalAccessToken;

  let consentGivenAt: string | null = null;

  try {
    const document = await clinicalService.uploadClinicalDocument(
      createdClient.id,
      consentDocument,
      uploadClinicalAccessToken,
      'CONSENT_EVIDENCE'
    );
    const attestation = await clinicalService.attestClinicalConsent(
      createdClient.id,
      uploadClinicalAccessToken,
      consentVersion,
      document.id
    );

    consentGivenAt = attestation.consentGivenAt;
  } catch (consentError: unknown) {
    const refreshedClient = await professionalService
      .getProfessionalClientDetail(createdClient.id)
      .catch(() => createdClient);

    return {
      client: refreshedClient ?? createdClient,
      consentCompleted: false,
      consentError,
    };
  }

  const grantedFallbackClient: professionalService.Client = {
    ...createdClient,
    consentOnFile: true,
    consentDate: consentGivenAt,
    consentVersion,
  };
  const refreshedClient = await professionalService
    .getProfessionalClientDetail(createdClient.id)
    .catch(() => grantedFallbackClient);

  return {
    client: refreshedClient ?? grantedFallbackClient,
    consentCompleted: true,
  };
};
