import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';

export function DirectoryPagination({ page, totalPages, compact, busy, onChange }: {
  page: number; totalPages: number; compact: boolean; busy: boolean; onChange: (page: number) => void;
}) {
  const { theme } = useTheme();
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const text = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13 };
  const control = (next: number, label: string, icon: 'chevron-back' | 'chevron-forward', disabled: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy} onPress={() => onChange(next)}
      style={[styles.control, { opacity: disabled || busy ? 0.45 : 1, borderColor: theme.border }]}>
      {icon === 'chevron-back' && <Ionicons name={icon} size={16} color={theme.textPrimary} />}
      <Text style={text}>{label}</Text>
      {icon === 'chevron-forward' && <Ionicons name={icon} size={16} color={theme.textPrimary} />}
    </Pressable>
  );
  return (
    <View style={styles.pagination} accessibilityLabel="Paginación del directorio">
      {control(page - 1, 'Anterior', 'chevron-back', page === 1)}
      {compact ? <Text style={text}>{page} / {totalPages}</Text> : (
        <View style={styles.numbers}>
          {pages.map((value, index) => <React.Fragment key={value}>
            {index > 0 && value - pages[index - 1] > 1 ? <Text style={[text, styles.ellipsis]}>…</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`Página ${value}`}
              accessibilityState={{ selected: value === page, disabled: busy }} disabled={busy}
              onPress={() => { if (value !== page) onChange(value); }}
              style={[styles.number, { backgroundColor: value === page ? theme.actionPrimary : 'transparent' }]}>
              <Text style={[text, value === page && { color: theme.actionPrimaryText }]}>{value}</Text>
            </Pressable>
          </React.Fragment>)}
        </View>
      )}
      {control(page + 1, 'Siguiente', 'chevron-forward', page === totalPages)}
    </View>
  );
}

const styles = StyleSheet.create({
  pagination: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 },
  control: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  numbers: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  number: { minWidth: 44, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ellipsis: { paddingHorizontal: 5 },
});
