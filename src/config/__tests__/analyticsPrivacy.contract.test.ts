import fs from 'node:fs';
import path from 'node:path';

describe('analytics privacy contract', () => {
  it('requires an explicit production opt-in', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'analytics.ts'),
      'utf8',
    );

    expect(source).toContain("process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true'");
    expect(source).not.toContain('export const ANALYTICS_ENABLED = !__DEV__;');
  });

  it('does not identify analytics with the database user id', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'services', 'analyticsService.ts'),
      'utf8',
    );

    expect(source).not.toContain('client.identify(');
  });
});
