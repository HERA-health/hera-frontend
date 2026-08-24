export type ClinicalGuestConsentEligibility =
  | 'ELIGIBLE'
  | 'FLAG_DISABLED'
  | 'HAS_HERA_ACCOUNT'
  | 'NO_EMAIL'
  | 'INVALID_EMAIL'
  | 'RECORD_CLOSED'
  | 'CLIENT_INACTIVE'
  | 'NOT_MANAGED_BY_SPECIALIST';

export const resolveClinicalGuestConsentEligibility = (record: {
  guestConsentEligibility?: ClinicalGuestConsentEligibility;
  guestConsentActionsEnabled: boolean;
  closedAt: string | null;
  client: { source: string; primaryEmail?: string | null };
}): ClinicalGuestConsentEligibility => {
  if (record.guestConsentEligibility) return record.guestConsentEligibility;
  if (record.closedAt) return 'RECORD_CLOSED';
  if (record.client.source === 'REGISTERED') return 'HAS_HERA_ACCOUNT';
  if (!record.client.primaryEmail?.trim()) return 'NO_EMAIL';
  return record.guestConsentActionsEnabled ? 'ELIGIBLE' : 'FLAG_DISABLED';
};
