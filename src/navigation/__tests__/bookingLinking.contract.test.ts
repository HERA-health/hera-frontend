import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', '..', relativePath), 'utf8');

describe('booking navigation contract', () => {
  it('defines a reloadable canonical URL for booking', () => {
    const appSource = readSource('App.tsx');

    expect(appSource).toContain("path: 'reservar/:specialistId'");
    expect(appSource).toContain('initialSlotStartTime: (initialSlotStartTime: string)');
  });

  it('keeps presentation and office data out of Booking route params', () => {
    const typesSource = readSource('src/constants/types.ts');
    const bookingStart = typesSource.indexOf('Booking: {');
    const bookingEnd = typesSource.indexOf('Questionnaire:', bookingStart);
    const bookingContract = typesSource.slice(bookingStart, bookingEnd);

    expect(bookingStart).toBeGreaterThanOrEqual(0);
    expect(bookingContract).toContain('specialistId: string');
    expect(bookingContract).not.toContain('specialistName');
    expect(bookingContract).not.toContain('pricePerSession');
    expect(bookingContract).not.toContain('officeStreet');
    expect(bookingContract).not.toContain('officeLatitude');
  });
});
