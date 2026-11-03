import { beginExternalCalendarRequest, clearExternalCalendarNotice, dismissExternalCalendarResult, getExternalCalendarNotice, receiveExternalCalendarNotice } from '../externalCalendarNotice';

beforeEach(clearExternalCalendarNotice);
const response = (status: 'STALE' | 'UNAVAILABLE' | 'VERIFIED') => ({ data: { externalCalendarVerification: { status, checkedAt: null } } });

test('a late response for an earlier selection cannot replace the current warning', () => {
  const earlier = {}, current = {};
  beginExternalCalendarRequest(earlier, '/available-slots');
  beginExternalCalendarRequest(current, '/managed-slot-options');
  receiveExternalCalendarNotice(current, response('UNAVAILABLE'), 'get');
  receiveExternalCalendarNotice(earlier, response('VERIFIED'), 'get');
  expect(getExternalCalendarNotice().selection).toBe(true);
});

test('failure discovered at saving survives navigation until dismissed', () => {
  receiveExternalCalendarNotice({}, response('STALE'), 'post');
  beginExternalCalendarRequest({}, '/available-slots');
  expect(getExternalCalendarNotice()).toEqual({ selection: false, result: true });
  dismissExternalCalendarResult();
  expect(getExternalCalendarNotice().result).toBe(false);
});

test('logout invalidates an outstanding selection and clears both messages', () => {
  const request = {};
  beginExternalCalendarRequest(request, '/slot-options');
  clearExternalCalendarNotice();
  receiveExternalCalendarNotice(request, response('UNAVAILABLE'), 'get');
  expect(getExternalCalendarNotice()).toEqual({ selection: false, result: false });
});
