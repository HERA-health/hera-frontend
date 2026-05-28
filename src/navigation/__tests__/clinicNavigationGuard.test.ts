import fs from 'node:fs';
import path from 'node:path';

describe('clinic navigation guard', () => {
  it('routes clinic users to the clinic dashboard before professional routing', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'RootNavigator.tsx'), 'utf8');
    const clinicGuardIndex = source.indexOf("user?.type === 'clinic'");
    const professionalGuardIndex = source.indexOf("user?.type === 'professional'");

    expect(clinicGuardIndex).toBeGreaterThanOrEqual(0);
    expect(professionalGuardIndex).toBeGreaterThanOrEqual(0);
    expect(clinicGuardIndex).toBeLessThan(professionalGuardIndex);
    expect(source).toContain('name="ClinicDashboard"');
    expect(source).toContain('name="ClinicSettings"');
    expect(source).toContain('name="ClinicTeam"');
    expect(source).toContain('name="ClinicPatients"');
  });

  it('keeps team and patients as active clinic modules and future modules disabled', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'navigation', 'sidebar', 'navConfig.ts'),
      'utf8',
    );
    const teamIndex = source.indexOf("id: 'clinic-team'");
    const patientsIndex = source.indexOf("id: 'clinic-patients'");
    const settingsIndex = source.indexOf("id: 'clinic-settings'");
    const teamBlock = source.slice(teamIndex, patientsIndex);
    const patientsBlock = source.slice(patientsIndex, settingsIndex);
    const agendaBlock = source.slice(
      source.indexOf("id: 'clinic-agenda'"),
      source.indexOf("id: 'clinic-billing'")
    );

    expect(teamIndex).toBeGreaterThanOrEqual(0);
    expect(patientsIndex).toBeGreaterThan(teamIndex);
    expect(teamBlock).toContain("route: 'ClinicTeam'");
    expect(teamBlock).not.toContain('disabled: true');
    expect(patientsBlock).toContain("route: 'ClinicPatients'");
    expect(patientsBlock).not.toContain('disabled: true');
    expect(agendaBlock).toContain('disabled: true');
  });
});
