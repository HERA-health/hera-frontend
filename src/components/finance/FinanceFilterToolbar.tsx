import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';

interface FinanceFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  children: React.ReactNode;
  hasActiveFilters: boolean;
  onClear: () => void;
}

export function FinanceFilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  hasActiveFilters,
  onClear,
}: FinanceFilterToolbarProps): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 768;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={[styles.search, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={searchPlaceholder}
          maxLength={120}
          style={[styles.searchInput, { color: theme.textPrimary, fontFamily: theme.fontSans }]}
        />
      </View>
      <View style={[styles.filters, compact && styles.filtersCompact]}>{children}</View>
      {hasActiveFilters ? (
        <Button variant="ghost" size="small" onPress={onClear}>Limpiar filtros</Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  rootCompact: { alignItems: 'stretch', flexDirection: 'column' },
  search: { flex: 1, minWidth: 220, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: borderRadius.lg },
  searchInput: { flex: 1, minHeight: 42, fontSize: typography.fontSizes.sm, outlineStyle: 'none' } as never,
  filters: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filtersCompact: { flexWrap: 'wrap' },
});
