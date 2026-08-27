import fs from 'node:fs';
import path from 'node:path';

describe('ClinicServicesScreen production contract', () => {
  const clinicDir = path.join(__dirname, '..');
  const screenSource = fs.readFileSync(path.join(clinicDir, 'ClinicServicesScreen.tsx'), 'utf8');
  const editorSource = fs.readFileSync(
    path.join(clinicDir, 'services', 'ClinicServiceEditorPanel.tsx'),
    'utf8',
  );
  const serviceSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'services', 'clinic', 'catalogService.ts'),
    'utf8',
  );
  const navigatorSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'navigation', 'RootNavigator.tsx'),
    'utf8',
  );
  const navSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'components', 'navigation', 'sidebar', 'navConfig.ts'),
    'utf8',
  );

  it('uses clinic domain services and wires all non-destructive catalog operations', () => {
    expect(screenSource).toContain("from '../../services/clinicService'");
    expect(screenSource).not.toContain("from '../../services/api'");
    expect(screenSource).toContain('createClinicService');
    expect(screenSource).toContain('updateClinicService');
    expect(screenSource).toContain('updateClinicServiceStatus');
    expect(screenSource).toContain('setDefaultClinicService');
    expect(serviceSource).not.toContain('api.delete');
  });

  it('preserves conflict drafts and requires an explicit reload of the current version', () => {
    expect(screenSource).toContain("error.code === 'CLINIC_SERVICE_CONFLICT'");
    expect(screenSource).toContain('setStale(true)');
    expect(editorSource).toContain('Conservamos tu borrador');
    expect(editorSource).toContain('Cargar versión actual');
    expect(editorSource).toContain('disabled={stale}');
    expect(screenSource).toContain('latestEditorService');
    expect(screenSource).toContain('conflictRecoveryError');
  });

  it('pins editor identity and guards requests and mutations per clinic', () => {
    expect(screenSource).toContain('interface EditorContext');
    expect(screenSource).toContain('context.serviceId');
    expect(screenSource).toContain('context.version');
    expect(screenSource).toContain('useClinicServiceCatalogGuard');
    expect(screenSource).toContain('guard.beginMutation()');
    expect(screenSource).toContain('guard.isCurrentClinic');
  });

  it('uses in-flow choices and a scrollable mobile modal without z-index-dependent dropdowns', () => {
    expect(screenSource).toContain('<Modal');
    expect(screenSource).toContain('<ScrollView');
    expect(screenSource).toContain('clinic-service-archive-replacements-scroll');
    expect(screenSource).toContain('onRequestClose={handleCompactRequestClose}');
    expect(screenSource).toContain('accessibilityViewIsModal');
    expect(editorSource).toContain('accessibilityRole="checkbox"');
    expect(editorSource).not.toContain('SimpleDropdown');
    expect(screenSource).not.toContain('SimpleDropdown');
    expect(screenSource).not.toMatch(/zIndex|position:\s*['"]absolute/);
    expect(editorSource).not.toMatch(/zIndex|position:\s*['"]absolute/);
  });

  it('labels orphaned services and states honestly that scheduling is not connected yet', () => {
    expect(screenSource).toContain('Sin profesionales activos');
    expect(screenSource).toContain('Todavía no modifica automáticamente «Nueva cita»');
  });

  it('registers the screen in clinic and professional administrator navigation', () => {
    expect(navigatorSource.match(/name="ClinicServices"/g)).toHaveLength(2);
    expect(navSource.match(/route: 'ClinicServices'/g)).toHaveLength(2);
    expect(navSource).toContain("label: 'Servicios'");
  });
});
