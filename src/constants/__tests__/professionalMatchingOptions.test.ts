import {PROFESSIONAL_SPECIALTY_OPTIONS,PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,customChoiceError} from '../professionalMatchingOptions';
test('catalog exposes the required fixed choices and rejects duplicates', () => {
  expect(PROFESSIONAL_SPECIALTY_OPTIONS).toHaveLength(22);
  expect(PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS).toHaveLength(12);
  expect(customChoiceError('DEPRESION Y ESTADO DE ANIMO',[],PROFESSIONAL_SPECIALTY_OPTIONS)).toBeTruthy();
  expect(customChoiceError('migracion',['Migración'],PROFESSIONAL_SPECIALTY_OPTIONS)).toBeTruthy();
  expect(customChoiceError('x'.repeat(40),[],PROFESSIONAL_SPECIALTY_OPTIONS)).toBeNull();
  expect(customChoiceError('x'.repeat(41),[],PROFESSIONAL_SPECIALTY_OPTIONS)).toBeTruthy();
});
