import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primary,
          shadowColor: theme.shadowPrimary,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={theme.textOnPrimary} />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
});
