import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

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

jest.mock('./src/components/common/StyledLogo', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    StyledLogo: ({ size }: { size?: number }) =>
      React.createElement(Text, null, `StyledLogo-${size ?? 0}`),
  };
});
