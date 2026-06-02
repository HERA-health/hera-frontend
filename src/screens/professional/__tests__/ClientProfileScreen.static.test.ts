import fs from 'node:fs';
import path from 'node:path';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../constants/errors';

const screenPath = path.join(
  __dirname,
  '..',
  'ClientProfileScreen.tsx',
);

describe('ClientProfileScreen managed patient editing', () => {
  const source = fs.readFileSync(screenPath, 'utf8');

  it('validates one contact method before updating managed patients', () => {
    expect(source).toContain('CONTACT_METHOD_REQUIRED_MESSAGE');
    expect(source).toContain("client.source === 'MANAGED'");
    expect(source).toContain('!billingForm.email.trim()');
    expect(source).toContain('!billingForm.phone.trim()');
    expect(CONTACT_METHOD_REQUIRED_MESSAGE).toBe(
      'Introduce un email o un número de móvil para poder contactar con el paciente.'
    );
  });

  it('keeps patient source internal instead of showing a permanent origin badge', () => {
    expect(source).toContain("client.source === 'MANAGED'");
    expect(source).not.toContain('Paciente gestionado');
    expect(source).not.toContain('Paciente HERA');
  });
});
