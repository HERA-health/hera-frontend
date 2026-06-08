import fs from 'fs';
import path from 'path';

const bookingScreenPath = path.join(__dirname, '..', 'BookingScreen.tsx');
const bookingComponentsPath = path.join(__dirname, '..', 'components');

const readBookingComponent = (filename: string): string =>
  fs.readFileSync(path.join(bookingComponentsPath, filename), 'utf8');

describe('BookingScreen Madrid timezone contract', () => {
  it('builds booking instants from Europe/Madrid date and time, not device-local date parsing', () => {
    const source = fs.readFileSync(bookingScreenPath, 'utf8');

    expect(source).toContain("import { formatMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';");
    expect(source).toContain('parseMadridDateTime(selectedDate, selectedSlot.startTime)');
    expect(source).toContain('const dateTime = madridDateTime.iso;');
    expect(source).not.toContain('new Date(selectedDate)');
    expect(source).not.toContain('dateObj.setHours');
  });

  it('formats booking date keys in child components with Europe/Madrid helpers', () => {
    const timeSlotsSource = readBookingComponent('TimeSlotsColumn.tsx');
    const calendarSource = readBookingComponent('CompactCalendarColumn.tsx');
    const infoSource = readBookingComponent('ProfessionalInfoColumn.tsx');

    expect(timeSlotsSource).toContain("import { formatMadridDateKey } from '../../../utils/madridTime';");
    expect(calendarSource).toContain(
      "import { formatMadridDateKey, getMadridDateKey } from '../../../utils/madridTime';"
    );
    expect(infoSource).toContain("import { formatMadridDateKey } from '../../../utils/madridTime';");

    expect(timeSlotsSource).not.toContain('new Date(dateString)');
    expect(calendarSource).not.toContain('new Date(selectedDate)');
    expect(calendarSource).not.toContain("new Date().toISOString().split('T')[0]");
    expect(infoSource).not.toContain('new Date(dateString)');
  });
});
