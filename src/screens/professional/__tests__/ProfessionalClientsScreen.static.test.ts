import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(
  __dirname,
  '..',
  'ProfessionalClientsScreen.tsx',
);

describe('ProfessionalClientsScreen private patient boundary', () => {
  const source = fs.readFileSync(screenPath, 'utf8');

  it('keeps API access inside services and excludes clinic patient integrations', () => {
    expect(source).not.toMatch(/\bapi\.(get|post|patch|put|delete)\b/);
    expect(source).toContain('professionalService.getProfessionalClients({ provenance: sourceFilter, lifecycle: lifecycleFilter })');
    expect(source).not.toContain('listProfessionalClinicPatients');
    expect(source).not.toContain('ProfessionalClinicPatientDetail');
    expect(source).not.toContain('clinicPatientId');
    expect(source).not.toContain('Selecciona contexto');
  });

  it('uses explicit initial consent capture instead of a consent attestation switch', () => {
    expect(source).toContain('Adjuntar firmado ahora');
    expect(source).toContain('Añadir después');
    expect(source).toContain('createManagedPatientWithInitialConsent');
    expect(source).toContain('clinicalPin');
    expect(source).not.toContain('consentOnFile: true');
    expect(source).not.toContain('<Switch');
  });

  it('keeps patient origin as a compact filter with clear labels', () => {
    expect(source).toContain('professionalService.getProfessionalClients({ provenance: sourceFilter, lifecycle: lifecycleFilter })');
    expect(source).toContain('placeholder="Origen"');
    expect(source).toContain('placeholder="Estado"');
    expect(source).toContain('<SimpleDropdown');
    expect(source).toContain('options={FILTERS}');
    expect(source).toContain('options={LIFECYCLE_FILTERS}');
    expect(source).toContain('Directorio HERA');
    expect(source).toContain('Cartera propia');
    expect(source).toContain('Procedencia pendiente');
    expect(source).not.toContain('Autoregistrados');
    expect(source).not.toContain('Añadidos por mí');
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
