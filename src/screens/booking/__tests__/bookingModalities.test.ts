import {
  getAvailableBookingSessionTypes,
  getDefaultBookingSessionType,
  isBookingSessionTypeAvailable,
} from '../bookingModalities';

describe('booking modalities', () => {
  it('defaults to video when modality flags are absent for backwards-compatible route params', () => {
    expect(getAvailableBookingSessionTypes({})).toEqual(['VIDEO_CALL']);
    expect(getDefaultBookingSessionType({})).toBe('VIDEO_CALL');
  });

  it('only exposes in-person booking when online is disabled and in-person is approved publicly', () => {
    const flags = { offersOnline: false, offersInPerson: true };

    expect(getAvailableBookingSessionTypes(flags)).toEqual(['IN_PERSON']);
    expect(getDefaultBookingSessionType(flags)).toBe('IN_PERSON');
    expect(isBookingSessionTypeAvailable('VIDEO_CALL', flags)).toBe(false);
  });

  it('does not expose phone bookings in the public booking flow', () => {
    expect(isBookingSessionTypeAvailable('PHONE_CALL', {
      offersOnline: true,
      offersInPerson: true,
    })).toBe(false);
  });

  it('returns no public booking types when both modalities are disabled', () => {
    const flags = { offersOnline: false, offersInPerson: false };

    expect(getAvailableBookingSessionTypes(flags)).toEqual([]);
    expect(getDefaultBookingSessionType(flags)).toBeNull();
  });
});
