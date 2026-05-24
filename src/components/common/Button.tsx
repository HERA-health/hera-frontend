import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';
import { AnimatedPressable } from './AnimatedPressable';

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

  const textColor = getTextStyle(variant, isDisabled, size, theme).color;
  const content = loading ? (
    <ActivityIndicator color={String(textColor ?? theme.primary)} size="small" />
  ) : (
    <View style={styles.content}>
      {icon && iconPosition === 'left' ? <View style={styles.iconLeft}>{icon}</View> : null}
      <Text style={[getTextStyle(variant, isDisabled, size, theme), textStyle]}>
        {children}
      </Text>
      {icon && iconPosition === 'right' ? <View style={styles.iconRight}>{icon}</View> : null}
    </View>
  );

  const baseStyle: ViewStyle[] = [
    styles.base,
    sizeStyle,
    fullWidth ? styles.fullWidth : null,
    {
      borderRadius: borderRadius.lg,
    },
    getContainerStyle(variant, isDisabled, theme),
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      pressScale={isDisabled ? 1 : 0.96}
      hoverLift={!isDisabled && (variant === 'primary' || variant === 'secondary')}
      style={baseStyle}
    >
      {content}
    </AnimatedPressable>
  );
};

function getContainerStyle(
  variant: ButtonVariant,
  isDisabled: boolean,
  theme: ReturnType<typeof useTheme>['theme'],
): ViewStyle {
  if (isDisabled) {
    return {
      backgroundColor: theme.border,
      borderWidth: 1,
      borderColor: theme.border,
      opacity: 0.64,
    };
  }

  if (variant === 'primary') {
    return {
      backgroundColor: theme.actionPrimary,
      borderWidth: 1,
      borderColor: theme.actionPrimary,
      shadowColor: theme.shadowSecondary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 5,
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: theme.secondaryMuted,
      borderWidth: 1,
      borderColor: theme.secondaryLight,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    };
  }

  if (variant === 'danger') {
    return {
      backgroundColor: theme.error,
      borderWidth: 1,
      borderColor: theme.error,
      shadowColor: 'rgba(168, 80, 80, 0.24)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 3,
    };
  }

  if (variant === 'outline') {
    return {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.focus,
    };
  }

  return {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  };
}

function getTextStyle(
  variant: ButtonVariant,
  isDisabled: boolean,
  size: ButtonSize,
  theme: ReturnType<typeof useTheme>['theme'],
): TextStyle {
  const base: TextStyle = {
    fontFamily: theme.fontSansSemiBold,
    fontSize: SIZE_FONT[size],
    letterSpacing: 0,
  };

  if (isDisabled) {
    return { ...base, color: theme.textMuted };
  }

  if (variant === 'primary' || variant === 'danger') {
    return { ...base, color: variant === 'primary' ? theme.actionPrimaryText : theme.textOnPrimary };
  }

  if (variant === 'secondary') {
    return { ...base, color: theme.textPrimary };
  }

  return { ...base, color: theme.link };
}

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

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
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
