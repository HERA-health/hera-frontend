import { act, renderHook } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useRateLimitRecovery } from '../useGeneralRateLimit';
import { recordGeneralRateLimit, resetGeneralRateLimit } from '../../services/generalRateLimit';

describe('rate limit recovery visibility and session boundaries', () => {
  beforeEach(() => { jest.useFakeTimers(); resetGeneralRateLimit(); });
  afterEach(() => { resetGeneralRateLimit(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('waits for the screen to be focused and recovers only once', () => {
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    const recover = jest.fn();
    const view = renderHook<void, { active: boolean }>(({ active }) => useRateLimitRecovery(active, recover), { initialProps: { active: false } });
    act(() => recordGeneralRateLimit(10, undefined));
    act(() => jest.advanceTimersByTime(10_000));
    expect(recover).not.toHaveBeenCalled();
    view.rerender({ active: true });
    expect(recover).toHaveBeenCalledTimes(1);
    view.rerender({ active: false });
    view.rerender({ active: true });
    expect(recover).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('does not recover the previous session when authentication changes', () => {
    const recover = jest.fn();
    const view = renderHook(() => useRateLimitRecovery(true, recover));
    act(() => recordGeneralRateLimit(60, undefined));
    act(() => resetGeneralRateLimit());
    expect(recover).not.toHaveBeenCalled();
    view.unmount();
  });

  it('lets the normal focus loader recover without a duplicate request', () => {
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    const load = jest.fn();
    const view = renderHook<void, { active: boolean }>(({ active }) => {
      useRateLimitRecovery(active, load, { reloadsOnFocus: true });
      useEffect(() => { if (active) load(); }, [active]);
    }, { initialProps: { active: false } });
    act(() => recordGeneralRateLimit(10, undefined));
    act(() => jest.advanceTimersByTime(10_000));
    view.rerender({ active: true });
    expect(load).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('still recovers when focus returns before the cooldown expires', () => {
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    const recover = jest.fn();
    const view = renderHook<void, { active: boolean }>(({ active }) =>
      useRateLimitRecovery(active, recover, { reloadsOnFocus: true }),
    { initialProps: { active: false } });
    act(() => recordGeneralRateLimit(10, undefined));
    view.rerender({ active: true });
    expect(recover).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(10_000));
    expect(recover).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('waits until a hidden web document becomes visible', () => {
    const platform = Object.getOwnPropertyDescriptor(Platform, 'OS');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const events = new Map<string, () => void>();
    const documentFixture = {
      visibilityState: 'hidden',
      addEventListener: (name: string, listener: () => void) => { events.set(name, listener); },
      removeEventListener: (name: string) => { events.delete(name); },
    };
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: documentFixture });
    try {
      const recover = jest.fn();
      const view = renderHook(() => useRateLimitRecovery(true, recover));
      act(() => recordGeneralRateLimit(5, undefined));
      act(() => jest.advanceTimersByTime(5_000));
      expect(recover).not.toHaveBeenCalled();
      act(() => {
        documentFixture.visibilityState = 'visible';
        events.get('visibilitychange')?.();
      });
      expect(recover).toHaveBeenCalledTimes(1);
      view.unmount();
    } finally {
      if (platform) Object.defineProperty(Platform, 'OS', platform);
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
    }
  });
});
