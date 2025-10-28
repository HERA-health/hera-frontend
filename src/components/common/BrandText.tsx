import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';

interface BrandTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const BrandText: React.FC<BrandTextProps> = ({ children, style }) => {
  return (
    <Text style={[styles.brandText, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  brandText: {
    color: '#2196F3', // Primary brand blue
    fontWeight: 'bold',
  },
});
