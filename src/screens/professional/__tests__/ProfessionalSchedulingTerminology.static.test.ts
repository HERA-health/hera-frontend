import fs from 'node:fs';
import path from 'node:path';

const sessionsScreenPath = path.join(
  __dirname,
  '..',
  'ProfessionalSessionsScreen.tsx',
);
const schedulerModalPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'professional',
  'ManagedSessionSchedulerModal.tsx',
);

describe('professional scheduling patient terminology', () => {
  const source = [
    fs.readFileSync(sessionsScreenPath, 'utf8'),
    fs.readFileSync(schedulerModalPath, 'utf8'),
  ].join('\n');

  it('uses operational copy instead of managed patient terminology', () => {
    expect(source).toContain('paciente de tu consulta');
    expect(source).toContain('pacientes activos de tu consulta');
    expect(source).not.toContain('paciente gestionado');
    expect(source).not.toContain('pacientes gestionados');
    expect(source).not.toContain('Paciente gestionado');
    expect(source).not.toContain('Pacientes gestionados');
  });

  it('loads all active visible patients for professional scheduling', () => {
    expect(source).toContain("source: 'ALL'");
    expect(source).toContain("lifecycle: 'ACTIVE'");
    expect(source).not.toContain("source: 'MANAGED',");
  });

  it('keeps explicit buffer override actions inside the scheduler modal', () => {
    expect(source).toContain('Descanso entre sesiones');
    expect(source).toContain('Esta cita no respeta el descanso de');
    expect(source).toContain('Revisar hora');
    expect(source).toContain('Crear igualmente');
    expect(source).toContain('overrideBuffer: true');
    expect(source).toContain('isManagedSessionBufferConflictError');
    expect(source).not.toContain('invade el margen');
  });
});
