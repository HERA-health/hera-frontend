import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useBillingRefresh } from '../useBillingRefresh';

let mockFocused = true;
jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(() => {
    if (mockFocused) return effect();
  }, [effect, mockFocused]) };
});

beforeEach(() => {
  jest.useFakeTimers();
  mockFocused = true;
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('polls pending deliveries and stops after resolution or leaving the screen', async () => {
  const refresh = jest.fn(async () => undefined);
  const view = renderHook<void, { pending: boolean }>(({ pending }) => useBillingRefresh(refresh, pending), { initialProps: { pending: true } });
  await act(async () => { jest.advanceTimersByTime(10_000); });
  expect(refresh).toHaveBeenCalledTimes(1);
  view.rerender({ pending: false });
  await act(async () => { jest.advanceTimersByTime(20_000); });
  expect(refresh).toHaveBeenCalledTimes(1);
  view.rerender({ pending: true });
  mockFocused = false;
  view.rerender({ pending: true });
  await act(async () => { jest.advanceTimersByTime(20_000); });
  expect(refresh).toHaveBeenCalledTimes(1);
  view.unmount();
});

it('never overlaps refreshes and refreshes when the app returns to foreground', async () => {
  let finish: (() => void) | undefined;
  const refresh = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  let onChange: (() => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = () => callback('active');
    return { remove };
  });
  const view = renderHook(() => useBillingRefresh(refresh, true));
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => { finish?.(); });
  await act(async () => { onChange?.(); });
  expect(refresh).toHaveBeenCalledTimes(2);
  await act(async () => { finish?.(); });
  view.unmount();
  expect(remove).toHaveBeenCalled();
});
