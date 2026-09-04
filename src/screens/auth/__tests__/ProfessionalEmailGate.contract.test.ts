import fs from 'node:fs';
import path from 'node:path';

const readSource = (...segments: string[]): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', '..', ...segments), 'utf8');

describe('professional email-first verification contract', () => {
  it('routes unverified professionals to email before document verification', () => {
    const source = readSource('navigation', 'RootNavigator.tsx');
    const emailGateIndex = source.indexOf("isProfessional && user.emailVerified !== true");
    const documentGateIndex = source.indexOf('isProfessional && verificationSubmitted === false');

    expect(emailGateIndex).toBeGreaterThan(-1);
    expect(documentGateIndex).toBeGreaterThan(emailGateIndex);
    expect(source).toContain('initialRouteName="EmailSentVerification"');
  });

  it('does not send another verification email after uploading the carnet', () => {
    const source = readSource('screens', 'auth', 'ProfessionalVerificationScreen.tsx');

    expect(source).not.toContain('sendVerificationEmail');
    expect(source).toContain('markVerificationSubmitted()');
  });

  it('keeps email correction inside the authenticated account', () => {
    const source = readSource('screens', 'auth', 'EmailSentVerificationScreen.tsx');

    expect(source).toContain('updateUnverifiedProfessionalEmail');
    expect(source).toContain('Ya lo he verificado');
    expect(source).toContain('Cerrar sesión');
    expect(source).not.toContain("navigation.navigate('Register'");
  });
});
