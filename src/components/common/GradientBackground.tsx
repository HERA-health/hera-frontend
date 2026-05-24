import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface GradientBackgroundProps {
  children: React.ReactNode;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
  const { theme } = useTheme();

  return <View style={[styles.background, { backgroundColor: theme.bg }]}>{children}</View>;
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
