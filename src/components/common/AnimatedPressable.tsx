/**
 * AnimatedPressable - Interactive wrapper with stable hover/press transforms.
 */

import React, { useCallback } from 'react';
import { Platform, Pressable } from 'react-native';
import type {
  AccessibilityState,
  GestureResponderEvent,
  Insets,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps {
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hoverLift?: boolean;
  pressScale?: number;
  hoverTranslateY?: number;
  disabled?: boolean;
  hitSlop?: Insets;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'link' | 'none' | 'radio';
  accessibilityState?: AccessibilityState;
  testID?: string;
  href?: string;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);
type WebLinkProps = {
  href?: string;
};

interface WebPointerModifiers {
  altKey?: boolean;
  button?: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}
const WebLinkAnimatedPressable = AnimatedPressableComponent as React.ComponentType<
  React.ComponentProps<typeof AnimatedPressableComponent> & WebLinkProps
>;

export function AnimatedPressable({
  onPress,
  onLongPress,
  children,
  style,
  hoverLift = true,
  pressScale = 0.97,
  hoverTranslateY = -3,
  disabled = false,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
  href,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(pressScale, { damping: 15, stiffness: 300 });
  }, [pressScale, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 250 });
  }, [scale]);

  const handleHoverIn = useCallback(() => {
    if (Platform.OS !== 'web' || !hoverLift || disabled) return;
    translateY.value = withSpring(hoverTranslateY, {
      damping: 18,
      stiffness: 220,
    });
  }, [disabled, hoverLift, hoverTranslateY, translateY]);

  const handleHoverOut = useCallback(() => {
    if (Platform.OS !== 'web') return;
    translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, [translateY]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    if (Platform.OS === 'web' && href) {
      const nativeEvent = event.nativeEvent as unknown as WebPointerModifiers;
      const opensSeparateContext = Boolean(
        nativeEvent.altKey
        || nativeEvent.ctrlKey
        || nativeEvent.metaKey
        || nativeEvent.shiftKey
        || (nativeEvent.button ?? 0) !== 0
      );

      if (opensSeparateContext) {
        return;
      }

      // Keep ordinary clicks inside React Navigation while preserving the
      // browser's native new-tab/window behavior for modified clicks.
      event.preventDefault();
    }

    onPress?.(event);
  }, [href, onPress]);

  return (
    <WebLinkAnimatedPressable
      {...(Platform.OS === 'web' && href ? { href } : {})}
      onPress={disabled ? undefined : handlePress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      testID={testID}
      style={[style, animStyle]}
    >
      {children}
    </WebLinkAnimatedPressable>
  );
}
