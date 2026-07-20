import fs from 'node:fs';
import path from 'node:path';

describe('ClinicSettingsScreen billing ownership guards', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'ClinicSettingsScreen.tsx'),
    'utf8',
  );

  it('shows fiscal data as a summary with a billing config CTA', () => {
    expect(source).toContain('function FiscalSummarySection');
    expect(source).toContain('Gestionar en Facturación');
    expect(source).toContain("navigation.navigate('ClinicBilling', { initialSection: 'config' })");
    expect(source).not.toContain('const fiscalFields');
    expect(source).not.toContain('fields={fiscalFields}');
  });

  it('keeps clinic settings saves scoped to administrative and contact data', () => {
    const mapperStart = source.indexOf('const mapFormToPayload');
    const mapperEnd = source.indexOf('const hasText', mapperStart);
    const mapperSource = source.slice(mapperStart, mapperEnd);

    expect(mapperSource).toContain('commercialName');
    expect(mapperSource).toContain('email');
    expect(mapperSource).toContain('phone');
    expect(mapperSource).not.toContain('legalName');
    expect(mapperSource).not.toContain('taxId');
    expect(mapperSource).not.toContain('fiscalAddress');
    expect(mapperSource).not.toContain('fiscalPostalCode');
    expect(mapperSource).not.toContain('fiscalCity');
    expect(mapperSource).not.toContain('fiscalCountry');
  });
});
