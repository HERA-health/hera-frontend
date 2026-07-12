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
  options: readonly DropdownOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  placeholder?: string;
  maxHeight?: number;
  optionsMinWidth?: number;
  optionsAlign?: 'left' | 'right';
  compact?: boolean;
  selectionIndicator?: 'none' | 'checkbox' | 'radio';
  onClear?: () => void;
  highlightSelection?: boolean;
}

export function SimpleDropdown<T extends string | number>({
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar...',
  maxHeight = 200,
  optionsMinWidth,
  optionsAlign = 'left',
  compact = false,
  selectionIndicator = 'none',
  onClear,
  highlightSelection = true,
}: SimpleDropdownProps<T>) {
  const { theme, isDark } = useTheme();
  const dropdownStyles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const selectionHighlighted = Boolean(selected && highlightSelection);

  return (
    <View style={[dropdownStyles.container, open ? dropdownStyles.containerOpen : null]}>
      <AnimatedPressable
        style={[
          dropdownStyles.trigger,
          compact && dropdownStyles.triggerCompact,
          selectionHighlighted && dropdownStyles.triggerSelected,
        ]}
        onPress={() => setOpen(!open)}
        hoverLift={false}
        pressScale={0.98}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              dropdownStyles.triggerText,
              !selected && dropdownStyles.placeholderText,
              selectionHighlighted && dropdownStyles.triggerTextSelected,
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
          color={selectionHighlighted ? theme.primary : theme.textMuted}
        />
      </AnimatedPressable>
      {open && (
        <>
          <Pressable
            style={dropdownStyles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              dropdownStyles.optionsList,
              { maxHeight, minWidth: optionsMinWidth },
              optionsAlign === 'right' ? dropdownStyles.optionsListRight : null,
            ]}
          >
            <ScrollView nestedScrollEnabled bounces={false}>
              {options.map((opt) => {
                const active = opt.value === value;
                const indicatorRole = selectionIndicator === 'checkbox'
                  ? 'checkbox'
                  : selectionIndicator === 'radio'
                    ? 'radio'
                    : 'button';

                return (
                  <AnimatedPressable
                    key={String(opt.value)}
                    style={active ? [dropdownStyles.option, dropdownStyles.optionActive] : dropdownStyles.option}
                    onPress={() => {
                      if (active && onClear) {
                        onClear();
                      } else {
                        onSelect(opt.value);
                      }
                      setOpen(false);
                    }}
                    hoverLift={false}
                    pressScale={0.98}
                    accessibilityRole={indicatorRole}
                    accessibilityLabel={opt.label}
                    accessibilityState={selectionIndicator === 'none'
                      ? { selected: active }
                      : { checked: active, selected: active }}
                  >
                    <View style={dropdownStyles.optionRow}>
                      {selectionIndicator !== 'none' ? (
                        <View
                          style={[
                            dropdownStyles.selectionIndicator,
                            selectionIndicator === 'radio' && dropdownStyles.radioIndicator,
                            {
                              backgroundColor: active && selectionIndicator === 'checkbox' ? theme.primary : 'transparent',
                              borderColor: active ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          {active && selectionIndicator === 'checkbox' ? (
                            <Ionicons name="checkmark" size={13} color={theme.actionPrimaryText} />
                          ) : null}
                          {active && selectionIndicator === 'radio' ? (
                            <View style={[dropdownStyles.radioDot, { backgroundColor: theme.primary }]} />
                          ) : null}
                        </View>
                      ) : null}
                      <View style={dropdownStyles.optionCopy}>
                        <Text
                          style={active ? [dropdownStyles.optionText, dropdownStyles.optionTextActive] : dropdownStyles.optionText}
                        >
                          {opt.label}
                        </Text>
                        {opt.subtitle ? (
                          <Text style={dropdownStyles.optionSubtitle} numberOfLines={1}>
                            {opt.subtitle}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </AnimatedPressable>
                );
              })}
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
      zIndex: 1,
      overflow: 'visible',
    },
    containerOpen: {
      zIndex: 20000,
      elevation: 20,
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
      zIndex: 20001,
      ...shadows.md,
      elevation: 10,
      ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } as Record<string, string> : {}),
    },
    triggerCompact: {
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    triggerSelected: {
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.primary,
    },
    triggerTextSelected: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    optionsListRight: {
      left: 'auto',
      right: 0,
    },
    option: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    optionCopy: {
      flex: 1,
      minWidth: 0,
    },
    selectionIndicator: {
      width: 20,
      height: 20,
      borderWidth: 1,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    radioIndicator: {
      borderRadius: 10,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
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
