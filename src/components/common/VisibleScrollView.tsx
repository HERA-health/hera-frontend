import React from 'react';
import {
  Platform,
  ScrollView,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type VisibleScrollViewProps = Omit<
  ScrollViewProps,
  'showsHorizontalScrollIndicator' | 'showsVerticalScrollIndicator'
>;

const webVerticalScrollbar = {
  scrollbarGutter: 'stable',
  scrollbarWidth: 'thin',
} as unknown as ViewStyle;

/**
 * ScrollView with an explicit, persistent affordance whenever content overflows.
 * Web keeps a stable scrollbar gutter, Android keeps the native thumb visible,
 * and iOS receives the correct light/dark native indicator.
 */
export const VisibleScrollView = React.forwardRef<ScrollView, VisibleScrollViewProps>(
  function VisibleScrollView(
    {
      horizontal = false,
      indicatorStyle,
      persistentScrollbar = true,
      style,
      ...props
    },
    ref,
  ): React.ReactElement {
    const { isDark } = useTheme();
    const isHorizontal = horizontal === true;

    return (
      <ScrollView
        {...props}
        ref={ref}
        horizontal={isHorizontal}
        indicatorStyle={indicatorStyle ?? (isDark ? 'white' : 'black')}
        persistentScrollbar={persistentScrollbar}
        showsHorizontalScrollIndicator={isHorizontal}
        showsVerticalScrollIndicator={!isHorizontal}
        style={[
          style,
          Platform.OS === 'web' && !isHorizontal ? webVerticalScrollbar : null,
        ]}
      />
    );
  },
);
