import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../../constants/errors';
import {
  PATIENT_SESSION_RANGE_FUTURE_DAYS,
  PATIENT_SESSION_RANGE_PAST_DAYS,
  buildPatientSessionRangeIso,
  clinicPatientFormSchema,
  copyAdministrativeNameToBilling,
  getAdministrativeBillingFullName,
  mapFormToPayload,
  mapBillingFormToPayload,
  mapSummaryFormToPayload,
  restoreClinicPatientBillingFullName,
  updateClinicPatientFormField,
} from '../clinicPatientDomain';

const baseForm = {
  firstName: 'Lucia',
  lastName: 'Martin',
  email: '',
  phone: '',
  billingFullName: '',
  billingTaxId: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: 'España',
};

describe('clinicPatientFormSchema contact validation', () => {
  it('requires email or phone to create a reachable patient record', () => {
    const parsed = clinicPatientFormSchema.safeParse(baseForm);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: CONTACT_METHOD_REQUIRED_MESSAGE,
          }),
        ])
      );
    }
  });

  it('accepts either email or phone as the contact method', () => {
    expect(clinicPatientFormSchema.safeParse({
      ...baseForm,
      email: 'lucia@example.com',
    }).success).toBe(true);
    expect(clinicPatientFormSchema.safeParse({
      ...baseForm,
      phone: '+34 600 000 000',
    }).success).toBe(true);
  });
});

describe('clinic patient billing copy', () => {
  it('normalizes name parts into the billing full name', () => {
    expect(getAdministrativeBillingFullName('  Lucía  ', '  Martín García '))
      .toBe('Lucía Martín García');
    expect(getAdministrativeBillingFullName('', 'Martín')).toBe('Martín');
  });

  it('keeps billing name synchronized only while the copy option is active', () => {
    const customizedForm = {
      ...baseForm,
      firstName: 'Lucía',
      lastName: 'Martín',
      billingFullName: 'Empresa Familiar SL',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
      billingPostalCode: '28002',
      billingCity: 'Madrid',
      billingCountry: 'España',
    };

    const synchronized = updateClinicPatientFormField(
      customizedForm,
      'lastName',
      'Martín García',
      true,
    );

    expect(synchronized).toMatchObject({
      firstName: 'Lucía',
      lastName: 'Martín García',
      billingFullName: 'Lucía Martín García',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
      billingPostalCode: '28002',
      billingCity: 'Madrid',
      billingCountry: 'España',
    });

    const independent = updateClinicPatientFormField(
      customizedForm,
      'lastName',
      'Martín García',
      false,
    );
    expect(independent.billingFullName).toBe('Empresa Familiar SL');
  });

  it('restores the previous fiscal name without changing other billing fields', () => {
    const customizedForm = {
      ...baseForm,
      firstName: 'Lucía',
      lastName: 'Martín',
      billingFullName: 'Empresa Familiar SL',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
    };
    const copied = copyAdministrativeNameToBilling(customizedForm);
    const restored = restoreClinicPatientBillingFullName(
      copied,
      customizedForm.billingFullName,
    );

    expect(copied.billingFullName).toBe('Lucía Martín');
    expect(restored).toEqual(customizedForm);
  });

  it('keeps the UI-only choice out of the patient payload', () => {
    const payload = mapFormToPayload({
      ...baseForm,
      email: 'lucia@example.com',
      billingFullName: 'Lucía Martín',
    });

    expect(payload).toEqual({
      firstName: 'Lucia',
      lastName: 'Martin',
      email: 'lucia@example.com',
      phone: null,
      billingFullName: 'Lucía Martín',
      billingTaxId: null,
      billingAddress: null,
      billingPostalCode: null,
      billingCity: null,
      billingCountry: 'España',
    });
    expect(payload).not.toHaveProperty('sameBillingData');
  });
});

describe('clinic patient contextual payloads', () => {
  it('keeps identity updates separate from billing updates', () => {
    const form = {
      ...baseForm,
      firstName: ' Lucía ',
      lastName: ' Martín ',
      email: ' lucia@example.com ',
      billingFullName: ' Empresa Familiar SL ',
      billingTaxId: ' B12345678 ',
      billingAddress: ' Calle Sur 2 ',
    };

    expect(mapSummaryFormToPayload(form)).toEqual({
      firstName: 'Lucía',
      lastName: 'Martín',
      email: 'lucia@example.com',
      phone: null,
    });
    expect(mapSummaryFormToPayload(form)).not.toHaveProperty('billingFullName');

    expect(mapBillingFormToPayload(form)).toEqual({
      billingFullName: 'Empresa Familiar SL',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
      billingPostalCode: null,
      billingCity: null,
      billingCountry: 'España',
    });
    expect(mapBillingFormToPayload(form)).not.toHaveProperty('firstName');
  });
});

describe('buildPatientSessionRangeIso', () => {
  it('keeps the patient appointment window within 180 exact days and includes now', () => {
    const now = new Date('2026-07-06T10:30:00.000Z');
    const range = buildPatientSessionRangeIso(now);
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);
    const totalWindowMs = end.getTime() - start.getTime();

    expect(PATIENT_SESSION_RANGE_PAST_DAYS).toBe(30);
    expect(PATIENT_SESSION_RANGE_FUTURE_DAYS).toBe(150);
    expect(start.getTime()).toBe(now.getTime() - PATIENT_SESSION_RANGE_PAST_DAYS * 24 * 60 * 60 * 1000);
    expect(end.getTime()).toBe(now.getTime() + PATIENT_SESSION_RANGE_FUTURE_DAYS * 24 * 60 * 60 * 1000);
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(end.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(totalWindowMs).toBeLessThanOrEqual(180 * 24 * 60 * 60 * 1000);
  });
});
