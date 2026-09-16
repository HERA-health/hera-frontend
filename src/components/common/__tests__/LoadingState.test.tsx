import React from 'react';
import { Animated, Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import { LoadingState } from '../LoadingState';

const originalPlatform = Platform.OS;
afterEach(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform }); });

it.each(['web', 'ios', 'android'] as const)('uses an animation driver supported by %s', platform => {
 jest.mocked(Animated.timing).mockClear();
 Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
 const view = render(<LoadingState message="Cargando comisiones" />);
 expect(view.getByText('Cargando comisiones')).toBeTruthy();
 expect(Animated.timing).toHaveBeenCalledTimes(2);
 for (const [, config] of jest.mocked(Animated.timing).mock.calls) {
  expect(config.useNativeDriver).toBe(platform !== 'web');
 }
 view.unmount();
});
