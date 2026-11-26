import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function OptionalFieldSuffix() {
  const { theme } = useTheme();
  return (
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, fontWeight: '400' }}>
      {' (opcional)'}
    </Text>
  );
}
