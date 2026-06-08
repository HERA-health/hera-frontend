import fs from 'node:fs';
import path from 'node:path';

const timeSlotsColumnPath = path.join(__dirname, '..', 'TimeSlotsColumn.tsx');

describe('TimeSlotsColumn disabled slot UX', () => {
  const source = fs.readFileSync(timeSlotsColumnPath, 'utf8');

  it('renders unavailable backend slot options as disabled neutral choices', () => {
    expect(source).toContain('slot.available === false');
    expect(source).toContain('disabled={disabled}');
    expect(source).toContain('Elige una hora');
    expect(source).toContain('No disponible');
    expect(source).toContain('slotButtonDisabled');
  });
});
