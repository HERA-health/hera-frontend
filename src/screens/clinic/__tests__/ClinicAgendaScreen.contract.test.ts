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
  const combinedSource = `${screenSource}\n${controllerSource}`;

  it('uses clinic domain services instead of raw api calls', () => {
    expect(screenSource).toContain("from './useClinicAgendaController'");
    expect(controllerSource).toContain("from '../../services/clinicService'");
    expect(controllerSource).toContain('clinicService.listClinicSessions');
    expect(controllerSource).toContain('clinicService.createClinicSession');
    expect(controllerSource).toContain('clinicService.updateClinicSessionStatus');
    expect(combinedSource).not.toContain("from '../../services/api'");
    expect(combinedSource).not.toContain('api.');
  });

  it('keeps session creation administrative and validates the derived specialist', () => {
    const typeOptions = controllerSource.slice(
      controllerSource.indexOf('export const TYPE_OPTIONS'),
      controllerSource.indexOf('const DATE_INPUT_PATTERN'),
    );

    expect(controllerSource).toContain('createSessionFormSchema');
    expect(controllerSource).toContain('getPatientSpecialistId');
    expect(controllerSource).toContain('clinicSpecialistId,');
    expect(typeOptions).toContain("'IN_PERSON'");
    expect(typeOptions).toContain("'PHONE_CALL'");
    expect(typeOptions).not.toContain('VIDEO_CALL');
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
    expect(screenSource).toContain('Buscar paciente');
    expect(screenSource).toContain('Cargar mas pacientes');
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
    expect(controllerSource).toContain('toLocalDateTimeIso');
    expect(controllerSource).not.toContain('toISOString().slice(0, 10)');
    expect(screenSource).not.toContain('toISOString().slice(0, 10)');
  });

  it('does not open private clinical or billing modules from the clinic agenda', () => {
    expect(combinedSource).not.toContain('ClinicalRecord');
    expect(combinedSource).not.toContain('ClinicalNote');
    expect(combinedSource).not.toContain('meetingLink');
    expect(combinedSource).not.toContain('Invoice');
  });
});
