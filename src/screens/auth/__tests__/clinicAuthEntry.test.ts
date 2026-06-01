import fs from 'node:fs';
import path from 'node:path';

describe('clinic auth entry points', () => {
  const obsoleteHelperName = ['isClinicAuthEntry', 'Enabled'].join('');
  const obsoleteFlagName = ['EXPO_PUBLIC', 'ENABLE_CLINIC_AUTH_ENTRY'].join('_');

  it('keeps clinic login and registration available without a frontend env gate', () => {
    const welcomeSource = fs.readFileSync(path.join(__dirname, '..', 'WelcomeScreen.tsx'), 'utf8');
    const registerSource = fs.readFileSync(path.join(__dirname, '..', 'RegisterScreen.tsx'), 'utf8');
    const landingSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'landing', 'LandingPage.tsx'),
      'utf8'
    );

    expect(welcomeSource).not.toContain(obsoleteHelperName);
    expect(registerSource).not.toContain(obsoleteHelperName);
    expect(landingSource).not.toContain(obsoleteHelperName);
    expect(welcomeSource).toContain("userType: 'CLINIC'");
    expect(registerSource).toContain('clinicCommercialName');
    expect(registerSource).toContain("setUserType('clinic')");
    expect(landingSource).toContain('handleJoinAsClinic');
  });

  it('does not keep the obsolete frontend clinic auth flag around', () => {
    const featureFilePath = path.join(__dirname, '..', '..', '..', 'config', 'clinicFeatures.ts');
    const envExampleSource = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', '..', '.env.example'),
      'utf8'
    );

    expect(fs.existsSync(featureFilePath)).toBe(false);
    expect(envExampleSource).not.toContain(obsoleteFlagName);
  });
});
