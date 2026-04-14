import { Platform, TextStyle, ViewStyle } from 'react-native';

type WebInputStyle = TextStyle & {
  outlineStyle?: 'none';
};

type WebFocusRingStyle = ViewStyle & {
  boxShadow?: string;
};

export const getWebInputResetStyle = (): TextStyle => {
  if (Platform.OS !== 'web') {
    return {};
  }

  return {
    outlineStyle: 'none',
  } as WebInputStyle;
};

export const getWebFocusRingStyle = (color: string): ViewStyle => {
  if (Platform.OS !== 'web') {
    return {};
  }

  return {
    boxShadow: `0 0 0 3px ${color}20`,
  } as WebFocusRingStyle;
};
