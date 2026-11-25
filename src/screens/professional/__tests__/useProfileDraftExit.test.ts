import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useProfileDraftExit } from '../useProfileDraftExit';

const mockDispatch = jest.fn();
const mockConfirm = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockDispatch, addListener: () => () => undefined }),
  usePreventRemove: jest.fn(),
}));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: () => ({ confirm: mockConfirm }) }));

test.each([false, true])('restores a cancelled browser Back before applying the discard choice (%s)', async discard => {
  const platform = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events = new EventTarget();
  const go = jest.fn(() => events.dispatchEvent(new Event('popstate')));
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'web'});
  Object.defineProperty(globalThis, 'window', {configurable: true, value: Object.assign(events, {history: {go}})});
  mockDispatch.mockClear();
  mockConfirm.mockResolvedValue(discard);
  try {
    const view = renderHook(() => useProfileDraftExit(true));
    const prevent = jest.mocked(usePreventRemove).mock.lastCall;
    if (!prevent) throw new Error('Missing navigation guard');
    const action = {type: 'RESET'};
    // React Navigation can request removal before our listener sees the same popstate.
    const finished = prevent[1]({ data: { action } });
    events.dispatchEvent(new Event('popstate'));
    await finished;
    expect(go).toHaveBeenCalledWith(1);
    if (discard) expect(mockDispatch).toHaveBeenCalledWith(action);
    else expect(mockDispatch).not.toHaveBeenCalled();
    view.unmount();
  } finally {
    if (platform) Object.defineProperty(Platform, 'OS', platform);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
