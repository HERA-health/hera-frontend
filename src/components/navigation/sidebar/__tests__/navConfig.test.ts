import { getNavigationSections } from '../navConfig';

describe('professional navigation sections', () => {
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
  });
});
