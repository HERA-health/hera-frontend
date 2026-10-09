import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { AppState, Platform } from 'react-native';
import { useDiscoveryRevalidation } from '../useDiscoveryRevalidation';

jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn() }));

describe('discovery revalidation', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalAppState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  const visibilityListeners = new Set<() => void>();
  const documentFixture = {
    visibilityState: 'visible',
    addEventListener: (_name: string, listener: () => void) => visibilityListeners.add(listener),
    removeEventListener: (_name: string, listener: () => void) => visibilityListeners.delete(listener),
  };
  const isFocused = jest.fn();
  let focus: () => void;
  const unsubscribe = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T10:00:00Z'));
    jest.clearAllMocks();
    visibilityListeners.clear();
    documentFixture.visibilityState = 'visible';
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: documentFixture });
    isFocused.mockReturnValue(true);
    jest.mocked(useNavigation).mockReturnValue({
      isFocused,
      addListener: (_name: string, listener: () => void) => { focus = listener; return unsubscribe; },
    } as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalAppState) Object.defineProperty(AppState, 'currentState', originalAppState);
  });

  const returnToTab = async () => {
    await act(async () => { visibilityListeners.forEach(listener => listener()); });
  };

  it('does not poll, reload fresh data or subscribe to duplicate web AppState events', async () => {
    const subscribe = jest.spyOn(AppState, 'addEventListener');
    const load = jest.fn(async () => undefined);
    const view = renderHook(() => useDiscoveryRevalidation(load));
    await returnToTab();
    expect(load).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(30_000));
    expect(load).not.toHaveBeenCalled();
    await act(async () => { focus(); visibilityListeners.forEach(listener => listener()); });
    expect(load).toHaveBeenCalledTimes(1);
    expect(subscribe).not.toHaveBeenCalled();
    view.unmount();
    expect(visibilityListeners.size).toBe(0);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores hidden screens and hidden tabs, then refreshes the active screen', async () => {
    const load = jest.fn(async () => undefined);
    const view = renderHook(() => useDiscoveryRevalidation(load));
    act(() => jest.advanceTimersByTime(30_000));
    isFocused.mockReturnValue(false);
    await returnToTab();
    isFocused.mockReturnValue(true);
    documentFixture.visibilityState = 'hidden';
    await act(async () => focus());
    expect(load).not.toHaveBeenCalled();
    documentFixture.visibilityState = 'visible';
    await returnToTab();
    expect(load).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('does not overlap a slow read or refetch during repeated quick tab changes', async () => {
    let resolve: () => void = () => undefined;
    const load = jest.fn(() => new Promise<void>(done => { resolve = done; }));
    const view = renderHook(() => useDiscoveryRevalidation(load));
    act(() => jest.advanceTimersByTime(30_000));
    await returnToTab();
    act(() => jest.advanceTimersByTime(30_000));
    await returnToTab();
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    await returnToTab();
    expect(load).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(30_000));
    await returnToTab();
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => resolve());
    for (let i = 0; i < 20; i++) await returnToTab();
    expect(load).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it('treats an explicit query change as fresh and keeps navigation focus optional', async () => {
    const first = jest.fn(async () => undefined);
    const second = jest.fn(async () => undefined);
    const view = renderHook<void, { load: () => Promise<void> }>(({ load }) => useDiscoveryRevalidation(load, false), { initialProps: { load: first } });
    act(() => jest.advanceTimersByTime(30_000));
    view.rerender({ load: second });
    await returnToTab();
    expect(second).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(30_000));
    await returnToTab();
    expect(second).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('refreshes native screens only after the app becomes active', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
    let resume: () => void = () => undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      resume = () => listener('active');
      return { remove };
    });
    const load = jest.fn(async () => undefined);
    const view = renderHook(() => useDiscoveryRevalidation(load));
    act(() => jest.advanceTimersByTime(30_000));
    await act(async () => resume());
    expect(load).not.toHaveBeenCalled();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    await act(async () => resume());
    expect(load).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
