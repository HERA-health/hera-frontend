import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

export interface FinanceSummaryItem {
  key: string;
  label: string;
  value: string | number;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export function FinanceSummaryStrip({ items, loading = false }: { items: FinanceSummaryItem[]; loading?: boolean }): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 768;

  return (
    <View style={[styles.root, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
      {items.map((item, index) => {
        const valueColor = item.tone === 'danger'
          ? theme.error
          : item.tone === 'warning'
            ? theme.warning
            : item.tone === 'success'
              ? theme.success
              : theme.textPrimary;
        return (
          <View
            key={item.key}
            style={[
              styles.item,
              compact && styles.itemCompact,
              index > 0 && !compact ? { borderLeftColor: theme.border, borderLeftWidth: 1 } : null,
            ]}
          >
            {loading ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.value, { color: valueColor }]}>{item.value}</Text>}
            <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={2}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', borderWidth: 1, borderRadius: borderRadius.lg },
  item: { flex: 1, minWidth: 110, minHeight: 72, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  itemCompact: { flexBasis: '50%', borderBottomWidth: 1 },
  value: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold },
  label: { marginTop: 2, fontSize: 11, lineHeight: 15 },
});
