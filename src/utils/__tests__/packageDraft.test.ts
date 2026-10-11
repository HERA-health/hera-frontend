import { packagePublicationIssue, packageSavings, packageServiceNeedsReview, parsePackageValues } from '../packageDraft';
import { service } from '../../components/packages/testing/packageFixtures';
test('calculates the saving separately for each modality and reports surcharge and zero references', () => {
  expect(packageSavings(10, 54000, 6000)).toEqual({ differenceCents: 6000, percentage: 10 });
  expect(packageSavings(10, 54000, 8000)).toEqual({ differenceCents: 26000, percentage: 32.5 });
  expect(packageSavings(5, 25000, 4000)).toEqual({ differenceCents: -5000, percentage: -25 });
  expect(packageSavings(5, 0, 0)).toEqual({ differenceCents: 0, percentage: null });
});
test('validates comma decimals, explicit zero and package bounds without implicit amounts', () => {
  expect(parsePackageValues('5', '250,01')).toEqual({ sessions: 5, totalCents: 25001 });
  expect(parsePackageValues('1', '0')).toEqual({ sessions: 1, totalCents: 0 });
  for (const [sessions, price] of [['0', '5'], ['1001', '5'], ['1.5', '5'], ['5', ''], ['5', '10.123'], ['5', '1000000.01']]) expect(parsePackageValues(sessions, price)).toBeNull();
});
test('requires simplification and prevents public packages over private or restricted services', () => {
  expect(packageServiceNeedsReview(service)).toBe(false);
  expect(packageServiceNeedsReview({ ...service, id: 'legacy:owner' })).toBe(true);
  expect(packageServiceNeedsReview({ ...service, options: [...service.options, { ...service.options[0], id: 'extra' }] })).toBe(true);
  expect(packagePublicationIssue(service, ['option-0'], {})).toBeNull();
  expect(packagePublicationIssue(service, ['option-0'], { VIDEO_CALL: 'Activa vídeo' })).toBe('Activa vídeo');
  expect(packagePublicationIssue({ ...service, options: service.options.map(o => ({ ...o, isPublic: false })) }, ['option-0'], {})).toMatch(/privada/);
});
