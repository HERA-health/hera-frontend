import { z } from 'zod';

export const PUBLIC_BOOKING_PRIVACY_VERSION = 'privacy-policy-v1';

export const publicBookingContactSchema = z.object({
  firstName: z.string().trim().min(2, 'Introduce tu nombre').max(80),
  lastName: z.string().trim().min(2, 'Introduce tus apellidos').max(120),
  email: z.string().trim().email('Introduce un email válido').max(254),
  phone: z.string().trim().max(30).optional(),
  privacyAccepted: z.literal(true, {
    error: 'Acepta la política de privacidad para solicitar la cita',
  }),
}).strict();

export type PublicBookingContactForm = z.infer<typeof publicBookingContactSchema>;

export type PublicBookingContactErrors = Partial<
  Record<keyof PublicBookingContactForm, string>
>;

export const mapPublicBookingContactErrors = (
  error: z.ZodError<PublicBookingContactForm>
): PublicBookingContactErrors => {
  const errors: PublicBookingContactErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      field === 'firstName'
      || field === 'lastName'
      || field === 'email'
      || field === 'phone'
      || field === 'privacyAccepted'
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
};
