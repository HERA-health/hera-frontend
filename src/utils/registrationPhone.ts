export type RegistrationPhoneErrorCode = 'PHONE_REQUIRED' | 'INVALID_PHONE';

export const PHONE_FORMAT_HELP = 'España: con o sin +34. Otros países: incluye el prefijo internacional.';
export const PHONE_CONTACT_HELP = 'Para contactar contigo sobre tu cuenta y coordinar tus publicaciones en redes con HERA.';

export class RegistrationPhoneError extends Error {
  constructor(readonly code: RegistrationPhoneErrorCode) {
    super(code === 'PHONE_REQUIRED'
      ? 'Introduce un teléfono de contacto para crear tu cuenta de especialista.'
      : 'Introduce un teléfono válido, por ejemplo +34 600 123 456.');
  }
}

/** Format validation only; keep these rules aligned with backend registrationPhone. */
export const normalizeRegistrationPhone = (value: string | undefined): string => {
  if (!value?.trim()) throw new RegistrationPhoneError('PHONE_REQUIRED');
  if (value.length > 40) throw new RegistrationPhoneError('INVALID_PHONE');

  const compact = value.trim().replace(/[\s().-]/g, '');
  const normalized = /^\d{9}$/.test(compact) ? `+34${compact}` : compact.replace(/^00/, '+');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new RegistrationPhoneError('INVALID_PHONE');
  }
  return normalized;
};
