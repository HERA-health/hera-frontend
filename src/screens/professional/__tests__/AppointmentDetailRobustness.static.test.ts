import fs from 'node:fs';
import path from 'node:path';

const frontendSrc = path.join(__dirname, '..', '..', '..');
const readSource = (...segments: string[]) => fs.readFileSync(path.join(frontendSrc, ...segments), 'utf8');

const callbackBlock = (source: string, callbackName: string) => {
  const start = source.indexOf(`const ${callbackName} = useCallback`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(']);', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

const expectCloseBeforeClientProfileNavigation = (source: string, callbackName: string) => {
  const block = callbackBlock(source, callbackName);
  const closeIndex = block.indexOf('closeSessionDetail();');
  const navigateIndex = block.indexOf("navigation.navigate('ClientProfile'");

  expect(closeIndex).toBeGreaterThanOrEqual(0);
  expect(navigateIndex).toBeGreaterThanOrEqual(0);
  expect(closeIndex).toBeLessThan(navigateIndex);
};

describe('appointment detail robustness contracts', () => {
  const clinicAgendaSource = readSource('screens', 'clinic', 'ClinicAgendaScreen.tsx');
  const clinicPatientsHookSource = readSource('screens', 'clinic', 'patients', 'useClinicPatientsController.ts');
  const clinicPatientDomainSource = readSource('screens', 'clinic', 'patients', 'clinicPatientDomain.ts');
  const professionalSessionsSource = readSource('screens', 'professional', 'ProfessionalSessionsScreen.tsx');
  const professionalAgendaMonthSource = readSource(
    'screens',
    'professional',
    'components',
    'agenda',
    'ProfessionalAgendaMonthView.tsx',
  );
  const professionalAgendaCardSource = readSource(
    'screens',
    'professional',
    'components',
    'agenda',
    'ProfessionalAgendaSessionCard.tsx',
  );
  const professionalHomeSource = readSource('screens', 'professional', 'ProfessionalHomeScreen.tsx');
  const professionalHomeCardsSource = readSource(
    'components',
    'professional',
    'home',
    'ProfessionalHomeCards.tsx',
  );
  const professionalClinicPatientSource = readSource(
    'screens',
    'professional',
    'ProfessionalClinicPatientDetailScreen.tsx'
  );
  const appointmentDetailSheetSource = readSource('components', 'sessions', 'AppointmentDetailSheet.tsx');
  const clinicalTabSource = readSource('components', 'professional', 'ClinicalTab.tsx');
  const clinicalWorkspaceDataSource = readSource('hooks', 'useClinicalWorkspaceData.ts');

  it('keeps clinic patient appointment ranges within the backend 180-day window', () => {
    expect(clinicPatientDomainSource).toContain('export const PATIENT_SESSION_RANGE_PAST_DAYS = 30');
    expect(clinicPatientDomainSource).toContain('export const PATIENT_SESSION_RANGE_FUTURE_DAYS = 150');
    expect(clinicPatientDomainSource).toContain('export const buildPatientSessionRangeIso');
    expect(clinicPatientDomainSource).not.toContain('setHours(0, 0, 0, 0)');
    expect(clinicPatientDomainSource).not.toContain('setHours(23, 59, 59, 999)');
    expect(clinicPatientsHookSource).toContain('const range = buildPatientSessionRangeIso()');
  });

  it('keeps appointment action buttons outside parent detail pressables', () => {
    const clinicSessionRowSource = clinicAgendaSource.slice(
      clinicAgendaSource.indexOf('function SessionRow'),
      clinicAgendaSource.indexOf('interface CreateSessionModalProps')
    );
    expect(clinicSessionRowSource).toContain('<View style={styles.row}>');
    expect(clinicSessionRowSource).toContain('style={styles.detailsButton}');
    expect(clinicSessionRowSource).not.toMatch(/<AnimatedPressable[\s\S]*style=\{styles\.row\}/);
    expect(professionalAgendaCardSource).toContain('<View>');
    expect(professionalAgendaCardSource).toContain('style={styles.detailPressable}');
    expect(professionalAgendaCardSource).toContain('{!compact ? actions : null}');
    expect(professionalHomeSource).toContain('<TodayAgenda');
    expect(professionalHomeCardsSource).toContain('onPress={() => onOpen(session.id)}');
  });

  it('keeps monthly calendar sessions and +N disclosure inside Agenda', () => {
    expect(professionalAgendaMonthSource).toContain('const daySessions = sessionsByDate.get');
    expect(professionalAgendaMonthSource).toContain('const hiddenCount = Math.max(0, daySessions.length - visibleLimit)');
    expect(professionalAgendaMonthSource).toContain('daySessions.slice(0, visibleLimit).map');
    expect(professionalAgendaMonthSource).toContain('>+{hiddenCount} más</Text>');
    expect(professionalAgendaMonthSource).toContain('<AgendaDayPopover');
  });

  it('loads clinic patient sessions with server-side professional filters', () => {
    expect(professionalClinicPatientSource).toContain('professionalService.getProfessionalSessions({');
    expect(professionalClinicPatientSource).toContain("origin: 'CLINIC'");
    expect(professionalClinicPatientSource).toContain('clinicId,');
    expect(professionalClinicPatientSource).toContain('clientId: detail.clientId');
    expect(professionalClinicPatientSource).not.toContain('professionalService.getProfessionalSessions(),');
  });

  it('guards clinic patient session detail against stale responses', () => {
    const openBlock = callbackBlock(professionalClinicPatientSource, 'openSessionDetail');
    const closeBlock = callbackBlock(professionalClinicPatientSource, 'closeSessionDetail');

    expect(professionalClinicPatientSource).toContain('const sessionDetailLoadSeqRef = useRef(0)');
    expect(openBlock).toContain('const requestSeq = sessionDetailLoadSeqRef.current + 1');
    expect(openBlock).toContain('sessionDetailLoadSeqRef.current = requestSeq');
    expect(openBlock).toContain('if (sessionDetailLoadSeqRef.current !== requestSeq) return');
    expect(openBlock).toContain('if (sessionDetailLoadSeqRef.current === requestSeq)');
    expect(closeBlock).toContain('sessionDetailLoadSeqRef.current += 1');
  });

  it('loads a focused clinical session folder directly before opening notes', () => {
    expect(clinicalWorkspaceDataSource).toContain('ensureSessionFolderLoaded');
    expect(clinicalWorkspaceDataSource).toContain('clinicalService.getClinicalSessionFolder');
    expect(clinicalTabSource).toContain('const ensureSessionFolderLoaded = workspaceData.ensureSessionFolderLoaded');
    expect(clinicalTabSource).toContain('const loadingFocusSessionRef = useRef<string | null>(null)');
    expect(clinicalTabSource).toContain('ensureSessionFolderLoaded(focusSessionId)');
    expect(clinicalTabSource).toContain('if (loaded) {');
    expect(clinicalTabSource).toContain('handledFocusSessionLoadRef.current = focusSessionId');
    expect(clinicalTabSource).toContain('loadingFocusSessionRef.current = null');
    expect(clinicalTabSource).toContain('No se pudo abrir la carpeta clinica de esta cita.');
  });

  it('closes the appointment detail sheet before navigating to patient files or notes', () => {
    [professionalSessionsSource, professionalClinicPatientSource].forEach((source) => {
      expectCloseBeforeClientProfileNavigation(source, 'openSelectedSessionPatient');
      expectCloseBeforeClientProfileNavigation(source, 'openSelectedSessionNotes');
    });
  });

  it('exposes a linked invoice only from completed professional appointment details', () => {
    expect(appointmentDetailSheetSource).toContain('onOpenInvoice?: () => void;');
    expect(appointmentDetailSheetSource).toContain("const canOpenInvoice = mode === 'professional'");
    expect(appointmentDetailSheetSource).toContain("professionalSession?.status === 'COMPLETED'");
    expect(appointmentDetailSheetSource).toContain('Boolean(professionalSession.invoice)');
    expect(appointmentDetailSheetSource).toContain('Ver factura');

    [professionalSessionsSource, professionalClinicPatientSource].forEach((source) => {
      expect(source).toContain("navigation.navigate('CreateInvoice', { invoiceId: invoice.id });");
      expect(source).toContain('await billingService.downloadInvoice(invoice.id, invoice.invoiceNumber);');
      expect(source).toContain(
        "onOpenInvoice={selectedSessionDetail?.status === 'COMPLETED' && selectedSessionDetail.invoice"
      );
    });
  });
});
