import fs from 'node:fs';
import path from 'node:path';

describe('Clinic workspace scaffold titles', () => {
  const clinicDir = path.join(__dirname, '..');
  const scaffoldSource = fs.readFileSync(
    path.join(clinicDir, 'components', 'ClinicWorkspaceScaffold.tsx'),
    'utf8',
  );
  const screenFiles = [
    'ClinicDashboardScreen.tsx',
    'ClinicTeamScreen.tsx',
    'ClinicAgendaScreen.tsx',
    'ClinicBillingScreen.tsx',
    'ClinicInvoiceCreateScreen.tsx',
    'ClinicSettingsScreen.tsx',
    path.join('patients', 'ClinicPatientsWorkspace.tsx'),
  ];
  const screenSources = screenFiles.map((file) => fs.readFileSync(path.join(clinicDir, file), 'utf8'));
  const combinedScreenSources = screenSources.join('\n');

  it('uses screen titles as primary header text and clinic name only as context', () => {
    expect(scaffoldSource).toContain('contextLabel?: string');
    expect(scaffoldSource).toContain('HERA Clínicas / ${contextLabel}');
    expect(combinedScreenSources).not.toContain('title={clinicName}');
    expect(combinedScreenSources).toContain('title="Panel de clínica"');
    expect(combinedScreenSources).toContain('title="Equipo"');
    expect(combinedScreenSources).toContain('title="Pacientes"');
    expect(combinedScreenSources).toContain('title="Agenda"');
    expect(combinedScreenSources).toContain('title="Facturación"');
    expect(combinedScreenSources).toContain('title="Nueva factura"');
    expect(combinedScreenSources).toContain('title="Configuración"');
  });
});
