import fs from 'node:fs';
import path from 'node:path';
import { isClinicAuthEntryEnabled } from '../../../config/clinicFeatures';

describe('clinic auth entry points', () => {
  const originalFlag = process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY;
      return;
    }

    process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY = originalFlag;
  });

  it('keeps clinic login and registration behind the shared frontend flag', () => {
    const welcomeSource = fs.readFileSync(path.join(__dirname, '..', 'WelcomeScreen.tsx'), 'utf8');
    const registerSource = fs.readFileSync(path.join(__dirname, '..', 'RegisterScreen.tsx'), 'utf8');
    const landingSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'landing', 'LandingPage.tsx'),
      'utf8'
    );

    expect(welcomeSource).toContain('isClinicAuthEntryEnabled');
    expect(welcomeSource).toContain("userType: 'CLINIC'");
    expect(registerSource).toContain('clinicCommercialName');
    expect(registerSource).toContain("setUserType('clinic')");
    expect(landingSource).toContain('handleJoinAsClinic');
  });

  it('keeps clinic auth hidden unless explicitly enabled', () => {
    delete process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY;
    expect(isClinicAuthEntryEnabled()).toBe(false);

    process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY = 'false';
    expect(isClinicAuthEntryEnabled()).toBe(false);

    process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY = 'true';
    expect(isClinicAuthEntryEnabled()).toBe(true);
  });
});
