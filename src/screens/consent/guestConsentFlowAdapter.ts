import * as clinicGuestService from '../../services/clinicGuestConsentPublicService';
import * as specialistGuestService from '../../services/clinicalGuestConsentPublicService';
import { GuestConsentHttpError } from '../../services/guestConsentHttpClient';
import { parseClinicalGuestConsentFragment } from '../clinical/clinicalGuestConsentRoute';
import { parseClinicGuestConsentFragment } from '../clinic/clinicGuestConsentRoute';

export type GuestConsentFlow = 'clinic' | 'specialist';
export type GuestConsentResolution =
  | clinicGuestService.GuestConsentResolution
  | specialistGuestService.ClinicalGuestConsentResolution;
export type GuestConsentDocumentBytes =
  | clinicGuestService.GuestConsentDocumentBytes
  | specialistGuestService.ClinicalGuestConsentDocumentBytes;
export type GuestConsentReadyResolution = Extract<GuestConsentResolution, { stage: 'READY' }>;

export interface GuestConsentFlowAdapter {
  parseFragment: (fragment: string) => string | null;
  generateNonce: () => string;
  bootstrap: (requestId: string, token: string, nonce: string) => Promise<GuestConsentResolution>;
  resolve: (requestId: string) => Promise<GuestConsentResolution>;
  requestOtp: (requestId: string) => Promise<GuestConsentResolution>;
  verifyOtp: (requestId: string, code: string) => Promise<GuestConsentResolution>;
  decide: (requestId: string, decision: 'ACCEPT' | 'REJECT') => Promise<GuestConsentResolution>;
  loadDocument: (
    requestId: string,
    resolution: GuestConsentReadyResolution
  ) => Promise<GuestConsentDocumentBytes>;
  intro: string;
  grantLabel: string;
}

const SPECIALIST_ADAPTER: GuestConsentFlowAdapter = {
  parseFragment: parseClinicalGuestConsentFragment,
  generateNonce: specialistGuestService.generateClinicalGuestClientNonce,
  bootstrap: specialistGuestService.bootstrapClinicalGuestConsent,
  resolve: specialistGuestService.resolveClinicalGuestConsent,
  requestOtp: specialistGuestService.requestClinicalGuestConsentOtp,
  verifyOtp: specialistGuestService.verifyClinicalGuestConsentOtp,
  decide: specialistGuestService.decideClinicalGuestConsent,
  loadDocument: (requestId, resolution) => {
    if (!('specialist' in resolution)) throw new GuestConsentHttpError('UNAVAILABLE');
    return specialistGuestService.loadClinicalGuestConsentDocument(requestId, resolution.document);
  },
  intro: 'Revisa la autorización de tu especialista',
  grantLabel: 'Autorización del expediente clínico',
};

const CLINIC_ADAPTER: GuestConsentFlowAdapter = {
  parseFragment: parseClinicGuestConsentFragment,
  generateNonce: clinicGuestService.generateGuestConsentClientNonce,
  bootstrap: clinicGuestService.bootstrapGuestConsent,
  resolve: clinicGuestService.resolveGuestConsent,
  requestOtp: clinicGuestService.requestGuestConsentOtp,
  verifyOtp: clinicGuestService.verifyGuestConsentOtp,
  decide: clinicGuestService.decideGuestConsent,
  loadDocument: (requestId, resolution) => {
    if ('specialist' in resolution) throw new GuestConsentHttpError('UNAVAILABLE');
    return clinicGuestService.loadGuestConsentDocument(requestId, resolution.document);
  },
  intro: 'Revisa la autorización de tu clínica',
  grantLabel: 'Autorización para la gestión en la clínica',
};

export const getGuestConsentFlowAdapter = (flow: GuestConsentFlow): GuestConsentFlowAdapter =>
  flow === 'specialist' ? SPECIALIST_ADAPTER : CLINIC_ADAPTER;
