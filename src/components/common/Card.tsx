/**
 * Card — HERA Design System v5.0
 *
 * Provides consistent card styling with dark mode support,
 * tinted shadows, and optional press interactions via AnimatedPressable.
 *
 * Variants:
 *  - default: Subtle shadow card
 *  - elevated: Larger tinted shadow for feature cards
 *  - outlined: Border-only, no shadow
 *  - glass: Delegates to GlassCard (glassmorphism)
 *
 * Usage:
 *   <Card variant="elevated" onPress={handlePress}>
 *     <Text>Content</Text>
 *   </Card>
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';
import { GlassCard } from './GlassCard';
import { borderRadius, spacing } from '../../constants/colors';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';
type CardPadding = 'none' | 'small' | 'medium' | 'large';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  /** Hover lift on web (default: true when onPress is set) */
  hoverLift?: boolean;
  /** Press scale factor (default: 0.98) */
  pressScale?: number;
}

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  small: spacing.sm,
  medium: spacing.md,
  large: spacing.lg,
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
  style,
  hoverLift,
  pressScale = 0.98,
}) => {
  const { theme } = useTheme();
  const normalizedStyle = Array.isArray(style) ? style : style ? [style] : [];

  const pad = PADDING_MAP[padding];

  // ─── Glass variant ────────────────────────────────────────────────────────
  if (variant === 'glass') {
    const inner = (
      <GlassCard
        borderRadius={borderRadius.lg}
        style={[{ padding: pad }, ...normalizedStyle]}
      >
        {children}
      </GlassCard>
    );

    if (onPress) {
      return (
        <AnimatedPressable
          onPress={onPress}
          pressScale={pressScale}
          hoverLift={hoverLift ?? true}
        >
          {inner}
        </AnimatedPressable>
      );
    }
    return inner;
  }

  // ─── Shadow/outlined variants ─────────────────────────────────────────────
  const cardStyle: ViewStyle = {
    borderRadius: borderRadius.lg,
    padding: pad,
    backgroundColor: theme.bgCard,
    overflow: 'hidden',
    ...(variant === 'default' && {
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    }),
    ...(variant === 'elevated' && {
      shadowColor: theme.shadowNeutral,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 6,
    }),
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: theme.border,
    }),
  };

  const combined: ViewStyle[] = [cardStyle, ...normalizedStyle];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        pressScale={pressScale}
        hoverLift={hoverLift ?? true}
        style={combined}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={combined}>{children}</View>;
};
