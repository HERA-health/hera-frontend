import { resolveClinicalGuestConsentEligibility } from '../clinicalGuestConsentEligibility';

const record = (overrides: Partial<Parameters<typeof resolveClinicalGuestConsentEligibility>[0]> = {}) => ({
  guestConsentActionsEnabled: false,
  guestConsentEligibility: undefined,
  closedAt: null,
  client: { source: 'MANAGED', primaryEmail: 'patient@example.com' },
  ...overrides,
});

describe('resolveClinicalGuestConsentEligibility', () => {
  it('uses the backend decision for a linked managed HERA account even when guest is disabled', () => {
    expect(resolveClinicalGuestConsentEligibility(record({
      guestConsentEligibility: 'HAS_HERA_ACCOUNT',
    }))).toBe('HAS_HERA_ACCOUNT');
  });

  it('keeps the rolling-backend fallback disabled for managed email clients', () => {
    expect(resolveClinicalGuestConsentEligibility(record())).toBe('FLAG_DISABLED');
  });

  it('keeps registered patients on the HERA flow without relying on the guest flag', () => {
    expect(resolveClinicalGuestConsentEligibility(record({
      client: { source: 'REGISTERED', primaryEmail: 'patient@example.com' },
    }))).toBe('HAS_HERA_ACCOUNT');
  });

  it('uses the backend decision for inactive and historical relationships', () => {
    expect(resolveClinicalGuestConsentEligibility(record({
      guestConsentEligibility: 'CLIENT_INACTIVE',
    }))).toBe('CLIENT_INACTIVE');
    expect(resolveClinicalGuestConsentEligibility(record({
      guestConsentEligibility: 'NOT_MANAGED_BY_SPECIALIST',
    }))).toBe('NOT_MANAGED_BY_SPECIALIST');
  });
});
