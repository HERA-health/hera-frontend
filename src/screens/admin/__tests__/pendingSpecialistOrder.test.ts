import type { PendingSpecialist } from '../../../services/adminService';
import { sortPendingSpecialists } from '../pendingSpecialistOrder';

const specialist = (id: string, submittedAt: string | null): PendingSpecialist => ({
  id,
  verificationSubmittedAt: submittedAt,
  createdAt: '2020-01-01T00:00:00Z',
  colegiadoNumber: null,
  dniPhotoUrl: null,
  verificationStatus: 'PENDING',
  verificationResolvedAt: null,
  specialization: 'General',
  user: { id, name: id, email: `${id}@example.test`, avatar: null },
});

it('orders by submission time in both directions without changing the API result', () => {
  const input = [
    specialist('old', '2026-04-01T12:00:00Z'),
    specialist('new', '2026-05-01T12:00:00Z'),
    specialist('middle', '2026-04-15T12:00:00Z'),
  ];
  expect(sortPendingSpecialists(input, 'desc').map(({ id }) => id)).toEqual(['new', 'middle', 'old']);
  expect(sortPendingSpecialists(input, 'asc').map(({ id }) => id)).toEqual(['old', 'middle', 'new']);
  expect(input.map(({ id }) => id)).toEqual(['old', 'new', 'middle']);
});

it.each(['asc', 'desc'] as const)('keeps missing or invalid dates last in %s order', (order) => {
  const input = [specialist('missing', null), specialist('invalid', 'invalid'), specialist('dated', '2026-04-01T12:00:00Z')];
  expect(sortPendingSpecialists(input, order).map(({ id }) => id)).toEqual(['dated', 'missing', 'invalid']);
  expect(sortPendingSpecialists([], order)).toEqual([]);
});
