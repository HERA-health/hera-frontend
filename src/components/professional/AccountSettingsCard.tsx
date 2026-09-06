import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function AccountSettingsCard({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
    <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{title}</Text>
    {description ? <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{description}</Text> : null}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 24, gap: 18, borderWidth: 1, borderRadius: 16 },
  title: { fontSize: 22, lineHeight: 29 },
  description: { fontSize: 15, lineHeight: 23 },
});
