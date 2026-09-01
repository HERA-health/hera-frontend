import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { normalizeSingleLine } from '../../utils/financialFormValidation';

export function ValidatedTextArea({
  label,
  value,
  onChangeText,
  maxLength = 500,
  minLength = 0,
  placeholder,
  error,
  singleLine = false,
  privacyWarning = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  error?: string;
  singleLine?: boolean;
  privacyWarning?: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const normalizedError = error ?? (value.trim().length > 0 && value.trim().length < minLength ? `Escribe al menos ${minLength} caracteres.` : undefined);
  return (
    <View style={styles.root}>
      <View style={styles.labelRow}><Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text><Text style={[styles.counter, { color: theme.textMuted }]}>{value.length}/{maxLength}</Text></View>
      <TextInput
        value={value}
        onChangeText={(next) => onChangeText(singleLine ? normalizeSingleLine(next, maxLength) : next.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLength))}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={!singleLine}
        maxLength={maxLength}
        accessibilityLabel={label}
        accessibilityHint={normalizedError}
        style={[styles.input, singleLine && styles.singleLine, { color: theme.textPrimary, borderColor: normalizedError ? theme.error : theme.border, backgroundColor: theme.bgCard }]}
      />
      {normalizedError ? <Text style={[styles.helper, { color: theme.error }]}>{normalizedError}</Text> : privacyWarning ? <Text style={[styles.helper, { color: theme.textMuted }]}>No incluyas nombres, información clínica ni datos de pacientes.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold },
  counter: { fontSize: 11 },
  input: { minHeight: 96, padding: spacing.md, borderWidth: 1, borderRadius: borderRadius.md, fontSize: typography.fontSizes.sm, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  singleLine: { minHeight: 46, maxHeight: 46, textAlignVertical: 'center' },
  helper: { fontSize: 11, lineHeight: 16 },
});
