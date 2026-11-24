import getEnvVars, { apiEndpoints } from '../api';
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.join(__dirname, '..', 'api.ts');

describe('API environment selection', () => {
  const source = fs.readFileSync(configPath, 'utf8');

  it('uses the native environment when React Native provides a window without a location', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
    try {
      expect(getEnvVars()).toBe(process.env.NODE_ENV === 'production' ? apiEndpoints.prod : apiEndpoints.dev);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('treats local network web hosts as development API hosts', () => {
    expect(source).toContain("hostname === 'localhost'");
    expect(source).toContain("hostname === '127.0.0.1'");
    expect(source).toContain("hostname.endsWith('.local')");
    expect(source).toContain('192\\.168');
    expect(source).toContain('172\\.(1[6-9]|2\\d|3[0-1])');
    expect(source).toContain('10\\.');
  });
});
