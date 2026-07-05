import fs from 'node:fs';
import path from 'node:path';

const configPath = path.join(__dirname, '..', 'api.ts');

describe('API environment selection', () => {
  const source = fs.readFileSync(configPath, 'utf8');

  it('treats local network web hosts as development API hosts', () => {
    expect(source).toContain("hostname === 'localhost'");
    expect(source).toContain("hostname === '127.0.0.1'");
    expect(source).toContain("hostname.endsWith('.local')");
    expect(source).toContain('192\\.168');
    expect(source).toContain('172\\.(1[6-9]|2\\d|3[0-1])');
    expect(source).toContain('10\\.');
  });
});
