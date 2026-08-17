import fs from 'node:fs';
import path from 'node:path';

describe('ClinicAgendaScreen source guards', () => {
  const clinicDir = path.join(__dirname, '..');
  const screenSource = fs.readFileSync(
    path.join(clinicDir, 'ClinicAgendaScreen.tsx'),
    'utf8',
  );
  const controllerSource = fs.readFileSync(
    path.join(clinicDir, 'useClinicAgendaController.ts'),
    'utf8',
  );
  const presentationSource = fs.readFileSync(
    path.join(clinicDir, '..', '..', 'components', 'sessions', 'sessionPresentation.ts'),
    'utf8',
  );
  const schedulerSource = fs.readFileSync(
    path.join(clinicDir, '..', '..', 'components', 'clinic', 'ClinicSessionSchedulerModal.tsx'),
    'utf8',
  );
  const schedulerDomainSource = fs.readFileSync(
    path.join(clinicDir, '..', '..', 'components', 'clinic', 'clinicSessionSchedulerDomain.ts'),
    'utf8',
  );
  const patientsWorkspaceSource = fs.readFileSync(
    path.join(clinicDir, 'patients', 'ClinicPatientsWorkspace.tsx'),
    'utf8',
  );
  const patientsControllerSource = fs.readFileSync(
    path.join(clinicDir, 'patients', 'useClinicPatientsController.ts'),
    'utf8',
  );
  const dashboardSource = fs.readFileSync(
    path.join(clinicDir, 'ClinicDashboardScreen.tsx'),
    'utf8',
  );
  const sessionServiceSource = fs.readFileSync(
    path.join(clinicDir, '..', '..', 'services', 'clinic', 'sessionService.ts'),
    'utf8',
  );
  const combinedSource = `${screenSource}\n${controllerSource}`;

  it('uses clinic domain services instead of raw api calls', () => {
    expect(screenSource).toContain("from './useClinicAgendaController'");
    expect(controllerSource).toContain("from '../../services/clinicService'");
    expect(controllerSource).toContain('clinicService.getClinicAgenda');
    expect(controllerSource).toContain('buildClinicAgendaFilters');
    expect(controllerSource).toContain('clinicService.createClinicSession');
    expect(controllerSource).toContain('clinicService.updateClinicSessionStatus');
    expect(combinedSource).not.toContain("from '../../services/api'");
    expect(combinedSource).not.toContain('api.');
  });

  it('shares clinic session creation and derives the specialist from the assignment', () => {
    expect(screenSource).toContain('<ClinicSessionSchedulerModal');
    expect(patientsWorkspaceSource).toContain('<ClinicSessionSchedulerModal');
    expect(schedulerSource).toContain('lockedPatientId');
    expect(schedulerDomainSource).toContain('activeAssignment.clinicSpecialistId');
    expect(schedulerDomainSource).toContain("z.enum(['IN_PERSON', 'PHONE_CALL'])");
    expect(schedulerDomainSource).not.toContain('VIDEO_CALL');
  });

  it('keeps editable filters separate from applied filters', () => {
    expect(controllerSource).toContain('editableFilters');
    expect(controllerSource).toContain('appliedFilters');
    expect(controllerSource).toContain('handleApplyFilters');
    expect(screenSource).toContain('onPress={handleApplyFilters}');
    expect(screenSource).not.toContain('clinicService.listClinicSessions');
  });

  it('uses paginated patient lookup and ignores stale async responses', () => {
    expect(controllerSource).toContain('CLINIC_REFERENCE_PAGE_LIMIT');
    expect(controllerSource).toContain('PATIENT_LOOKUP_DEBOUNCE_MS');
    expect(controllerSource).toContain('invalidateAgendaRequests');
    expect(controllerSource).toContain('resetAgendaState');
    expect(controllerSource).toContain('patientLookupPageInfo');
    expect(controllerSource).toContain('handleLoadMorePatientOptions');
    expect(controllerSource).toContain('mountedRef');
    expect(controllerSource).toContain('sessionsRequestSeq');
    expect(controllerSource).toContain('setTimeout');
    expect(controllerSource).toContain('clearTimeout');
    expect(controllerSource).not.toContain('limit: 200');
    expect(schedulerSource).toContain('Buscar paciente');
    expect(schedulerSource).toContain('Cargar más pacientes');
  });

  it('debounces patient searches instead of firing lookup from the input handler', () => {
    const handlerSource = controllerSource.slice(
      controllerSource.indexOf('const handlePatientLookupSearchChange'),
      controllerSource.indexOf('const handleLoadMorePatientOptions'),
    );

    expect(handlerSource).toContain('setPatientLookupSearch(search)');
    expect(handlerSource).not.toContain('loadPatientLookup');
  });

  it('builds local date ranges without UTC day slicing', () => {
    expect(controllerSource).toContain('toLocalDateInputValue');
    expect(controllerSource).toContain('toLocalStartOfDayIso');
    expect(controllerSource).toContain('toLocalEndOfDayIso');
    expect(schedulerDomainSource).toContain('parseMadridDateTime');
    expect(controllerSource).not.toContain('toISOString().slice(0, 10)');
    expect(screenSource).not.toContain('toISOString().slice(0, 10)');
  });

  it('does not open private clinical or billing modules from the clinic agenda', () => {
    expect(combinedSource).not.toContain('ClinicalRecord');
    expect(combinedSource).not.toContain('ClinicalNote');
    expect(combinedSource).not.toContain('meetingLink');
    expect(combinedSource).not.toContain('Invoice');
  });

  it('keeps private appointments visibly differentiated and strictly read-only', () => {
    expect(screenSource).toContain('originFilterOptions');
    expect(screenSource).toContain('AgendaOriginLegend');
    expect(screenSource).toContain('PrivateAgendaDetailModal');
    expect(screenSource).toContain("session.origin === 'CLINIC'");
    expect(screenSource).toContain('readOnly');
  });

  it('keeps agenda filters grouped by purpose instead of one crowded row', () => {
    expect(screenSource).toContain('styles.filterHeader');
    expect(screenSource).toContain('styles.primaryFilters');
    expect(screenSource).toContain('styles.patientFilter');
    expect(screenSource).toContain('highlightSelection={false}');
    expect(screenSource).toContain('Actualizar agenda');
  });

  it('loads additional agenda pages explicitly instead of rendering an unbounded response', () => {
    expect(controllerSource).toContain('agendaPageInfo');
    expect(controllerSource).toContain('handleLoadMoreSessions');
    expect(controllerSource).toContain('limit: 50');
    expect(screenSource).toContain('Cargar más citas');
  });

  it('invalidates session consumers only for the affected clinic and patient', () => {
    expect(sessionServiceSource).toContain('subscribeClinicSessionChanges');
    expect(sessionServiceSource).toContain('clinicPatientId: session.patient.id');
    expect(sessionServiceSource).toContain('clinicSpecialistId: session.specialist.id');
    expect(sessionServiceSource).not.toContain('clearRequestCache');
    expect(controllerSource).toContain('change.clinicId !== workspace.selectedClinicId');
    expect(controllerSource).toContain('refreshLoadedAgendaPages');
    expect(controllerSource).toContain('agendaPageInfo?.page ?? 1');
    expect(patientsControllerSource).toContain('change.clinicPatientId !== selectedPatientId');
    expect(patientsControllerSource).toContain('refreshLoadedPatientSessionPages');
    expect(patientsControllerSource).toContain('pages.at(-1)?.pageInfo');
    expect(dashboardSource).toContain('change.clinicId !== workspace.selectedClinicId');
  });

  it('renders canonical persisted session states without inventing frontend transitions', () => {
    expect(screenSource).toContain('CLINIC_SESSION_STATUS_LABELS[session.status]');
    expect(screenSource).toContain('CLINIC_SESSION_STATUS_THEME_KEYS[session.status]');
    expect(screenSource).not.toContain('const displayStatus');
    expect(screenSource).not.toMatch(/session\.status === 'CONFIRMED'[\s\S]{0,120}'COMPLETED'/);
    expect(presentationSource).toContain("PENDING: 'Pendiente'");
    expect(presentationSource).toContain("CONFIRMED: 'Confirmada'");
    expect(presentationSource).toContain("COMPLETED: 'Completada'");
    expect(presentationSource).toContain("CANCELLED: 'Cancelada'");
    expect(presentationSource).not.toContain('NO_SHOW');
  });

  it('uses the shared telephone session label', () => {
    expect(presentationSource).toContain("PHONE_CALL: 'Llamada'");
    expect(schedulerSource).toContain("value: 'PHONE_CALL'");
    expect(schedulerSource).toContain("label: 'Teléfono'");
  });

  it('confirms terminal clinic session changes from agenda and patient detail', () => {
    expect(presentationSource).toContain('requestClinicSessionStatusConfirmation');
    expect(screenSource).toContain('confirmSessionStatusUpdate(session, \'CANCELLED\')');
    expect(screenSource).toContain("confirmSessionStatusUpdate(selectedDetail, 'COMPLETED', true)");
    expect(patientsWorkspaceSource).toContain("confirmSelectedSessionStatus('CANCELLED')");
    expect(patientsWorkspaceSource).toContain("confirmSelectedSessionStatus('COMPLETED')");
  });
});
