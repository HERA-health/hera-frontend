import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

const ReactNative = require('react-native');
const immediateAnimation = {
  start: (callback?: () => void) => callback?.(),
  stop: jest.fn(),
  reset: jest.fn(),
};

jest.spyOn(ReactNative.Animated, 'timing').mockImplementation(() => immediateAnimation);
jest.spyOn(ReactNative.Animated, 'parallel').mockImplementation(() => immediateAnimation);
jest.spyOn(ReactNative.Animated, 'sequence').mockImplementation(() => immediateAnimation);
jest.spyOn(ReactNative.Animated, 'loop').mockImplementation(() => immediateAnimation);

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name, children, ...props }: { name?: string; children?: React.ReactNode }) =>
      React.createElement(Text, props, children ?? name ?? 'icon'),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return ({ name, children, ...props }: { name?: string; children?: React.ReactNode }) =>
    React.createElement(Text, props, children ?? name ?? 'icon');
});

jest.mock('react-native-spotlight-tour', () => {
  const React = require('react');
  const { View } = require('react-native');

  const controls = {
    current: undefined,
    goTo: jest.fn(),
    next: jest.fn(),
    pause: jest.fn(),
    previous: jest.fn(),
    resume: jest.fn(),
    start: jest.fn(),
    status: 'idle',
    stop: jest.fn(),
  };
  const testState: { controls: typeof controls; props: unknown | null } = {
    controls,
    props: null,
  };

  return {
    AttachStep: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
      React.createElement(View, { style, testID: 'mock-tour-target' }, children),
    SpotlightTourProvider: React.forwardRef(
      (
        props: { children: React.ReactNode | ((tour: typeof controls) => React.ReactNode) },
        ref: React.Ref<typeof controls>,
      ) => {
        testState.props = props;
        const { children } = props;
        React.useImperativeHandle(ref, () => controls);
        return React.createElement(
          React.Fragment,
          null,
          typeof children === 'function' ? children(controls) : children,
        );
      },
    ),
    __getSpotlightTourTestState: () => testState,
    useSpotlightTour: () => controls,
  };
});

jest.mock('./src/components/common/StyledLogo', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    StyledLogo: ({ size }: { size?: number }) =>
      React.createElement(Text, null, `StyledLogo-${size ?? 0}`),
  };
});
