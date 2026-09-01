import {
  clinicBillingConfigSchema,
  isSpanishFiscalIdentifier,
  isValidIban,
  normalizeSeries,
  sanitizeMoneyInput,
  sanitizePercentageInput,
} from '../financialFormValidation';

const validConfig = {
  legalName: 'Clínica HERA, S.L.',
  taxId: 'B99286320',
  fiscalAddress: 'Calle Mayor 1',
  fiscalPostalCode: '28001',
  fiscalCity: 'Madrid',
  fiscalCountry: 'España',
  simplifiedInvoicePrefix: 'FS',
  simplifiedInvoiceNextNumber: '1',
  fullInvoicePrefix: 'FC',
  fullInvoiceNextNumber: '1',
  rectifyingInvoicePrefix: 'RC',
  rectifyingInvoiceNextNumber: '1',
  applyVat: false,
  vatRate: '0' as const,
  vatExemptReason: 'Actividad sanitaria exenta',
  bankIban: 'ES9121000418450200051332',
  paymentConditions: 'Transferencia a 30 días',
  sendInvoiceCopyTo: 'facturacion@clinica.test',
};

describe('financialFormValidation', () => {
  it('valida NIF, NIE y CIF con dígito de control', () => {
    expect(isSpanishFiscalIdentifier('12345678Z')).toBe(true);
    expect(isSpanishFiscalIdentifier('X2482300W')).toBe(true);
    expect(isSpanishFiscalIdentifier('B99286320')).toBe(true);
    expect(isSpanishFiscalIdentifier('12345678A')).toBe(false);
  });

  it('normaliza y valida IBAN mediante MOD-97', () => {
    expect(isValidIban('ES91 2100 0418 4502 0005 1332')).toBe(true);
    expect(isValidIban('ES00 2100 0418 4502 0005 1332')).toBe(false);
  });

  it('limita importes, porcentajes y series mientras se escribe', () => {
    expect(sanitizeMoneyInput('12a.345')).toBe('12,34');
    expect(sanitizeMoneyInput('--12,3', true)).toBe('-12,3');
    expect(sanitizePercentageInput('105.999')).toBe('105,99');
    expect(normalizeSeries(' fc ñ 2026 ', 10)).toBe('FC2026');
  });

  it('rechaza series duplicadas y exención sin motivo', () => {
    const duplicate = clinicBillingConfigSchema.safeParse({
      ...validConfig,
      rectifyingInvoicePrefix: 'FC',
      vatExemptReason: '',
    });
    expect(duplicate.success).toBe(false);
    if (!duplicate.success) {
      expect(duplicate.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['rectifyingInvoicePrefix', 'vatExemptReason']),
      );
    }
  });

  it('acepta una configuración fiscal coherente', () => {
    expect(clinicBillingConfigSchema.safeParse(validConfig).success).toBe(true);
  });
});
