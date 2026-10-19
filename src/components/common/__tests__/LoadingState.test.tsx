import React from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Text } from 'react-native';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import { LoadingState } from '../LoadingState';

const originalPlatform = Platform.OS;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const readPreference = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
const subscribePreference = jest.spyOn(AccessibilityInfo, 'addEventListener');

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'ios');
  readPreference.mockResolvedValue(false);
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
  jest.replaceProperty(Platform, 'OS', originalPlatform);
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

afterAll(() => {
  readPreference.mockRestore();
  subscribePreference.mockRestore();
});

async function reveal() {
  await act(async () => {});
  act(() => jest.advanceTimersByTime(200));
}

function createWebPreference(matches: boolean) {
  let onChange: (() => void) | undefined;
  const preference = {
    matches,
    addEventListener: jest.fn((_event: string, listener: () => void) => { onChange = listener; }),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia: jest.fn(() => preference) },
  });
  return { preference, change: () => onChange?.() };
}

it('reserves its content without announcing or showing a brief load', async () => {
  const view = render(<LoadingState message="Cargando sesiones" fullScreen />);
  await act(async () => {});
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.queryByText('Cargando sesiones')).toBeNull();
  expect(screen.getByText('Cargando sesiones', { includeHiddenElements: true })).toBeTruthy();

  act(() => jest.advanceTimersByTime(199));
  expect(screen.queryByRole('progressbar')).toBeNull();
  view.unmount();
  act(() => jest.advanceTimersByTime(500));
  expect(Animated.timing).not.toHaveBeenCalled();
});

it.each(['web', 'ios', 'android'] as const)('reveals one named busy state after 200 ms on %s', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  if (platform === 'web') createWebPreference(false);
  render(<LoadingState message="Cargando sesiones" />);
  await reveal();

  const progress = screen.getByRole('progressbar', { name: 'Cargando sesiones' });
  expect(progress.props.accessibilityState).toEqual({ busy: true });
  expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), {
    toValue: 1,
    duration: 160,
    useNativeDriver: platform !== 'web',
  });
});

it('shows a static indicator without an entrance animation for native reduced motion', async () => {
  readPreference.mockResolvedValue(true);
  const view = render(<LoadingState message="Cargando sesiones" />);
  await reveal();

  expect(screen.getByRole('progressbar', { name: 'Cargando sesiones' })).toBeTruthy();
  expect(subscribePreference).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
  expect(view.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
  expect(Animated.timing).not.toHaveBeenCalled();
});

it('reads web reduced motion immediately, reacts to changes and removes its listener', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const { preference, change } = createWebPreference(true);
  const view = render(<LoadingState message="Cargando sesiones" />);
  await reveal();
  expect(Animated.timing).not.toHaveBeenCalled();
  expect(view.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
  expect(readPreference).not.toHaveBeenCalled();

  act(() => {
    preference.matches = false;
    change();
  });
  expect(view.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(1);
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(preference.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
});

it('stops its entrance animation on unmount', async () => {
  const stop = jest.fn();
  jest.mocked(Animated.timing).mockReturnValueOnce({ start: jest.fn(), stop, reset: jest.fn() });
  const view = render(<LoadingState />);
  await reveal();
  view.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

it('releases the loading surface immediately when content becomes ready', async () => {
  const Example = ({ loading }: { loading: boolean }) => loading
    ? <LoadingState message="Cargando sesiones" />
    : <Text>Contenido listo</Text>;
  const view = render(<Example loading />);
  await reveal();
  view.rerender(<Example loading={false} />);

  expect(screen.getByText('Contenido listo')).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});

it('keeps a static accessible state if the native motion preference is unavailable', async () => {
  readPreference.mockRejectedValue(new Error('Preference unavailable'));
  render(<LoadingState message="" />);
  await reveal();
  expect(screen.getByRole('progressbar', { name: 'Cargando...' })).toBeTruthy();
  expect(Animated.timing).not.toHaveBeenCalled();
});
