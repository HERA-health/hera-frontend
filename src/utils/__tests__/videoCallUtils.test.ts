import { getVideoCallButtonState } from '../videoCallUtils';

describe('getVideoCallButtonState', () => {
  it('separates preparation from time and keeps the current access actionable', () => {
    const session = { status: 'CONFIRMED', type: 'VIDEO_CALL', date: new Date(Date.now() + 300000), duration: 60 };
    expect(getVideoCallButtonState({ ...session, meetingStatus: 'PENDING' })).toBe('NO_LINK');
    expect(getVideoCallButtonState({ ...session, meetingStatus: 'REQUIRES_GOOGLE' })).toBe('NO_LINK');
    expect(getVideoCallButtonState({ ...session, meetingStatus: 'READY' })).toBe('READY');
    expect(getVideoCallButtonState({ ...session, status: 'CANCELLED', meetingStatus: 'READY' })).toBe('COMPLETED');
  });
  it('does not treat missing meetingLink in list DTOs as an unavailable call', () => {
    const sessionDate = new Date(Date.now() + 60 * 60 * 1000);

    expect(
      getVideoCallButtonState({
        status: 'CONFIRMED',
        type: 'VIDEO_CALL',
        date: sessionDate,
        duration: 60,
        meetingLink: null,
      })
    ).toBe('CONFIRMED_EARLY');
  });
});
