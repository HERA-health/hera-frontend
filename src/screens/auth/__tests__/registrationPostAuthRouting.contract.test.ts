import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('registration post-auth routing', () => {
  it('lets the authenticated navigator choose the destination after email registration', () => {
    const source = readSource('../RegisterScreen.tsx');
    const handler = source.slice(
      source.indexOf('const handleRegister = async'),
      source.indexOf('const handleGoogleCredential')
    );

    expect(handler).toContain('await register(');
    expect(handler).not.toContain('navigation.navigate(');
  });

  it('lets the authenticated navigator choose the destination after Google registration', () => {
    const source = readSource('../RegisterScreen.tsx');
    const handlerStart = source.indexOf('const handleGoogleCredential');
    const handler = source.slice(
      handlerStart,
      source.indexOf('  return (', handlerStart)
    );

    expect(handler).toContain('await authenticateWithGoogle({');
    expect(handler).not.toContain('navigation.navigate(');
    expect(handler).not.toContain("'MainStack'");
  });

  it('defines the correct initial workspace for every authenticated user type', () => {
    const source = readSource('../../../navigation/RootNavigator.tsx');

    expect(source).toMatch(/key="client"\s+initialRouteName="Home"/);
    expect(source).toMatch(/key="professional"\s+initialRouteName="ProfessionalHome"/);
    expect(source).toMatch(/key="clinic"\s+initialRouteName="ClinicDashboard"/);
  });
});
