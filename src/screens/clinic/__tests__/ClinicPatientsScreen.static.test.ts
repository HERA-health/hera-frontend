import fs from 'node:fs';
import path from 'node:path';

describe('ClinicPatientsScreen source guards', () => {
  const clinicDir = path.join(__dirname, '..');
  const patientsDir = path.join(clinicDir, 'patients');
  const screenSource = fs.readFileSync(
    path.join(clinicDir, 'ClinicPatientsScreen.tsx'),
    'utf8',
  );
  const workspaceSource = fs.readFileSync(
    path.join(patientsDir, 'ClinicPatientsWorkspace.tsx'),
    'utf8',
  );
  const hookSource = fs.readFileSync(
    path.join(patientsDir, 'useClinicPatientsController.ts'),
    'utf8',
  );
  const domainSource = fs.readFileSync(
    path.join(patientsDir, 'clinicPatientDomain.ts'),
    'utf8',
  );
  const patientScreenFiles = [
    'ClinicPatientsScreen.tsx',
    ...fs
      .readdirSync(patientsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join('patients', entry.name)),
  ];

  it('keeps the route wrapper thin and moves patient logic into clinic/patients modules', () => {
    expect(screenSource).toContain("from './patients/ClinicPatientsWorkspace'");
    expect(screenSource).not.toContain('useState');
    expect(screenSource).not.toContain('StyleSheet.create');
    expect(screenSource).not.toContain('clinicPatientFormSchema');
    expect(fs.existsSync(path.join(patientsDir, 'useClinicPatientsController.ts'))).toBe(true);
    expect(fs.existsSync(path.join(patientsDir, 'ClinicPatientsListPanel.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(patientsDir, 'ClinicPatientDetailPanel.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(patientsDir, 'ClinicPatientFormPanel.tsx'))).toBe(true);
  });

  it('uses typed feedback instead of inferring result state from message text', () => {
    const forbiddenTextHeuristic = ['message', 'includes'].join('.');

    expect(domainSource).toContain("type: 'success' | 'error';");
    expect(workspaceSource + hookSource + domainSource).not.toContain(forbiddenTextHeuristic);
  });

  it('keeps Spanish clinic patient copy and default country centralized', () => {
    const englishCountry = ['Sp', 'ain'].join('');
    const internalStepCopy = ['en esta', ['fa', 'se'].join('')].join(' ');
    const futureStepCopy = [['fa', 'ses'].join(''), ['pos', 'teriores'].join('')].join(' ');

    expect(domainSource).toContain('DEFAULT_CLINIC_BILLING_COUNTRY');
    expect(domainSource).toContain('España');
    expect(domainSource).not.toContain(englishCountry);
    expect(workspaceSource + domainSource).not.toContain(internalStepCopy);
    expect(workspaceSource + domainSource).not.toContain(futureStepCopy);
  });

  it('guards patient list requests against stale responses and uses paginated pages', () => {
    expect(hookSource).toContain('patientsRequestSeq');
    expect(hookSource).toContain('detailRequestSeq');
    expect(hookSource).toContain('specialistsRequestSeq');
    expect(hookSource).toContain('assignmentHistoryRequestSeq');
    expect(hookSource).toContain('pageResult.items');
    expect(hookSource).toContain('pageResult.pageInfo');
    expect(hookSource).toContain('mergeSummaryIntoDetail');
  });

  it('loads assignment history through clinicService and keeps clinical transfer out of the screen', () => {
    const detailSource = fs.readFileSync(
      path.join(patientsDir, 'ClinicPatientDetailPanel.tsx'),
      'utf8',
    );

    expect(hookSource).toContain('clinicService.listClinicPatientAssignmentHistory');
    expect(detailSource).toContain('Historial de responsables');
    expect(detailSource).toContain('no traslada notas ni documentos clínicos');
    expect(detailSource).toContain('formatDateTime');
    expect(detailSource).toContain('Motivo administrativo, sin datos clínicos');
    expect(hookSource).toContain("setAssignmentHistoryError('');");
    expect(workspaceSource + hookSource + detailSource).not.toContain('ClinicalRecord');
    expect(workspaceSource + hookSource + detailSource).not.toContain('clinicalRecord');
  });

  it('keeps patient screens inside clinicService instead of calling api directly', () => {
    patientScreenFiles.forEach((relativePath) => {
      const source = fs.readFileSync(path.join(clinicDir, relativePath), 'utf8');

      expect(source).not.toContain("from '../../../services/api'");
      expect(source).not.toContain("from '../../services/api'");
      expect(source).not.toContain('api.');
    });
  });
});
