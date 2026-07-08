import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  ReviewAuthorDisplayMode,
  ReviewAuthorNameOption,
} from '../../services/reviewsService';

interface AuthorDisplaySelectorProps {
  options: ReviewAuthorNameOption[];
  selectedMode: ReviewAuthorDisplayMode | null;
  onSelect: (mode: ReviewAuthorDisplayMode) => void;
  disabled?: boolean;
}

const EMPTY_OPTIONS: ReviewAuthorNameOption[] = [
  { mode: 'ANONYMOUS', label: 'Paciente HERA' },
];

export const AuthorDisplaySelector: React.FC<AuthorDisplaySelectorProps> = ({
  options,
  selectedMode,
  onSelect,
  disabled = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const visibleOptions = options.length > 0 ? options : EMPTY_OPTIONS;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
        <Text style={styles.label}>Nombre visible</Text>
      </View>
      <View style={styles.options}>
        {visibleOptions.map((option) => {
          const isSelected = selectedMode === option.mode;

          return (
            <AnimatedPressable
              key={option.mode}
              onPress={() => onSelect(option.mode)}
              disabled={disabled}
              hoverLift={!disabled}
              pressScale={disabled ? 1 : 0.98}
              style={[
                styles.option,
                isSelected ? styles.optionSelected : null,
                disabled ? styles.optionDisabled : null,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
            >
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={isSelected ? theme.primary : theme.textMuted}
              />
              <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
      <Text style={styles.helpText}>
        Aparecerá junto a tu opinión. Puedes elegir una versión abreviada o anónima.
      </Text>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: typography.fontSizes.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: isDark ? theme.bgElevated : theme.bgMuted,
  },
  optionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryAlpha12,
  },
  optionDisabled: {
    opacity: 0.64,
  },
  optionText: {
    color: theme.textSecondary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: typography.fontSizes.sm,
    lineHeight: 18,
  },
  optionTextSelected: {
    color: theme.textPrimary,
  },
  helpText: {
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
});

export default AuthorDisplaySelector;
