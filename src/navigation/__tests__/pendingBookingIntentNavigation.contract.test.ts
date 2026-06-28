import fs from 'node:fs';
import path from 'node:path';

const readRootNavigatorSource = (): string =>
  fs.readFileSync(path.join(__dirname, '..', 'RootNavigator.tsx'), 'utf8');

describe('pending booking intent navigation contract', () => {
  it('consumes a client booking intent from Home and navigates to Booking only when one exists', () => {
    const source = readRootNavigatorSource();
    const clientHomeStart = source.indexOf('const ClientHomeRoute');
    const clientHomeEnd = source.indexOf('interface LegalStatusUnavailableScreenProps');
    const clientHomeBlock = source.slice(clientHomeStart, clientHomeEnd);

    expect(clientHomeStart).toBeGreaterThanOrEqual(0);
    expect(clientHomeEnd).toBeGreaterThan(clientHomeStart);
    expect(clientHomeBlock).toContain('consumePendingBookingIntent()');
    expect(clientHomeBlock).toContain('if (!active || !intent)');
    expect(clientHomeBlock).toContain(
      "props.navigation.navigate('Booking', mapPendingIntentToBookingParams(intent))"
    );
  });

  it('clears pending booking intent for authenticated non-client users before non-client stacks render', () => {
    const source = readRootNavigatorSource();
    const nonClientClearIndex = source.indexOf("user.type !== 'client'");
    const clearCallIndex = source.indexOf('clearPendingBookingIntent()', nonClientClearIndex);
    const clinicStackIndex = source.indexOf("if (user?.type === 'clinic')");
    const professionalStackIndex = source.indexOf("if (isProfessional)");
    const nonClientStacksBlock = source.slice(clinicStackIndex, source.indexOf('return (', professionalStackIndex + 1));

    expect(nonClientClearIndex).toBeGreaterThanOrEqual(0);
    expect(clearCallIndex).toBeGreaterThan(nonClientClearIndex);
    expect(clearCallIndex).toBeLessThan(clinicStackIndex);
    expect(clearCallIndex).toBeLessThan(professionalStackIndex);
    expect(nonClientStacksBlock).not.toContain("navigate('Booking'");
  });
});
