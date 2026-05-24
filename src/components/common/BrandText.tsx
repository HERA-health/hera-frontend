import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface BrandTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const BrandText: React.FC<BrandTextProps> = ({ children, style }) => {
  const { theme } = useTheme();

  return (
    <Text style={[styles.brandText, { color: theme.primary }, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  brandText: {
    fontWeight: 'bold',
  },
});
