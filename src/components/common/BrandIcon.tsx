import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { branding } from '../../constants/colors';

interface BrandIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  withBackground?: boolean;
}

export const BrandIcon: React.FC<BrandIconProps> = ({
  name,
  size = 24,
  withBackground = false,
}) => {
  if (!withBackground) {
    // Just colored icon without background
    return <Ionicons name={name} size={size} color={branding.accent} />;
  }

  // Icon with gradient background circle
  const circleSize = size + 16;

  return (
    <LinearGradient
      colors={[branding.accent, branding.accentLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.circle, {
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
      }]}
    >
      <Ionicons name={name} size={size} color="#fff" />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
