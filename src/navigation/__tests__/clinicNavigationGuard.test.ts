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
    expect(source).toContain('name="ClinicAdministrators"');
    expect(source).toContain('name="ClinicTeam"');
    expect(source).toContain('name="ClinicPatients"');
    expect(source).toContain('name="ClinicAgenda"');
    expect(source).toContain('name="ClinicBilling"');
  });

  it('keeps professional clinic routes behind the existing verification gate', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'RootNavigator.tsx'), 'utf8');
    const verificationGateIndex = source.indexOf('verificationSubmitted === false');
    const professionalStackIndex = source.indexOf('if (isProfessional)', verificationGateIndex + 1);
    const professionalClinicRouteIndex = source.indexOf('name="ClinicDashboard"', professionalStackIndex);
    const verificationStackBlock = source.slice(verificationGateIndex, professionalStackIndex);

    expect(verificationGateIndex).toBeGreaterThanOrEqual(0);
    expect(professionalStackIndex).toBeGreaterThan(verificationGateIndex);
    expect(professionalClinicRouteIndex).toBeGreaterThan(professionalStackIndex);
    expect(verificationStackBlock).not.toContain('name="ClinicDashboard"');
    expect(verificationStackBlock).not.toContain('name="ClinicAdministrators"');
  });

  it('loads clinic admin navigation state only when it can affect the sidebar', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'navigation', 'CustomDrawerContent.tsx'),
      'utf8',
    );

    expect(source).toContain('shouldLoadClinicAdminAccess');
    expect(source).toContain("user?.type === 'professional'");
    expect(source).toContain('verificationSubmitted !== false');
    expect(source).toContain('useClinicWorkspace({ enabled: shouldLoadClinicAdminAccess })');
  });

  it('keeps clinic operational modules active', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'navigation', 'sidebar', 'navConfig.ts'),
      'utf8',
    );
    const teamIndex = source.indexOf("id: 'clinic-team'");
    const administratorsIndex = source.indexOf("id: 'clinic-administrators'");
    const patientsIndex = source.indexOf("id: 'clinic-patients'");
    const agendaIndex = source.indexOf("id: 'clinic-agenda'");
    const billingIndex = source.indexOf("id: 'clinic-billing'");
    const settingsIndex = source.indexOf("id: 'clinic-settings'");
    const teamBlock = source.slice(teamIndex, administratorsIndex);
    const administratorsBlock = source.slice(administratorsIndex, patientsIndex);
    const patientsBlock = source.slice(patientsIndex, agendaIndex);
    const agendaBlock = source.slice(agendaIndex, billingIndex);
    const billingBlock = source.slice(billingIndex, settingsIndex);

    expect(teamIndex).toBeGreaterThanOrEqual(0);
    expect(administratorsIndex).toBeGreaterThan(teamIndex);
    expect(patientsIndex).toBeGreaterThan(administratorsIndex);
    expect(agendaIndex).toBeGreaterThan(patientsIndex);
    expect(billingIndex).toBeGreaterThan(agendaIndex);
    expect(settingsIndex).toBeGreaterThan(billingIndex);
    expect(teamBlock).toContain("route: 'ClinicTeam'");
    expect(teamBlock).not.toContain('disabled: true');
    expect(administratorsBlock).toContain("route: 'ClinicAdministrators'");
    expect(administratorsBlock).not.toContain('disabled: true');
    expect(patientsBlock).toContain("route: 'ClinicPatients'");
    expect(patientsBlock).not.toContain('disabled: true');
    expect(agendaBlock).toContain("route: 'ClinicAgenda'");
    expect(agendaBlock).not.toContain('disabled: true');
    expect(billingBlock).toContain("route: 'ClinicBilling'");
    expect(billingBlock).not.toContain('disabled: true');
    expect(billingBlock).not.toContain("badge: 'Próx.'");
  });
});
