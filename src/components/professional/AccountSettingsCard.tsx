import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function AccountSettingsCard({ title, description, children, plain = false }: {
  title?: string;
  plain?: boolean;
  description?: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  return <View style={[plain ? styles.plain : styles.card, !plain && width < 768 && styles.cardMobile, { backgroundColor: plain ? 'transparent' : theme.bgCard, borderColor: theme.border }]}>
    {title && <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{title}</Text>}
    {description ? <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{description}</Text> : null}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  plain: { gap: 14, backgroundColor: 'transparent' },
  card: { flexShrink: 0, padding: 20, gap: 16, borderWidth: 1, borderRadius: 16 },
  cardMobile: { padding: 16, gap: 14 },
  title: { fontSize: 22, lineHeight: 29 },
  description: { fontSize: 15, lineHeight: 23 },
});
