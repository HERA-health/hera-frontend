import type { ProfileCompletionSnapshot } from '../../../../services/profileCompletionService';
import { buildSidebarCompletionNotices } from '../completionNotices';

describe('buildSidebarCompletionNotices', () => {
  it('prioritizes critical insurance and keeps the remaining task count', () => {
    const snapshot: ProfileCompletionSnapshot = {
      role: 'PROFESSIONAL',
      scopeId: 'specialist-1',
      items: [
        { code: 'PROFILE_BIO', state: 'ACTION_REQUIRED', severity: 'WARNING' },
        { code: 'PROFESSIONAL_VERIFICATION', state: 'WAITING_REVIEW', severity: 'INFO' },
        { code: 'PROFESSIONAL_INSURANCE', state: 'ACTION_REQUIRED', severity: 'CRITICAL' },
        { code: 'PROFESSIONAL_BILLING', state: 'ACTION_REQUIRED', severity: 'WARNING' },
      ],
    };

    const notices = buildSidebarCompletionNotices(snapshot);

    expect(notices.profile).toMatchObject({
      code: 'PROFESSIONAL_INSURANCE',
      label: 'Falta seguro RC · +2',
      tone: 'critical',
      count: 3,
      target: {
        route: 'ProfessionalProfile',
        params: { initialTab: 'credentials', initialSection: 'insurance' },
      },
    });
    expect(notices.billing.target).toEqual({
      route: 'ProfessionalBilling',
      params: { initialSection: 'fiscal' },
    });
  });

  it('renders waiting review as informational when there is no action required', () => {
    const notices = buildSidebarCompletionNotices({
      role: 'PROFESSIONAL',
      scopeId: 'specialist-1',
      items: [
        { code: 'PROFESSIONAL_INSURANCE', state: 'WAITING_REVIEW', severity: 'INFO' },
      ],
    });

    expect(notices.profile).toMatchObject({
      label: 'Seguro en revisión',
      tone: 'info',
    });
  });

  it('uses the same description wording shown in the profile screen', () => {
    const notices = buildSidebarCompletionNotices({
      role: 'PROFESSIONAL',
      scopeId: 'specialist-1',
      items: [
        { code: 'PROFILE_BIO', state: 'ACTION_REQUIRED', severity: 'WARNING' },
      ],
    });

    expect(notices.profile.label).toBe('Completa tu descripción profesional');
  });

  it('maps clinic contact and billing to separate menu destinations', () => {
    const notices = buildSidebarCompletionNotices({
      role: 'CLINIC',
      scopeId: 'clinic-1',
      items: [
        { code: 'CLINIC_CONTACT', state: 'ACTION_REQUIRED', severity: 'WARNING' },
        { code: 'CLINIC_BILLING', state: 'ACTION_REQUIRED', severity: 'WARNING' },
      ],
    });

    expect(notices['clinic-settings'].target).toEqual({
      route: 'ClinicSettings',
      params: { initialSection: 'contact' },
    });
    expect(notices['clinic-billing'].target).toEqual({
      route: 'ClinicBilling',
      params: { initialSection: 'config' },
    });
  });

  it('returns no notices for a complete snapshot', () => {
    expect(buildSidebarCompletionNotices({
      role: 'PROFESSIONAL',
      scopeId: 'specialist-1',
      items: [],
    })).toEqual({});
  });
});
