import fs from 'node:fs';
import path from 'node:path';

const componentPath = path.join(__dirname, '..', 'GoogleAuthButton.tsx');

describe('GoogleAuthButton singleton wiring', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  it('guards Google Identity Services initialization by client id', () => {
    expect(source).toContain('let initializedGoogleClientId: string | null = null');
    expect(source).toContain('initializedGoogleClientId === clientId');
    expect(source).toContain('initializedGoogleClientId = clientId');
  });

  it('keeps credential handling fresh without reinitializing GIS on each render', () => {
    expect(source).toContain('let activeCredentialHandler: ((idToken: string) => void) | null = null');
    expect(source).toContain('activeCredentialHandler?.(response.credential)');
    expect(source).toContain('initializeGoogleIdentity(GOOGLE_CLIENT_ID)');
  });

  it('resets the shared script promise after load failures so future mounts can retry', () => {
    expect(source).toContain('const GOOGLE_SCRIPT_LOAD_TIMEOUT_MS = 10000');
    expect(source).toContain('googleIdentityScriptPromise = null');
    expect(source).toContain("'Google Auth load timed out'");
  });

  it('offers a local retry path when GIS loading fails', () => {
    expect(source).toContain('const [loadAttempt, setLoadAttempt] = useState(0)');
    expect(source).toContain('setLoadAttempt((attempt) => attempt + 1)');
    expect(source).toContain('loadAttempt, onCredential');
    expect(source).toContain('Reintentar Google');
  });
});
