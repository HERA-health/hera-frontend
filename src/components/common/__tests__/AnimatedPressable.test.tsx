import React from 'react';
import { Platform, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AnimatedPressable } from '../AnimatedPressable';

describe('AnimatedPressable web keyboard props', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('forwards roving focus and keyboard handlers only on web', () => {
    const onKeyDown = jest.fn();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const view = render(
      <AnimatedPressable testID="keyboard-pressable" onKeyDown={onKeyDown} tabIndex={-1}>
        <Text>Opción</Text>
      </AnimatedPressable>,
    );

    expect(screen.getByTestId('keyboard-pressable').props.onKeyDown).toBe(onKeyDown);
    expect(screen.getByTestId('keyboard-pressable').props.tabIndex).toBe(-1);

    view.unmount();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    render(
      <AnimatedPressable testID="native-pressable" onKeyDown={onKeyDown} tabIndex={0}>
        <Text>Opción</Text>
      </AnimatedPressable>,
    );

    expect(screen.getByTestId('native-pressable').props.onKeyDown).toBeUndefined();
    expect(screen.getByTestId('native-pressable').props.tabIndex).toBeUndefined();
  });
});
