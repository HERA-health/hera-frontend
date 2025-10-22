/**
 * Reusable Card Component
 * Provides consistent card styling with shadows and optional press behavior
 *
 * Usage:
 * <Card>
 *   <Text>Card content</Text>
 * </Card>
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../constants/colors';

type CardVariant = 'default' | 'elevated' | 'outlined';
type CardPadding = 'none' | 'small' | 'medium' | 'large';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[`padding_${padding}`],
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          ...shadows.lg,
          backgroundColor: colors.neutral.white,
        };
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: colors.neutral.white,
          borderWidth: 1,
          borderColor: colors.neutral.gray200,
        };
      case 'default':
      default:
        return {
          ...baseStyle,
          ...shadows.md,
          backgroundColor: colors.neutral.white,
        };
    }
  };

  const combinedStyle = [getCardStyle(), style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={combinedStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={combinedStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  padding_none: {
    padding: 0,
  },
  padding_small: {
    padding: spacing.sm,
  },
  padding_medium: {
    padding: spacing.md,
  },
  padding_large: {
    padding: spacing.lg,
  },
});
