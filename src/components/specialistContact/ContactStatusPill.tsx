import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

export function ContactStatusPill({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const { theme } = useTheme();
  const terminal = status === 'RESOLVED' || status === 'IMPLEMENTED' || status === 'CLOSED';
  const waiting = status === 'WAITING_FOR_SPECIALIST' || status === 'PLANNED';
  const colors = terminal
    ? theme.status.confirmed
    : waiting
      ? theme.status.pending
      : theme.status.completed;

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
