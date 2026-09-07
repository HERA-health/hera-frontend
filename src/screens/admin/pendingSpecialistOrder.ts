import type { PendingSpecialist } from '../../services/adminService';

export type SubmissionOrder = 'asc' | 'desc';

export function sortPendingSpecialists(
  specialists: readonly PendingSpecialist[],
  order: SubmissionOrder,
): PendingSpecialist[] {
  return [...specialists].sort((left, right) => {
    const leftTime = Date.parse(left.verificationSubmittedAt ?? '');
    const rightTime = Date.parse(right.verificationSubmittedAt ?? '');
    // Keep unavailable dates last in either direction.
    if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : 1;
    if (Number.isNaN(rightTime)) return -1;
    return order === 'desc' ? rightTime - leftTime : leftTime - rightTime;
  });
}
