import { getVideoCallButtonState } from '../videoCallUtils';

describe('getVideoCallButtonState', () => {
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
