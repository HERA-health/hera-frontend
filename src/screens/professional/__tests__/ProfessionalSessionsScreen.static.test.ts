import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(
  __dirname,
  '..',
  'ProfessionalSessionsScreen.tsx',
);

describe('ProfessionalSessionsScreen schedule editing contract', () => {
  const source = fs.readFileSync(screenPath, 'utf8');

  it('keeps patient email from the session payload for the edit scheduler modal', () => {
    expect(source).toContain('function getSessionClientEmail');
    expect(source).toContain('function hydrateSchedulerClientFromSession');
    expect(source).toContain('function getFirstNonBlank');
    expect(source).toContain('getFirstNonBlank(client?.primaryEmail, client?.user?.email, client?.email)');
    expect(source).toContain('const clientEmail = getSessionClientEmail(session.client)');
    expect(source).toContain('clientEmail,');
    expect(source).toContain('email,');
    expect(source).toContain('primaryEmail: email');
    expect(source).toContain('getSchedulerClientEmail(client) ?? getSchedulerClientEmail(sessionClient)');
  });

  it('renders the patient avatar on professional session cards when available', () => {
    expect(source).toContain('clientAvatar: session.client?.user?.avatar || undefined');
    expect(source).toContain('professional-session-client-avatar-${session.id}');
    expect(source).toContain('style={styles.sessionAvatarImage}');
  });

  it('does not expose schedule editing for sessions with linked invoices', () => {
    expect(source).toContain('hasInvoice: Boolean(session.invoice)');
    expect(source).toContain('const sessionStarted = session.date.getTime() <= currentTime.getTime()');
    expect(source).toContain('const canModifySession = !sessionStarted && !session.hasInvoice');
    expect(source).toContain('{canModifySession ? (');
  });
});
