import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../../constants/errors';
import {
  PATIENT_SESSION_RANGE_FUTURE_DAYS,
  PATIENT_SESSION_RANGE_PAST_DAYS,
  buildPatientSessionRangeIso,
  clinicPatientFormSchema,
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
