import fs from 'node:fs';
import path from 'node:path';

const panelPath = path.join(
  __dirname,
  '..',
  'ClinicalConsentPanel.tsx',
);

describe('ClinicalConsentPanel consent status presentation', () => {
  const source = fs.readFileSync(panelPath, 'utf8');

  it('uses visible status tokens and icons for consent states', () => {
    expect(source).toContain('theme.status.confirmed');
    expect(source).toContain('theme.status.pending');
    expect(source).toContain('theme.status.cancelled');
    expect(source).toContain('statusIconName');
    expect(source).toContain('shield-checkmark-outline');
    expect(source).toContain('time-outline');
    expect(source).toContain('close-circle-outline');
  });

  it('describes document consent without the old managed patient terminology', () => {
    expect(source).toContain('Vía con documento firmado');
    expect(source).toContain('pacientes sin cuenta HERA');
    expect(source).not.toContain('Paciente gestionado');
    expect(source).not.toContain('pacientes gestionados');
    expect(source).not.toContain('Vía para paciente gestionado');
  });
});
