import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { VisibleScrollView } from '../common/VisibleScrollView';

export interface FinanceSectionOption<T extends string> { value: T; label: string }

export function FinanceSectionNavigation<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel = 'Sección',
  trailing,
  collapseOnMobile = true,
}: {
  value: T;
  options: readonly FinanceSectionOption<T>[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  trailing?: React.ReactNode;
  collapseOnMobile?: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  if (width < 768 && collapseOnMobile) {
    return <View style={styles.mobile}><SimpleDropdown options={options} value={value} onSelect={onChange} accessibilityLabel={accessibilityLabel} presentation="portal" />{trailing}</View>;
  }
  return (
    <View style={[styles.desktop, { borderBottomColor: theme.border }]}>
      <VisibleScrollView horizontal contentContainerStyle={styles.desktopContent}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <AnimatedPressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && { borderBottomColor: theme.primary }]}
              hoverLift={false}
            >
              <Text style={[styles.label, { color: selected ? theme.primary : theme.textSecondary, fontWeight: selected ? typography.fontWeights.bold : typography.fontWeights.medium }]}>{option.label}</Text>
            </AnimatedPressable>
          );
        })}
      </VisibleScrollView>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  mobile: { gap: spacing.sm },
  desktop: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  desktopContent: { alignItems: 'center', gap: spacing.lg },
  tab: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  label: { fontSize: typography.fontSizes.sm },
});
