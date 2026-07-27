import fs from 'node:fs';
import path from 'node:path';

const timeSlotsColumnPath = path.join(__dirname, '..', 'TimeSlotsColumn.tsx');
const professionalInfoColumnPath = path.join(__dirname, '..', 'ProfessionalInfoColumn.tsx');
const bookingScreenPath = path.join(__dirname, '..', '..', 'BookingScreen.tsx');

describe('TimeSlotsColumn disabled slot UX', () => {
  const source = fs.readFileSync(timeSlotsColumnPath, 'utf8');

  it('renders unavailable backend slot options as disabled neutral choices', () => {
    expect(source).toContain('slot.available === false');
    expect(source).toContain('disabled={slotDisabled}');
    expect(source).toContain('Elige una hora');
    expect(source).toContain('No disponible');
    expect(source).toContain('slotButtonDisabled');
  });

  it('keeps incomplete slot rows aligned without stretching the final option', () => {
    expect(source).toContain("width: '31%'");
    expect(source).toContain('maxWidth: 150');
    expect(source).toContain('flexGrow: 0');
    expect(source).not.toContain('flexGrow: 1');
  });

  it('allows narrow layouts to shrink without horizontal clipping', () => {
    expect(source).toContain('minWidth: 0');
    expect(source).not.toContain('minWidth: 260');
    expect(source).not.toContain('minWidth: 96');
    expect(source).not.toContain('minWidth: 64');
  });

  it('uses one page scroll and no nested scroll views in booking columns', () => {
    const professionalSource = fs.readFileSync(professionalInfoColumnPath, 'utf8');
    const bookingSource = fs.readFileSync(bookingScreenPath, 'utf8');
    const pageScrollInstances = bookingSource.match(/<ScrollView\s/g) ?? [];

    expect(source).not.toContain('ScrollView');
    expect(professionalSource).not.toContain('ScrollView');
    // The main flow and success state each own a mutually exclusive page scroll.
    expect(pageScrollInstances).toHaveLength(2);
  });
});
