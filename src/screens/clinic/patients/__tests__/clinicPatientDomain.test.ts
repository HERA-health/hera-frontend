import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../../constants/errors';
import { clinicPatientFormSchema } from '../clinicPatientDomain';

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
