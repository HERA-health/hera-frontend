import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius, typography, shadows } from '../../constants/colors';

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
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={dropdownStyles.container}>
      <TouchableOpacity
        style={dropdownStyles.trigger}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
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
          color={heraLanding.textMuted}
        />
      </TouchableOpacity>
      {open && (
        <>
          <Pressable
            style={dropdownStyles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={[dropdownStyles.optionsList, { maxHeight }]}>
            <ScrollView nestedScrollEnabled bounces={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[
                    dropdownStyles.option,
                    opt.value === value && dropdownStyles.optionActive,
                  ]}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      dropdownStyles.optionText,
                      opt.value === value && dropdownStyles.optionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text style={dropdownStyles.optionSubtitle} numberOfLines={1}>
                      {opt.subtitle}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const dropdownStyles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: heraLanding.backgroundMuted,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  triggerText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
  },
  placeholderText: {
    color: heraLanding.textMuted,
  },
  subtitleText: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginTop: 2,
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
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: heraLanding.border,
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
    backgroundColor: heraLanding.primaryMuted,
  },
  optionText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
  },
  optionTextActive: {
    color: heraLanding.primaryDark,
    fontWeight: typography.fontWeights.semibold,
  },
  optionSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginTop: 2,
  },
});

export default SimpleDropdown;
