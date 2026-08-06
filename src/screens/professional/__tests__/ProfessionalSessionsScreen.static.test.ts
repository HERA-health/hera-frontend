import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(
  __dirname,
  '..',
  'ProfessionalSessionsScreen.tsx',
);

describe('ProfessionalSessionsScreen schedule editing contract', () => {
  const source = fs.readFileSync(screenPath, 'utf8');

  it('loads private patient details only when opening the edit scheduler', () => {
    expect(source).toContain('function hydrateSchedulerClientFromSession');
    expect(source).toContain('function getFirstNonBlank');
    expect(source).toContain('professionalService.getProfessionalSessionDetail(session.id)');
    expect(source).toContain('detail.client?.primaryEmail');
    expect(source).toContain('clientEmail,');
    expect(source).toContain('email,');
    expect(source).toContain('primaryEmail: email');
    expect(source).toContain('getSchedulerClientEmail(client) ?? getSchedulerClientEmail(sessionClient)');
  });

  it('renders the patient avatar on professional session cards when available', () => {
    expect(source).toContain('clientAvatar: session.client.avatar ?? undefined');
    expect(source).toContain('professional-session-client-avatar-${session.id}');
    expect(source).toContain('style={styles.sessionAvatarImage}');
  });

  it('does not expose schedule editing for sessions with linked invoices', () => {
    expect(source).toContain('hasInvoice: session.hasInvoice');
    expect(source).toContain('const sessionStarted = session.date.getTime() <= currentTime.getTime()');
    expect(source).toContain('const canModifySession = !sessionStarted && !session.hasInvoice');
    expect(source).toContain('{canModifySession ? (');
  });

  it('provides one agenda with accessible origin filters and labels', () => {
    expect(source).toContain("const [originFilter, setOriginFilter] = useState<AgendaOriginFilter>('ALL')");
    expect(source).toContain('ORIGIN_FILTER_OPTIONS');
    expect(source).toContain("const origin = originFilter === 'ALL' ? undefined : originFilter");
    expect(source).toContain("const originLabel = isClinicSession ? 'Clínica' : 'Particular'");
    expect(source).toContain('<Text style={styles.sideCardTitle}>Origen</Text>');
    expect(source).toContain('accessibilityLabel={`Mostrar citas: ${option.label}`}');
  });

  it('keeps the monthly calendar inside Agenda on desktop and mobile', () => {
    expect(source).toContain("{ value: 'month', label: 'Mes'");
    expect(source).toContain("viewMode === 'month' ? renderMonthView() : null");
    expect(source).toContain('const calendarDays = Array.from({ length: 42 }');
    expect(source).toContain("<Text style={[styles.monthMore, { color: theme.link }]}>+{hiddenCount} más</Text>");
    expect(source).toContain('const daySessions = sessionsByDate.get(toCalendarDateKey(day)) ?? []');
    expect(source).toContain('void openSessionDetail(session.id)');
  });

  it('reloads sessions when the origin changes without reloading unrelated preferences', () => {
    const loadSessionsBlock = source.slice(
      source.indexOf('const loadSessions = useCallback'),
      source.indexOf('const loadSchedulableClients = useCallback'),
    );
    const preferenceBlock = source.slice(
      source.indexOf('const loadAgendaPreference = useCallback'),
      source.indexOf('const openManagedSessionScheduler = useCallback'),
    );

    expect(loadSessionsBlock).toContain('}, [agendaQuery, agendaQueryKey]);');
    expect(preferenceBlock).toContain('}, []);');
    expect(source).toContain('sessionsLoadSeqRef.current !== requestSeq');
    expect(source).toContain('void loadAgendaPreference();');
    expect(source).toContain('useCallback(() => {\n      void loadSessions();\n    }, [loadSessions])');
  });

  it('paginates the list by cursor and merges unique sessions', () => {
    expect(source).toContain("return { view: 'list', origin, limit: 50 }");
    expect(source).toContain('cursor: nextCursorRef.current ?? undefined');
    expect(source).toContain('new Map(');
    expect(source).toContain('Cargar más');
    expect(source).not.toContain('Pendientes de confirmación</Text>');
    expect(source).toContain("{viewMode !== 'list' ? (");
    expect(source).toContain("viewMode !== 'month' && viewMode !== 'list'");
    expect(source).not.toContain('const hasSessions = (date: Date)');
  });
});
