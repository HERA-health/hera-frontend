import type { ApiSession } from '../../types';
import { canClientCancelSession } from '../sessionHelpers';

const FUTURE_SESSION_END = Date.parse('2026-07-10T11:00:00.000Z');
const NOW = Date.parse('2026-07-10T10:30:00.000Z');

const buildSession = (status: ApiSession['status']): Pick<ApiSession, 'date' | 'duration' | 'status'> => ({
  date: '2026-07-10T10:00:00.000Z',
  duration: 60,
  status,
});

describe('canClientCancelSession', () => {
  it.each(['PENDING', 'CONFIRMED'] as const)(
    'allows a future-ended session with status %s',
    (status) => {
      expect(canClientCancelSession(buildSession(status), NOW)).toBe(true);
    }
  );

  it.each(['COMPLETED', 'CANCELLED'] as const)(
    'does not allow cancellation for final status %s',
    (status) => {
      expect(canClientCancelSession(buildSession(status), NOW)).toBe(false);
    }
  );

  it('does not allow cancellation once the session has ended', () => {
    expect(canClientCancelSession(buildSession('CONFIRMED'), FUTURE_SESSION_END)).toBe(false);
  });
});
