/**
 * FilterChips Component
 * Horizontal scrollable filter pills/chips
 * Supports multiple selection with "Todos" as reset option
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing } from '../../../constants/colors';

export interface FilterOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface FilterChipsProps {
  filters: FilterOption[];
  selectedFilters: string[];
  onFilterChange: (selectedIds: string[]) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
}) => {
  const handleFilterPress = (filterId: string) => {
    if (filterId === 'all') {
      // "Todos" clears all filters
      onFilterChange([]);
    } else {
      // Toggle filter
      if (selectedFilters.includes(filterId)) {
        onFilterChange(selectedFilters.filter((id) => id !== filterId));
      } else {
        onFilterChange([...selectedFilters, filterId]);
      }
    }
  };

  const isAllSelected = selectedFilters.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "Todos" chip - always first */}
        <FilterChip
          label="Todos"
          isSelected={isAllSelected}
          onPress={() => handleFilterPress('all')}
        />

        {/* Filter chips */}
        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            icon={filter.icon}
            isSelected={selectedFilters.includes(filter.id)}
            onPress={() => handleFilterPress(filter.id)}
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
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  icon,
  isSelected,
  onPress,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`Filtrar por ${label}, ${isSelected ? 'seleccionado' : 'no seleccionado'}`}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={isSelected ? '#FFFFFF' : heraLanding.textSecondary}
            style={styles.chipIcon}
          />
        )}
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  chipSelected: {
    backgroundColor: heraLanding.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default FilterChips;
