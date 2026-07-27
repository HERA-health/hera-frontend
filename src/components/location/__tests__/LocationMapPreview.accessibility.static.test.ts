import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(__dirname, '..', 'LocationMapPreview.tsx');

describe('LocationMapPreview accessibility', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('identifies the interactive address and directions actions', () => {
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('Abrir ${address}, ${city} en Google Maps');
    expect(source).toContain('Cómo llegar a ${address}, ${city}');
  });
});
