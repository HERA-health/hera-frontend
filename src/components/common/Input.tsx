/**
 * Input — HERA Design System v5.0
 *
 * Animated focus state: border transitions from neutral → sage green,
 * with a soft glow shadow that fades in on focus.
 * Full dark mode support via useTheme().
 *
 * Usage:
 *   <Input
 *     label="Email"
 *     placeholder="tu@email.com"
 *     value={email}
 *     onChangeText={setEmail}
 *     error="Email inválido"
 *   />
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
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
  const hasError = !!error;

  // Shared value: 0 = blurred, 1 = focused
  const focusAnim = useSharedValue(0);

  const handleFocus = useCallback((e: TextInputFocusEvent) => {
    focusAnim.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) });
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: TextInputBlurEvent) => {
    focusAnim.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
    onBlur?.(e);
  }, [onBlur]);

  // Animated border color: neutral → primary (or error color stays static)
  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = hasError
      ? theme.error
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [theme.border, theme.primary],
        );

    // Soft shadow glow appears on focus
    const shadowOpacity = withTiming(0); // base; overridden below
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
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>
          {label}
        </Text>
      )}

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
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

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

        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </Animated.View>

      {error && (
        <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text style={[styles.helperText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
          {helperText}
        </Text>
      )}
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
    // outlineStyle: 'none' for web — remove default browser outline
    ...({ outlineStyle: 'none' } as unknown as ViewStyle),
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
