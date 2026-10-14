import { patientOriginLabel } from '../patientProvenance';
import { getProvenanceLabel } from '../../screens/professional/components/agenda/professionalAgendaUtils';

test('patient provenance labels retain acquisition and additional relationship context', () => {
  expect(patientOriginLabel('HERA_DIRECTORY')).toBe('Directorio HERA');
  expect(patientOriginLabel('SPECIALIST_INVITED')).toBe('Cartera propia');
  expect(patientOriginLabel('PROFESSIONAL_REFERRAL')).toBe('Cartera propia · Derivación');
  expect(patientOriginLabel('UNKNOWN')).toBe('Procedencia pendiente');
  expect(patientOriginLabel(undefined)).toBe('Procedencia pendiente');
  expect(getProvenanceLabel('DIRECTORY', ['COLLABORATION'])).toBe('Directorio HERA · Colaboración');
});
