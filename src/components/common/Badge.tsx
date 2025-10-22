/**
 * Reusable Badge Component
 * Small labels with different color variants and optional icons
 *
 * Usage:
 * <Badge variant="success" icon={<Icon name="check" />}>
 *   Verified
 * </Badge>
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../constants/colors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'pink';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  textStyle,
}) => {
  const getBadgeStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[`size_${size}`],
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colors.background.tertiary,
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: colors.background.success,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: '#FEF3C7', // Light yellow
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#FEE2E2', // Light red
        };
      case 'info':
        return {
          ...baseStyle,
          backgroundColor: colors.background.tertiary,
        };
      case 'neutral':
        return {
          ...baseStyle,
          backgroundColor: colors.neutral.gray100,
        };
      case 'purple':
        return {
          ...baseStyle,
          backgroundColor: '#F3E8FF', // Light purple
        };
      case 'pink':
        return {
          ...baseStyle,
          backgroundColor: '#FCE7F3', // Light pink
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.text,
      ...styles[`text_${size}`],
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseTextStyle,
          color: colors.primary.main,
        };
      case 'success':
        return {
          ...baseTextStyle,
          color: colors.primary.main,
        };
      case 'warning':
        return {
          ...baseTextStyle,
          color: colors.feedback.warning,
        };
      case 'error':
        return {
          ...baseTextStyle,
          color: colors.feedback.error,
        };
      case 'info':
        return {
          ...baseTextStyle,
          color: colors.feedback.info,
        };
      case 'neutral':
        return {
          ...baseTextStyle,
          color: colors.neutral.gray600,
        };
      case 'purple':
        return {
          ...baseTextStyle,
          color: colors.secondary.purple,
        };
      case 'pink':
        return {
          ...baseTextStyle,
          color: colors.secondary.pink,
        };
      default:
        return baseTextStyle;
    }
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[getTextStyle(), textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  size_small: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  size_medium: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  size_large: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontWeight: typography.fontWeights.medium,
  },
  text_small: {
    fontSize: typography.fontSizes.xs,
  },
  text_medium: {
    fontSize: typography.fontSizes.sm,
  },
  text_large: {
    fontSize: typography.fontSizes.md,
  },
  icon: {
    marginRight: spacing.xs,
  },
});
