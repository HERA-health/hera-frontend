import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type AmbientVariant = 'landing' | 'home' | 'subtle' | 'auth';

interface AmbientBackgroundProps {
  variant?: AmbientVariant;
}

export function AmbientBackground({ variant = 'subtle' }: AmbientBackgroundProps) {
  const { theme, isDark } = useTheme();
  const opacityMap: Record<AmbientVariant, number> = {
    landing: isDark ? 0.18 : 0.34,
    home: isDark ? 0.14 : 0.28,
    auth: isDark ? 0.16 : 0.3,
    subtle: isDark ? 0.1 : 0.2,
  };

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.bgAlt,
          opacity: opacityMap[variant],
        },
      ]}
    />
  );
}
