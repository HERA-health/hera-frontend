import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GradientIconCircleProps {
  iconName: keyof typeof Ionicons.glyphMap;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
}

export const GradientIconCircle: React.FC<GradientIconCircleProps> = ({
  iconName,
  size = 48,
  iconSize = 24,
  style,
}) => {
  return (
    <LinearGradient
      colors={['#2196F3', '#00897B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color="#fff" />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
