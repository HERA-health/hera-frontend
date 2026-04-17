import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

export interface DropdownOption<T> {
  label: string;
  value: T;
  subtitle?: string;
}

export interface SimpleDropdownProps<T> {
  options: DropdownOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  placeholder?: string;
  maxHeight?: number;
}

export function SimpleDropdown<T extends string | number>({
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar...',
  maxHeight = 200,
}: SimpleDropdownProps<T>) {
  const { theme, isDark } = useTheme();
  const dropdownStyles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={dropdownStyles.container}>
      <AnimatedPressable
        style={dropdownStyles.trigger}
        onPress={() => setOpen(!open)}
        hoverLift={false}
        pressScale={0.98}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              dropdownStyles.triggerText,
              !selected && dropdownStyles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder}
          </Text>
          {selected?.subtitle && (
            <Text style={dropdownStyles.subtitleText} numberOfLines={1}>
              {selected.subtitle}
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textMuted}
        />
      </AnimatedPressable>
      {open && (
        <>
          <Pressable
            style={dropdownStyles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={[dropdownStyles.optionsList, { maxHeight }]}>
            <ScrollView nestedScrollEnabled bounces={false}>
              {options.map((opt) => (
                <AnimatedPressable
                  key={String(opt.value)}
                  style={opt.value === value ? [dropdownStyles.option, dropdownStyles.optionActive] : dropdownStyles.option}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  hoverLift={false}
                  pressScale={0.98}
                >
                  <Text
                    style={opt.value === value ? [dropdownStyles.optionText, dropdownStyles.optionTextActive] : dropdownStyles.optionText}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text style={dropdownStyles.optionSubtitle} numberOfLines={1}>
                      {opt.subtitle}
                    </Text>
                  )}
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 1000,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 48,
    },
    triggerText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    placeholderText: {
      color: theme.textMuted,
    },
    subtitleText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      marginTop: 2,
      fontFamily: theme.fontSans,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: -1000,
      right: -1000,
      bottom: -1000,
      zIndex: 999,
    },
    optionsList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      marginTop: spacing.xs,
      zIndex: 9999,
      ...shadows.md,
      elevation: 10,
      ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } as Record<string, string> : {}),
    },
    option: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionActive: {
      backgroundColor: theme.primaryAlpha12,
    },
    optionText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    optionTextActive: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    optionSubtitle: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      marginTop: 2,
      fontFamily: theme.fontSans,
    },
  });
}

export default SimpleDropdown;
