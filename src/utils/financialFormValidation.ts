import { z } from 'zod';

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';

export const normalizeSingleLine = (value: string, maxLength: number): string =>
  value.replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ').replace(/\s{2,}/g, ' ').slice(0, maxLength);

export const normalizeSeries = (value: string, maxLength = 20): string =>
  value.toUpperCase().replace(/[^A-Z0-9._/-]/g, '').slice(0, maxLength);

export const normalizeTaxIdentifier = (value: string): string =>
  value.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40);

export const isSpanishFiscalIdentifier = (rawValue: string): boolean => {
  const value = normalizeTaxIdentifier(rawValue);
  if (/^\d{8}[A-Z]$/.test(value)) return NIF_LETTERS[Number(value.slice(0, 8)) % 23] === value[8];
  if (/^[XYZ]\d{7}[A-Z]$/.test(value)) {
    const numeric = `${{ X: '0', Y: '1', Z: '2' }[value[0] as 'X' | 'Y' | 'Z']}${value.slice(1, 8)}`;
    return NIF_LETTERS[Number(numeric) % 23] === value[8];
  }
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(value)) return false;
  const digits = value.slice(1, 8).split('').map(Number);
  const even = digits[1] + digits[3] + digits[5];
  const odd = [digits[0], digits[2], digits[4], digits[6]].reduce((sum, digit) => {
    const doubled = digit * 2;
    return sum + Math.floor(doubled / 10) + doubled % 10;
  }, 0);
  const controlDigit = (10 - ((even + odd) % 10)) % 10;
  const control = value[8];
  if ('ABEH'.includes(value[0])) return control === String(controlDigit);
  if ('KPQS'.includes(value[0])) return control === CIF_CONTROL_LETTERS[controlDigit];
  return control === String(controlDigit) || control === CIF_CONTROL_LETTERS[controlDigit];
};

export const normalizeIban = (value: string): string =>
  value.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 34);

export const formatIban = (value: string): string =>
  normalizeIban(value).replace(/(.{4})/g, '$1 ').trim();

export const isValidIban = (rawValue: string): boolean => {
  const value = normalizeIban(rawValue);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false;
  const rearranged = `${value.slice(4)}${value.slice(0, 4)}`;
  const numeric = [...rearranged].map((character) => (/\d/.test(character) ? character : String(character.charCodeAt(0) - 55))).join('');
  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
};

export const moneyInputPattern = /^\d{0,9}(?:[.,]\d{0,2})?$/;
export const signedMoneyInputPattern = /^-?\d{0,9}(?:[.,]\d{0,2})?$/;
export const percentageInputPattern = /^\d{0,3}(?:[.,]\d{0,2})?$/;

export const sanitizeMoneyInput = (value: string, signed = false): string => {
  const compact = value.replace(/\s/g, '').replace('.', ',');
  const negative = signed && compact.startsWith('-');
  const unsigned = compact.replace(/-/g, '').replace(/[^\d,]/g, '');
  const [rawInteger = '', ...decimalParts] = unsigned.split(',');
  const integer = rawInteger.slice(0, 9);
  const hadSeparator = unsigned.includes(',');
  const decimal = decimalParts.join('').slice(0, 2);
  return `${negative ? '-' : ''}${integer}${hadSeparator ? `,${decimal}` : ''}`;
};

export const sanitizePercentageInput = (value: string): string => {
  const compact = value.replace(/\s/g, '').replace('.', ',').replace(/[^\d,]/g, '');
  const [rawInteger = '', ...decimalParts] = compact.split(',');
  const integer = rawInteger.slice(0, 3);
  const hadSeparator = compact.includes(',');
  const decimal = decimalParts.join('').slice(0, 2);
  return `${integer}${hadSeparator ? `,${decimal}` : ''}`;
};

export const clinicBillingConfigSchema = z.object({
  legalName: z.string().trim().max(160, 'Máximo 160 caracteres.'),
  taxId: z.string().trim().max(40),
  fiscalAddress: z.string().trim().max(240, 'Máximo 240 caracteres.'),
  fiscalPostalCode: z.string().trim().refine((value) => !value || /^\d{5}$/.test(value), 'Introduce cinco cifras.'),
  fiscalCity: z.string().trim().max(120, 'Máximo 120 caracteres.'),
  fiscalCountry: z.string().trim().max(80),
  simplifiedInvoicePrefix: z.string().regex(/^[A-Z0-9._/-]{1,10}$/, 'Usa 1–10 letras, números, punto, guion, barra o guion bajo.'),
  simplifiedInvoiceNextNumber: z.coerce.number().int().min(1).max(2_147_483_647),
  fullInvoicePrefix: z.string().regex(/^[A-Z0-9._/-]{1,10}$/, 'Usa 1–10 caracteres válidos.'),
  fullInvoiceNextNumber: z.coerce.number().int().min(1).max(2_147_483_647),
  rectifyingInvoicePrefix: z.string().regex(/^[A-Z0-9._/-]{1,10}$/, 'Usa 1–10 caracteres válidos.'),
  rectifyingInvoiceNextNumber: z.coerce.number().int().min(1).max(2_147_483_647),
  applyVat: z.boolean(),
  vatRate: z.enum(['0', '10', '21']),
  vatExemptReason: z.string().trim().max(240, 'Máximo 240 caracteres.'),
  bankIban: z.string().trim().refine((value) => !value || isValidIban(value), 'Introduce un IBAN válido.'),
  paymentConditions: z.string().trim().max(500, 'Máximo 500 caracteres.'),
  sendInvoiceCopyTo: z.string().trim().email('Introduce un email válido.').or(z.literal('')),
}).superRefine((value, context) => {
  if ((!value.fiscalCountry || /^(ES|ESP|ESPAÑA|SPAIN)$/i.test(value.fiscalCountry.trim())) && value.taxId && !isSpanishFiscalIdentifier(value.taxId)) {
    context.addIssue({ code: 'custom', path: ['taxId'], message: 'Introduce un NIF, NIE o CIF válido.' });
  }
  if (new Set([value.simplifiedInvoicePrefix, value.fullInvoicePrefix, value.rectifyingInvoicePrefix]).size !== 3) {
    context.addIssue({ code: 'custom', path: ['rectifyingInvoicePrefix'], message: 'Las tres series deben ser distintas.' });
  }
  if (!value.applyVat && value.vatExemptReason.trim().length < 3) {
    context.addIssue({ code: 'custom', path: ['vatExemptReason'], message: 'Explica la exención o no sujeción.' });
  }
});

export type ClinicBillingConfigValidation = z.infer<typeof clinicBillingConfigSchema>;
