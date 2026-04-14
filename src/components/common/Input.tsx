import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

type TextInputFocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type TextInputBlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const hasError = Boolean(error);
  const focusAnim = useSharedValue(0);

  const handleFocus = useCallback((e: TextInputFocusEvent) => {
    focusAnim.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) });
    onFocus?.(e);
  }, [focusAnim, onFocus]);

  const handleBlur = useCallback((e: TextInputBlurEvent) => {
    focusAnim.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
    onBlur?.(e);
  }, [focusAnim, onBlur]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = hasError
      ? theme.error
      : interpolateColor(focusAnim.value, [0, 1], [theme.border, theme.primary]);

    const glowOpacity = hasError ? 0 : focusAnim.value * 0.18;

    return {
      borderColor,
      shadowColor: hasError ? theme.error : theme.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: hasError ? 0.15 : glowOpacity,
      shadowRadius: 8,
      elevation: focusAnim.value * 2,
    };
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: theme.textSecondary, fontFamily: theme.fontSansMedium },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
          },
          animatedContainerStyle,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              fontFamily: theme.fontSans,
            },
            style,
          ]}
          placeholderTextColor={theme.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />

        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </Animated.View>

      {error ? (
        <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
          {error}
        </Text>
      ) : null}

      {helperText && !error ? (
        <Text
          style={[styles.helperText, { color: theme.textMuted, fontFamily: theme.fontSans }]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
    ...({
      outlineStyle: 'none',
      appearance: 'none',
      WebkitAppearance: 'none',
      WebkitBoxShadow: '0 0 0 1000px transparent inset',
      WebkitTextFillColor: 'inherit',
    } as unknown as TextStyle),
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
});
