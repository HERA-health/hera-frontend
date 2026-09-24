import { initialPrivateOption, privateOptionForModality } from '../privateServiceSelection';
import type { PrivateServiceOption } from '../../services/privateCatalogService';

const make = (id: string, serviceKey: string, modality: PrivateServiceOption['modality'] = 'VIDEO_CALL', durationMinutes = 50): PrivateServiceOption => ({
  id, serviceId: serviceKey, serviceKey, serviceName: serviceKey, name: serviceKey, modality, durationMinutes,
  priceCents: 6000, currency: 'EUR', isActive: true, isPublic: true, isPreferred: true, version: 1, legacyDuration: false, legacyTariffId: null,
});
const options = [make('mdr', 'mdr'), make('base', 'base'), make('mdr-office', 'mdr', 'IN_PERSON', 60), make('couple', 'couple', 'IN_PERSON', 50)];
test('explicit choice wins; invalid explicit choice never falls back silently', () => {
  expect(initialPrivateOption(options, 'mdr')?.id).toBe('mdr');
  expect(initialPrivateOption(options, 'archived')).toBeUndefined();
});
test('General is the default; multiple custom services require a choice', () => {
  expect(initialPrivateOption(options)?.id).toBe('base');
  expect(initialPrivateOption(options.filter(o => o.serviceKey !== 'base'))).toBeUndefined();
  expect(initialPrivateOption(options.filter(o => o.serviceKey === 'mdr'))?.id).toBe('mdr');
});
test('modality changes preserve only the same service and duration', () => {
  expect(privateOptionForModality(options, options[0], 'IN_PERSON')).toBeUndefined();
  const compatible = make('mdr-office-50', 'mdr', 'IN_PERSON');
  expect(privateOptionForModality([...options, compatible], options[0], 'IN_PERSON')?.id).toBe(compatible.id);
});
