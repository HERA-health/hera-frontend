import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();

  if (!withBackground) {
    return <Ionicons name={name} size={size} color={theme.primary} />;
  }

  const circleSize = size + 16;

  return (
    <View
      style={[
        styles.circle,
        {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: theme.primary,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={theme.textOnPrimary} />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
