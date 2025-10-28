import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
    return <Ionicons name={name} size={size} color="#2196F3" />;
  }

  // Icon with gradient background circle
  const circleSize = size + 16;

  return (
    <LinearGradient
      colors={['#2196F3', '#00897B']}
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
