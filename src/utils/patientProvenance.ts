export const patientOriginLabel = (origin?: string) => {
  if (origin === 'HERA_DIRECTORY') return 'Directorio HERA';
  if (origin === 'PROFESSIONAL_REFERRAL') return 'Cartera propia · Derivación';
  if (origin === 'COLLABORATION') return 'Cartera propia · Colaboración';
  if (origin === 'SPECIALIST_OWN' || origin === 'SPECIALIST_INVITED') return 'Cartera propia';
  return 'Procedencia pendiente';
};
