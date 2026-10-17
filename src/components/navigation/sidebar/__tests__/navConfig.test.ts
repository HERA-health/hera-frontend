import { getNavigationSections } from '../navConfig';

describe('professional navigation sections', () => {
  it.each(['CLIENT', 'PROFESSIONAL', 'CLINIC'] as const)('only shows platform administration to an admin (%s)', (role) => {
    expect(getNavigationSections(role).some((section) => section.id === 'admin')).toBe(false);
    expect(getNavigationSections(role, false, true, true).some((section) => section.id === 'admin')).toBe(false);
    expect(getNavigationSections(role, true).some((section) => section.id === 'admin')).toBe(true);
  });

  it('groups daily work, finances and the professional network without duplicate destinations', () => {
    const sections = getNavigationSections('PROFESSIONAL');
    expect(sections.find((section) => section.id === 'main-nav')?.items.map((item) => item.id))
      .toEqual(['home', 'clients', 'sessions', 'availability']);
    expect(sections.find((section) => section.id === 'management')?.items.map((item) => item.id))
      .toEqual(expect.arrayContaining(['tariffs', 'billing', 'dashboard', 'hera-commissions']));
    expect(sections.find((section) => section.id === 'professional-network')?.items.map((item) => item.id))
      .toEqual(['referrals', 'collaborations']);
    const routes = sections.flatMap((section) => section.items.map((item) => item.route));
    expect(new Set(routes).size).toBe(routes.length);
  });
  it('hides Mi clínica when the professional has no active care relationship', () => {
    const sections = getNavigationSections('PROFESSIONAL', false, false, false);
    expect(sections.some((section) => section.id === 'professional-clinic-workspace')).toBe(false);
  });

  it('places Mi clínica in a Clínica section before Soporte', () => {
    const sections = getNavigationSections('PROFESSIONAL', false, false, true);
    const clinicIndex = sections.findIndex((section) => section.id === 'professional-clinic-workspace');
    const supportIndex = sections.findIndex((section) => section.id === 'support');

    expect(clinicIndex).toBeGreaterThan(-1);
    expect(clinicIndex).toBeLessThan(supportIndex);
    expect(sections[clinicIndex]).toMatchObject({
      label: 'Clínica',
      items: [expect.objectContaining({ id: 'professional-clinic', label: 'Mi clínica' })],
    });
  });

  it('keeps every clinic section above Soporte for professionals with administrative access', () => {
    const sections = getNavigationSections('PROFESSIONAL', false, true, true);
    const supportIndex = sections.findIndex((section) => section.id === 'support');
    const clinicSectionIndexes = sections
      .map((section, index) => ({ id: section.id, index }))
      .filter(({ id }) => id === 'professional-clinic-workspace' || id === 'professional-clinic-admin')
      .map(({ index }) => index);

    expect(clinicSectionIndexes).toHaveLength(2);
    expect(clinicSectionIndexes.every((index) => index < supportIndex)).toBe(true);
    expect(sections.find((section) => section.id === 'professional-clinic-workspace')?.items).toHaveLength(1);
  });
});
