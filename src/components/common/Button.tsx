/**
 * Button — HERA Design System v5.0
 *
 * Supports multiple variants, sizes, loading state, and icons.
 * Uses ThemeContext for dark mode and tinted shadows.
 * Uses AnimatedPressable for spring scale + hover lift.
 *
 * Usage:
 *   <Button variant="primary" size="large" onPress={handlePress}>
 *     Encuentra tu especialista
 *   </Button>
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';
import { spacing, borderRadius, typography } from '../../constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyle = SIZE_STYLES[size];

  const content = loading ? (
    <ActivityIndicator
      color={
        variant === 'primary' || variant === 'secondary' || variant === 'danger'
          ? '#FFFFFF'
          : theme.primary
      }
      size="small"
    />
  ) : (
    <View style={styles.content}>
      {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
      <Text style={[getTextStyle(variant, isDisabled, size, theme), textStyle]}>
        {children}
      </Text>
      {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
    </View>
  );

  const containerStyle: ViewStyle = {
    ...(fullWidth ? { width: '100%' } : {}),
    ...(isDisabled ? { opacity: 0.5 } : {}),
    ...style,
  };

  // ─── Primary: Sage gradient + tinted shadow ──────────────────────────────
  if (variant === 'primary' && !isDisabled) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        pressScale={0.96}
        hoverLift={true}
        style={[
          containerStyle,
          styles.base,
          {
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            shadowColor: theme.shadowPrimary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 1,
            shadowRadius: 14,
            elevation: 5,
          },
        ]}
      >
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientFill,
            sizeStyle,
            fullWidth ? styles.gradientFillFullWidth : null,
          ]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // ─── Secondary: Lavender gradient ────────────────────────────────────────
  if (variant === 'secondary' && !isDisabled) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        pressScale={0.96}
        hoverLift={true}
        style={[
          containerStyle,
          styles.base,
          sizeStyle,
          {
            borderRadius: borderRadius.lg,
            backgroundColor: theme.secondaryAlpha12,
            borderWidth: 1,
            borderColor: theme.secondaryLight,
            shadowColor: theme.shadowCard,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 2,
          },
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  // ─── Danger: Error gradient ───────────────────────────────────────────────
  if (variant === 'danger' && !isDisabled) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        pressScale={0.96}
        hoverLift={false}
        style={[
          containerStyle,
          styles.base,
          {
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            shadowColor: 'rgba(224,112,112,0.25)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 10,
            elevation: 3,
          },
        ]}
      >
        <LinearGradient
          colors={[theme.error, '#C45050']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientFill,
            sizeStyle,
            fullWidth ? styles.gradientFillFullWidth : null,
          ]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // ─── Outline ──────────────────────────────────────────────────────────────
  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        pressScale={0.97}
        hoverLift={false}
        style={[
          containerStyle,
          styles.base,
          sizeStyle,
          {
            borderRadius: borderRadius.lg,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDisabled ? theme.border : theme.primary,
          },
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  // ─── Ghost ────────────────────────────────────────────────────────────────
  if (variant === 'ghost') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        pressScale={0.97}
        hoverLift={false}
        style={[containerStyle, styles.base, sizeStyle, { borderRadius: borderRadius.lg }]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  // ─── Disabled fallback for all variants ───────────────────────────────────
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      pressScale={1}
      hoverLift={false}
      style={[
        containerStyle,
        styles.base,
        sizeStyle,
        {
          borderRadius: borderRadius.lg,
          backgroundColor: theme.border,
        },
      ]}
    >
      {content}
    </AnimatedPressable>
  );
};

// ─── Text styles ──────────────────────────────────────────────────────────────

function getTextStyle(
  variant: ButtonVariant,
  isDisabled: boolean,
  size: ButtonSize,
  theme: ReturnType<typeof useTheme>['theme'],
): TextStyle {
  const base: TextStyle = {
    fontFamily: theme.fontSansSemiBold,
    fontSize: SIZE_FONT[size],
    letterSpacing: 0.2,
  };

  if (variant === 'primary' || variant === 'secondary' || variant === 'danger') {
    if (variant === 'secondary') {
      return { ...base, color: theme.secondaryDark };
    }
    return { ...base, color: '#FFFFFF' };
  }
  if (variant === 'outline') {
    return { ...base, color: isDisabled ? theme.textMuted : theme.primary };
  }
  if (variant === 'ghost') {
    return { ...base, color: isDisabled ? theme.textMuted : theme.primary };
  }
  return { ...base, color: theme.textMuted };
}

// ─── Size configs ─────────────────────────────────────────────────────────────

const SIZE_STYLES: Record<ButtonSize, ViewStyle> = {
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  large: {
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
};

const SIZE_FONT: Record<ButtonSize, number> = {
  small: 13,
  medium: 15,
  large: 16,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradientFill: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradientFillFullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
