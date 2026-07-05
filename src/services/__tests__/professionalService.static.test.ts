import fs from 'node:fs';
import path from 'node:path';

const servicePath = path.join(__dirname, '..', 'professionalService.ts');

describe('professionalService schedule update contract', () => {
  const source = fs.readFileSync(servicePath, 'utf8');

  it('calls the backend schedule endpoint through the professional update route', () => {
    expect(source).toContain('api.put(`/sessions/${sessionId}/schedule`, data)');
    expect(source).not.toContain('Reinicia o actualiza el backend');
  });
});
