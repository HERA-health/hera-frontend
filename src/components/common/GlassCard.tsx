/**
 * GlassCard - Glassmorphism surface component.
 *
 * Uses expo-blur on native and CSS backdrop-filter on web.
 * Automatically adapts tint to dark mode via useTheme().
 */

import React from 'react';
import { Platform, View, type ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?:
    | 'light'
    | 'dark'
    | 'default'
    | 'extraLight'
    | 'prominent'
    | 'systemMaterial'
    | 'systemChromeMaterial';
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  borderOpacity?: number;
}

export function GlassCard({
  children,
  intensity = 65,
  tint,
  style,
  borderRadius = 16,
  borderOpacity = 1,
}: GlassCardProps) {
  const { isDark } = useTheme();

  const resolvedTint = tint ?? (isDark ? 'dark' : 'light');
  const borderColor = isDark
    ? `rgba(154, 175, 145, ${0.12 * borderOpacity})`
    : `rgba(255, 255, 255, ${0.48 * borderOpacity})`;
  const backgroundColor = isDark
    ? 'rgba(20, 28, 22, 0.58)'
    : 'rgba(255, 255, 255, 0.78)';

  if (Platform.OS === 'web') {
    const blurPx = Math.max(10, Math.round(intensity * 0.28));
    const webBackdropStyle = {
      backdropFilter: `blur(${blurPx}px) saturate(180%)`,
      WebkitBackdropFilter: `blur(${blurPx}px) saturate(180%)`,
    } as unknown as ViewStyle;

    return (
      <View
        style={[
          styles.webBase,
          {
            borderRadius,
            backgroundColor,
            borderColor,
          },
          webBackdropStyle,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={resolvedTint}
      style={[
        styles.nativeBase,
        {
          borderRadius,
          borderColor,
          backgroundColor,
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  webBase: {
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: 'rgba(44, 62, 44, 0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  nativeBase: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
