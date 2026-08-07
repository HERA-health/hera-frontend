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

  it('does not expose schedule editing for sessions with linked invoices', () => {
    expect(utilsSource).toContain('hasInvoice: session.hasInvoice');
    expect(screenSource).toContain('const sessionStarted = session.date.getTime() <= currentTime.getTime()');
    expect(screenSource).toContain('const canModifySession = !sessionStarted && !session.hasInvoice');
    expect(screenSource).toContain('{canModifySession ? (');
  });

  it('starts in week on every viewport and keeps all views available on mobile', () => {
    expect(controllerSource).toContain("useState<SessionViewMode>('week')");
    expect(toolbarSource).toContain('VIEW_OPTIONS.map');
    expect(screenSource).not.toContain("setViewMode('list')");
    expect(screenSource).toContain('gridEnabled={width >= 900}');
  });

  it('provides accessible segmented and compact origin filters', () => {
    expect(controllerSource).toContain("useState<AgendaOriginFilter>('ALL')");
    expect(controllerSource).toContain("const origin = originFilter === 'ALL' ? undefined : originFilter");
    expect(toolbarSource).toContain('<SimpleDropdown');
    expect(toolbarSource).toContain('accessibilityLabel={`Mostrar citas: ${option.label}`}');
    expect(screenSource).toContain('<Text style={styles.sideCardTitle}>Origen</Text>');
  });

  it('keeps the 42-day month calendar and makes overflow actionable', () => {
    expect(utilsSource).toContain("{ value: 'month', label: 'Mes'");
    expect(screenSource).toContain("viewMode === 'month' ? renderMonthView() : null");
    expect(monthSource).toContain('const calendarDays = Array.from({ length: 42 }');
    expect(monthSource).toContain('onPress={(event) => openOverflow(event, day)}');
    expect(monthSource).toContain('<AgendaDayPopover');
    expect(monthSource).toContain('const hiddenCount = Math.max(0, daySessions.length - visibleLimit)');
  });

  it('keeps today visibly actionable and uses semantic calendar session surfaces', () => {
    expect(toolbarSource).toContain('name="today-outline"');
    expect(toolbarSource).toContain('borderColor: theme.primary');
    expect(screenSource).toContain('getAgendaStatusPalette(theme, status).text');
    expect(monthSource).toContain('backgroundColor: statusPalette.background');
    expect(monthSource).toContain('borderLeftColor: originColor');
    expect(weekSource).toContain('backgroundColor: statusPalette.background');
    expect(weekSource).toContain('borderLeftColor: originColor');
  });

  it('reloads range/origin queries without coupling them to preference loading', () => {
    const loadAgendaBlock = controllerSource.slice(
      controllerSource.indexOf('const loadAgenda = useCallback'),
      controllerSource.indexOf('const loadAgendaPreference = useCallback'),
    );
    expect(loadAgendaBlock).toContain('agendaCacheRef.current.get(agendaQueryKey)');
    expect(loadAgendaBlock).toContain('Date.now() - cachedEntry.loadedAt < AGENDA_CACHE_TTL_MS');
    expect(controllerSource).toContain('sessionsLoadSeqRef.current !== requestSeq');
    expect(controllerSource).toContain('void loadAgendaPreference();');
    expect(controllerSource).toContain('void loadAgenda();');
  });

  it('keeps the agenda mounted during background refreshes', () => {
    expect(controllerSource).toContain('initialLoading: boolean;');
    expect(controllerSource).toContain('refreshing: boolean;');
    expect(screenSource).toContain('if (initialLoading)');
    expect(screenSource).not.toMatch(/if \(refreshing\) \{\s*return/);
    expect(screenSource).toContain('Actualizando…');
    expect(screenSource).toContain('setTimeout(() => setShowRefreshIndicator(true), 150)');
    expect(screenSource).toContain('accessibilityState={{ busy: true }}');
  });

  it('paginates list queries by cursor and merges unique sessions', () => {
    expect(controllerSource).toContain("return { view: 'list', origin, limit: 50 }");
    expect(controllerSource).toContain('cursor: cachedEntry?.nextCursor ?? undefined');
    expect(controllerSource).toContain('new Map(');
    expect(listSource).toContain('Cargar más');
    expect(combinedSource).not.toContain('Pendientes de confirmación</Text>');
  });
});
