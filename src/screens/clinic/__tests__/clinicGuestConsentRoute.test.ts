import fs from 'fs';
import path from 'path';
import {
  getClinicGuestConsentRequestId,
  parseClinicGuestConsentFragment,
} from '../clinicGuestConsentRoute';

describe('clinic guest-consent public entry', () => {
  it('keeps the new one-segment route separate from the legacy token route', () => {
    expect(getClinicGuestConsentRequestId('/clinic-consent/request_123')).toBe('request_123');
    expect(getClinicGuestConsentRequestId('/clinic-consent/request_123/token-secret')).toBeNull();
    expect(getClinicGuestConsentRequestId('/clinic-consent/short')).toBeNull();
  });

  it('accepts only the canonical 256-bit token representation in the fragment', () => {
    expect(parseClinicGuestConsentFragment(`#token=${'a'.repeat(64)}`)).toBe('a'.repeat(64));
    expect(parseClinicGuestConsentFragment(`#token=${'A'.repeat(64)}`)).toBeNull();
    expect(parseClinicGuestConsentFragment('#token=short')).toBeNull();
  });

  it('branches before authentication and analytics and uses no browser persistence', () => {
    const root = path.join(__dirname, '..', '..', '..', '..');
    const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
    const service = fs.readFileSync(
      path.join(root, 'src', 'services', 'clinicGuestConsentPublicService.ts'),
      'utf8'
    );
    const screen = fs.readFileSync(
      path.join(root, 'src', 'screens', 'clinic', 'ClinicGuestConsentPublicScreen.tsx'),
      'utf8'
    );
    const frame = fs.readFileSync(
      path.join(root, 'src', 'screens', 'clinic', 'ClinicGuestConsentDocumentFrame.tsx'),
      'utf8'
    );
    const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    expect(app.indexOf('if (guestConsentRequestId)')).toBeLessThan(app.indexOf('<ThemeProvider>'));
    expect(service).toContain("credentials: 'include'");
    expect(service).toContain("cache: 'no-store'");
    expect(service).not.toMatch(/AsyncStorage|localStorage|sessionStorage|Authorization/);
    expect(screen).toContain("window.history.replaceState(");
    expect(screen).toContain("label={busy ? 'Comprobando…' : 'Continuar de forma segura'}");
    expect(screen).toContain('Revisa la solicitud de tu clínica');
    expect(screen).toContain('El código está en camino a');
    expect(screen).toContain('Tu decisión se ha guardado correctamente');
    expect(screen.indexOf('const continueFlow')).toBeLessThan(screen.indexOf('bootstrapGuestConsent('));
    expect(screen).toContain("resolution.otpDeliveryStatus !== 'PROCESSING'");
    expect(screen).toContain('20_000');
    expect(frame).toContain("sandbox: 'allow-same-origin'");
    expect(frame).toContain("addEventListener('click', preventDocumentNavigation)");
    expect(frame).not.toMatch(/allow-scripts|allow-forms|allow-popups|allow-top-navigation/);
    const publicHeaders = vercel.headers.find(({ source }) => source === '/clinic-consent/(.*)');
    expect(publicHeaders?.headers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'Cache-Control', value: 'private, no-store, max-age=0' }),
      expect.objectContaining({ key: 'X-Frame-Options', value: 'DENY' }),
      expect.objectContaining({ key: 'Referrer-Policy', value: 'no-referrer' }),
    ]));
    const csp = publicHeaders?.headers.find(({ key }) => key === 'Content-Security-Policy')?.value;
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' https://api.health-hera.com");
    expect(csp).toContain("navigate-to 'self' blob:");
    expect(csp).not.toMatch(/posthog|googleapis|connect-src \*|script-src[^;]*https:/);
    const generalOpenerPolicy = vercel.headers.find(({ source }) => source.includes('(?!clinic-consent/).'));
    expect(generalOpenerPolicy).toBeDefined();
  });
});
