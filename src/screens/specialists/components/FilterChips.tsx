import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';

export interface FilterOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface FilterChipsProps {
  filters: FilterOption[];
  selectedFilters: string[];
  onFilterChange: (selectedIds: string[]) => void;
  compact?: boolean;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
  compact = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const handleFilterPress = (filterId: string) => {
    if (filterId === 'all') {
      onFilterChange([]);
      return;
    }

    if (selectedFilters.includes(filterId)) {
      onFilterChange(selectedFilters.filter((id) => id !== filterId));
      return;
    }

    onFilterChange([...selectedFilters, filterId]);
  };

  const isAllSelected = selectedFilters.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, compact ? styles.scrollContentCompact : null]}
      >
        <FilterChip
          label="Todos"
          isSelected={isAllSelected}
          onPress={() => handleFilterPress('all')}
          compact={compact}
        />

        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            icon={filter.icon}
            isSelected={selectedFilters.includes(filter.id)}
            onPress={() => handleFilterPress(filter.id)}
            compact={compact}
          />
        ))}
      </ScrollView>
    </View>
  );
};

interface FilterChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
  compact: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  icon,
  isSelected,
  onPress,
  compact,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <AnimatedPressable
      onPress={onPress}
      hoverLift={false}
      pressScale={0.96}
      style={[
        styles.chip,
        compact ? styles.chipCompact : null,
        isSelected ? styles.chipSelected : null,
      ]}
      accessibilityLabel={`Filtrar por ${label}`}
      accessibilityRole="button"
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={isSelected ? theme.textOnPrimary : theme.textSecondary}
          style={[styles.icon, compact ? styles.iconCompact : null]}
        />
      ) : null}
      <Text style={[styles.text, compact ? styles.textCompact : null, isSelected ? styles.textSelected : null]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      minWidth: 0,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      alignItems: 'center',
    },
    scrollContentCompact: {
      paddingHorizontal: 0,
      gap: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 2,
    },
    chipCompact: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    chipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      shadowColor: theme.shadowPrimary,
    },
    icon: {
      marginRight: 6,
    },
    iconCompact: {
      marginRight: 5,
    },
    text: {
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.textSecondary,
    },
    textCompact: {
      fontSize: 12,
    },
    textSelected: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
  });
}

export default FilterChips;
