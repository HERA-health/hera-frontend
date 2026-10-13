import fs from 'node:fs';
import path from 'node:path';

const professionalDir = path.join(__dirname, '..');
const agendaDir = path.join(professionalDir, 'components', 'agenda');
const read = (...segments: string[]) => fs.readFileSync(path.join(...segments), 'utf8');

describe('ProfessionalSessionsScreen schedule editing contract', () => {
  const screenSource = read(professionalDir, 'ProfessionalSessionsScreen.tsx');
  const controllerSource = read(agendaDir, 'useProfessionalAgendaController.ts');
  const utilsSource = read(agendaDir, 'professionalAgendaUtils.ts');
  const toolbarSource = read(agendaDir, 'ProfessionalAgendaToolbar.tsx');
  const monthSource = read(agendaDir, 'ProfessionalAgendaMonthView.tsx');
  const weekSource = read(agendaDir, 'ProfessionalAgendaWeekView.tsx');
  const cardSource = read(agendaDir, 'ProfessionalAgendaSessionCard.tsx');
  const listSource = read(agendaDir, 'ProfessionalAgendaListView.tsx');
  const combinedSource = [screenSource, controllerSource, utilsSource, toolbarSource, monthSource, cardSource, listSource].join('\n');

  it('loads private patient details only when opening the edit scheduler', () => {
    expect(screenSource).toContain('function hydrateSchedulerClientFromSession');
    expect(screenSource).toContain('professionalService.getProfessionalSessionDetail(session.id)');
    expect(screenSource).toContain('detail.client?.primaryEmail');
    expect(screenSource).toContain('getSchedulerClientEmail(client) ?? getSchedulerClientEmail(sessionClient)');
  });

  it('renders patient avatars through the extracted session card', () => {
    expect(utilsSource).toContain('clientAvatar: session.client.avatar ?? undefined');
    expect(cardSource).toContain('professional-session-client-avatar-${session.id}');
    expect(cardSource).toContain('style={styles.avatarImage}');
  });

  it('requires the server schedule permission and a session that has not started', () => {
    expect(utilsSource).toContain('hasInvoice: session.hasInvoice');
    expect(screenSource).toContain('const sessionStarted = session.date.getTime() <= currentTime.getTime()');
    expect(screenSource).toContain('const canModifySession = !sessionStarted && (actions?.canModifySchedule ?? false)');
    expect(screenSource).toContain('{canModifySession ? (');
  });











  it('keeps the agenda mounted during background refreshes', () => {
    expect(screenSource).toContain('if (initialLoading)');
    expect(screenSource).not.toMatch(/if \(refreshing\) \{\s*return/);
    expect(screenSource).toContain('Actualizando…');
    expect(screenSource).toContain('setTimeout(() => setShowRefreshIndicator(true), 150)');
    expect(screenSource).toContain('accessibilityState={{ busy: true }}');
  });


});
