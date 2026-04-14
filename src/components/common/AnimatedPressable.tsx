/**
 * AnimatedPressable - Interactive wrapper with stable hover/press transforms.
 */

import React, { useCallback } from 'react';
import { Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hoverLift?: boolean;
  pressScale?: number;
  hoverTranslateY?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  onPress,
  onLongPress,
  children,
  style,
  hoverLift = true,
  pressScale = 0.97,
  hoverTranslateY = -3,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
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

  return (
    <AnimatedPressableComponent
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
