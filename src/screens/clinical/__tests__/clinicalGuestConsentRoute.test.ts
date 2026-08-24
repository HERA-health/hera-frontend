import fs from 'fs';
import path from 'path';
import {
  getClinicalGuestConsentRequestId,
  parseClinicalGuestConsentFragment,
} from '../clinicalGuestConsentRoute';

describe('specialist guest clinical-consent entry', () => {
  it('recognizes only the isolated guest route and canonical fragment token', () => {
    expect(getClinicalGuestConsentRequestId('/clinical-consent/guest/request_123')).toBe('request_123');
    expect(getClinicalGuestConsentRequestId('/clinical-consent/request_123/token')).toBeNull();
    expect(getClinicalGuestConsentRequestId('/clinic-consent/request_123')).toBeNull();
    expect(parseClinicalGuestConsentFragment(`#token=${'a'.repeat(64)}`)).toBe('a'.repeat(64));
    expect(parseClinicalGuestConsentFragment(`#token=${'A'.repeat(64)}`)).toBeNull();
  });

  it('branches before auth and analytics and keeps the guest client free of persisted credentials', () => {
    const root = path.join(__dirname, '..', '..', '..', '..');
    const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
    const service = fs.readFileSync(path.join(root, 'src', 'services', 'clinicalGuestConsentPublicService.ts'), 'utf8');
    const transport = fs.readFileSync(path.join(root, 'src', 'services', 'guestConsentHttpClient.ts'), 'utf8');
    const panel = fs.readFileSync(path.join(root, 'src', 'components', 'professional', 'ClinicalConsentPanel.tsx'), 'utf8');
    const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    expect(app.indexOf('if (clinicalGuestConsentRequestId)')).toBeLessThan(app.lastIndexOf('<ThemeProvider>'));
    expect(transport).toContain("credentials: 'include'");
    expect(transport).toContain("cache: 'no-store'");
    expect(`${service}\n${transport}`).not.toMatch(/AsyncStorage|localStorage|sessionStorage|Authorization/);
    expect(panel).toContain('Enviar autorización por email');
    expect(panel).toContain('mayor de edad, actúa en su propio nombre');
    expect(panel).toContain('Enviar enlace nuevo por email');
    expect(panel).toContain('Cancelar solicitud');
    expect(panel).toContain('Enviar retirada por email');
    const headers = vercel.headers.find(({ source }) => source === '/clinical-consent/guest/(.*)');
    expect(headers?.headers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'Cache-Control', value: 'private, no-store, max-age=0' }),
      expect.objectContaining({ key: 'X-Frame-Options', value: 'DENY' }),
      expect.objectContaining({ key: 'Referrer-Policy', value: 'no-referrer' }),
    ]));
    const csp = headers?.headers.find(({ key }) => key === 'Content-Security-Policy')?.value;
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toMatch(/posthog|googleapis|connect-src \*|script-src[^;]*https:/);
  });
});
