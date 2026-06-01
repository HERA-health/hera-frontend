import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(
  __dirname,
  '..',
  'ProfessionalClientsScreen.tsx',
);

describe('ProfessionalClientsScreen clinic context wiring', () => {
  const source = fs.readFileSync(screenPath, 'utf8');

  it('keeps API access inside services and uses paginated clinic patients', () => {
    expect(source).not.toMatch(/\bapi\.(get|post|patch|put|delete)\b/);
    expect(source).toContain('clinicService.listProfessionalClinicPatients');
    expect(source).toContain('setClinicPatientsPageInfo(page.pageInfo)');
    expect(source).toContain('clinicPatientsPageInfo.hasMore');
    expect(source).toContain('Cargar más pacientes');
  });

  it('resets clinic patient pagination when context or search changes', () => {
    expect(source).toContain('setClinicPatients([])');
    expect(source).toContain('setClinicPatientsPageInfo(EMPTY_PROFESSIONAL_CLINIC_PATIENT_PAGE_INFO)');
    expect(source).toContain('clinicPatientsRequestSeqRef.current += 1');
  });
});
