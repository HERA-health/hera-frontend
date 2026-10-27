import type { UploadAsset } from '../utils/multipartUpload';
import { uploadTreatmentPdf, type TreatmentConsent } from './treatmentConsentService';
import { createSecureRandomUuid } from '../utils/secureRandom';
import * as professionalService from './professionalService';

export interface CreateManagedPatientWithConsentInput {
  client: professionalService.CreateManagedClientInput;
  consentDocument?: UploadAsset | null;
  clinicalAccessToken?: string | null;
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
  let treatment: TreatmentConsent;

  try {
    treatment = await uploadTreatmentPdf(
      createdClient.id,
      uploadClinicalAccessToken,
      consentDocument,
      createSecureRandomUuid(),
    );
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
    treatmentConsentStatus: treatment.status === 'SIGNED' ? 'GRANTED' : treatment.status === 'WITHDRAWN' ? 'REVOKED' : 'PENDING',
  };
  const refreshedClient = await professionalService
    .getProfessionalClientDetail(createdClient.id)
    .catch(() => grantedFallbackClient);

  return {
    client: refreshedClient ?? grantedFallbackClient,
    consentCompleted: (refreshedClient ?? grantedFallbackClient).treatmentConsentStatus === 'GRANTED',
  };
};
