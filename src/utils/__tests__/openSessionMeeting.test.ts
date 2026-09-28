import { Linking, Platform } from 'react-native';
import { openSessionMeeting } from '../openSessionMeeting';

const ready = { canJoin: true, meetingLink: 'https://meet.google.com/abc-defg-hij', preparationStatus: 'READY' as const };
const originalOpen = window.open;
afterEach(() => { Object.defineProperty(window, 'open', { configurable: true, value: originalOpen }); });
beforeEach(() => { jest.restoreAllMocks(); Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' }); });
test('web reserves a tab before loading and opens the canonical URL once', async () => {
  const replace = jest.fn(); const close = jest.fn();
  const tab = { opener: window, location: { replace }, close };
  const open = jest.fn(() => tab);
  Object.defineProperty(window, 'open', { configurable: true, value: open });
  const load = jest.fn(async () => { expect(open).toHaveBeenCalledTimes(1); expect(tab.opener).toBeNull(); return ready; });
  await Promise.all([openSessionMeeting('a', load), openSessionMeeting('a', load)]);
  expect(load).toHaveBeenCalledTimes(1); expect(replace).toHaveBeenCalledWith(ready.meetingLink); expect(close).not.toHaveBeenCalled();
});
test('pending access closes the reserved tab without opening a placeholder destination', async () => {
  const close = jest.fn(); const replace = jest.fn();
  Object.defineProperty(window, 'open', { configurable: true, value: jest.fn(() => ({ close, location: { replace } })) });
  await expect(openSessionMeeting('pending', async () => ({ canJoin: false, meetingLink: null, preparationStatus: 'PENDING' }))).rejects.toThrow('preparando');
  expect(close).toHaveBeenCalledTimes(1); expect(replace).not.toHaveBeenCalled();
});
test('blocked popup gives an explicit recovery and no request', async () => {
  Object.defineProperty(window, 'open', { configurable: true, value: jest.fn(() => null) });
  const load = jest.fn(async () => ready);
  await expect(openSessionMeeting('blocked', load)).rejects.toThrow('Permite abrir pestañas'); expect(load).not.toHaveBeenCalled();
});
test('native opens through Linking and propagates rejected opens', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openSessionMeeting('native', async () => ready); expect(open).toHaveBeenCalledWith(ready.meetingLink);
  open.mockRejectedValueOnce(new Error('Native open failed'));
  await expect(openSessionMeeting('native', async () => ready)).rejects.toThrow('Native open failed');
});
