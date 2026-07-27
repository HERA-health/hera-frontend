import {
  PUBLIC_BOOKING_PRIVACY_VERSION,
  publicBookingContactSchema,
  toPublicBookingPatientPayload,
} from '../publicBookingValidation';
import { LEGAL_DOCUMENT_VERSION } from '../../../constants/legal';

const validContact = {
  firstName: 'Lucia',
  lastName: 'Gomez',
  email: 'lucia@example.com',
  privacyAccepted: true as const,
};

describe('public booking contact payload', () => {
  it('records the same privacy version that is presented in the legal document', () => {
    expect(PUBLIC_BOOKING_PRIVACY_VERSION).toBe(LEGAL_DOCUMENT_VERSION);
  });

  it('omits an empty optional phone number from the API payload', () => {
    const contact = publicBookingContactSchema.parse({
      ...validContact,
      phone: '   ',
    });

    expect(toPublicBookingPatientPayload(contact)).toEqual({
      firstName: 'Lucia',
      lastName: 'Gomez',
      email: 'lucia@example.com',
    });
  });

  it('keeps a provided phone number in the API payload', () => {
    const contact = publicBookingContactSchema.parse({
      ...validContact,
      phone: ' +34 600 000 000 ',
    });

    expect(toPublicBookingPatientPayload(contact)).toMatchObject({
      phone: '+34 600 000 000',
    });
  });
});
