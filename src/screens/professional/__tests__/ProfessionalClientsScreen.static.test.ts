import fs from 'node:fs';
import path from 'node:path';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../constants/errors';

const screenPath = path.join(
  __dirname,
  '..',
  'ProfessionalClientsScreen.tsx',
);
const domainPath = path.join(
  __dirname,
  '..',
  'managedClientFormDomain.ts',
);

describe('ProfessionalClientsScreen clinic context wiring', () => {
  const source = fs.readFileSync(screenPath, 'utf8');
  const domainSource = fs.readFileSync(domainPath, 'utf8');

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

  it('uses explicit initial consent capture instead of a consent attestation switch', () => {
    expect(source).toContain('Adjuntar firmado ahora');
    expect(source).toContain('Añadir después');
    expect(source).toContain('createManagedPatientWithInitialConsent');
    expect(source).toContain('clinicalPin');
    expect(source).not.toContain('consentOnFile: true');
    expect(source).not.toContain('<Switch');
  });

  it('requires one contact method when creating a managed patient', () => {
    expect(source).toContain('contactErrorBlock');
    expect(source).toContain('contactMethodError');
    expect(domainSource).toContain('CONTACT_METHOD_REQUIRED_MESSAGE');
    expect(CONTACT_METHOD_REQUIRED_MESSAGE).toBe(
      'Introduce un email o un número de móvil para poder contactar con el paciente.'
    );
    expect(domainSource).toContain('!value.email && !value.phone');
  });

  it('keeps patient origin as a compact filter with clear labels', () => {
    expect(source).toContain('professionalService.getProfessionalClients(sourceFilter, lifecycleFilter)');
    expect(source).toContain('placeholder="Origen"');
    expect(source).toContain('placeholder="Estado"');
    expect(source).toContain('<SimpleDropdown');
    expect(source).toContain('options={FILTERS}');
    expect(source).toContain('options={LIFECYCLE_FILTERS}');
    expect(source).toContain('Autoregistrados');
    expect(source).toContain('Añadidos por mí');
    expect(source).not.toContain('SegmentedFilterGroup');
    expect(source).not.toContain("'Gestionado'");
    expect(source).not.toContain("'Gestionados'");
    expect(source).not.toContain("'Registrado'");
    expect(source).not.toContain("'Registrados'");
  });

  it('keeps dropdown menus above the patient grid', () => {
    expect(source).toContain('stylesForTheme.filtersTourTarget');
    expect(source).toContain('stylesForTheme.gridTourTarget');
    expect(source).toContain("overflow: 'visible'");
    expect(source).toMatch(/filtersTourTarget:[\s\S]*zIndex: 40/);
    expect(source).toMatch(/gridTourTarget:[\s\S]*zIndex: 1/);
    expect(source).toMatch(/filtersBar:[\s\S]*zIndex: 50/);
  });
});
