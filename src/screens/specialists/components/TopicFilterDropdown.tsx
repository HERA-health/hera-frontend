import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import type { FilterOption } from './FilterChips';

interface TopicFilterDropdownProps {
  filters: FilterOption[];
  selectedFilters: string[];
  onFilterChange: (selectedIds: string[]) => void;
}

const FILTER_GROUPS = [
  {
    title: 'Estado emocional',
    ids: ['ansiedad', 'depresion', 'estres', 'autoestima'],
  },
  {
    title: 'Relaciones y experiencias',
    ids: ['pareja', 'trauma'],
  },
];

export function TopicFilterDropdown({
  filters,
  selectedFilters,
  onFilterChange,
}: TopicFilterDropdownProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [open, setOpen] = useState(false);

  const filtersById = useMemo(
    () => Object.fromEntries(filters.map((filter) => [filter.id, filter])),
    [filters],
  );

  const groupedFilters = useMemo(
    () =>
      FILTER_GROUPS.map((group) => ({
        ...group,
        items: group.ids
          .map((id) => filtersById[id])
          .filter(Boolean),
      })).filter((group) => group.items.length > 0),
    [filtersById],
  );

  const selectedLabels = filters
    .filter((filter) => selectedFilters.includes(filter.id))
    .map((filter) => filter.label);

  const triggerLabel = selectedLabels.length === 0
    ? 'Todas las áreas'
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels[0]} +${selectedLabels.length - 1}`;

  const handleToggle = (filterId: string) => {
    if (selectedFilters.includes(filterId)) {
      onFilterChange(selectedFilters.filter((id) => id !== filterId));
      return;
    }

    onFilterChange([...selectedFilters, filterId]);
  };

  return (
    <>
      <AnimatedPressable
        onPress={() => setOpen(true)}
        hoverLift={false}
        pressScale={0.98}
        style={styles.trigger}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerLabel}>Motivo de consulta</Text>
          <Text style={styles.triggerValue} numberOfLines={1}>
            {triggerLabel}
          </Text>
        </View>
        {selectedFilters.length > 0 ? (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{selectedFilters.length}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
      </AnimatedPressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={() => undefined}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>Motivo de consulta</Text>
                <Text style={styles.panelSubtitle}>
                  Selecciona las áreas en las que quieres encontrar ayuda.
                </Text>
              </View>
              <AnimatedPressable
                onPress={() => setOpen(false)}
                hoverLift={false}
                pressScale={0.95}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </AnimatedPressable>
            </View>

            <AnimatedPressable
              onPress={() => onFilterChange([])}
              hoverLift={false}
              pressScale={0.98}
              style={[styles.optionRow, selectedFilters.length === 0 ? styles.optionRowActive : null]}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.checkbox, selectedFilters.length === 0 ? styles.checkboxActive : null]}>
                  {selectedFilters.length === 0 ? (
                    <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />
                  ) : null}
                </View>
                <View>
                  <Text style={styles.optionTitle}>Todas las áreas</Text>
                  <Text style={styles.optionCaption}>Sin limitar por especialidad o tipo de apoyo.</Text>
                </View>
              </View>
            </AnimatedPressable>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sections}>
              {groupedFilters.map((group) => (
                <View key={group.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{group.title}</Text>
                  <View style={styles.optionList}>
                    {group.items.map((filter) => {
                      const selected = selectedFilters.includes(filter.id);
                      return (
                        <AnimatedPressable
                          key={filter.id}
                          onPress={() => handleToggle(filter.id)}
                          hoverLift={false}
                          pressScale={0.98}
                          style={[styles.optionRow, selected ? styles.optionRowActive : null]}
                        >
                          <View style={styles.optionLeft}>
                            <View style={[styles.checkbox, selected ? styles.checkboxActive : null]}>
                              {selected ? (
                                <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />
                              ) : filter.icon ? (
                                <Ionicons name={filter.icon} size={14} color={theme.textMuted} />
                              ) : null}
                            </View>
                            <Text style={styles.optionTitle}>{filter.label}</Text>
                          </View>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.panelFooter}>
              {selectedFilters.length > 0 ? (
                <AnimatedPressable
                  onPress={() => onFilterChange([])}
                  hoverLift={false}
                  pressScale={0.98}
                  style={styles.clearAction}
                >
                  <Text style={styles.clearActionText}>Limpiar</Text>
                </AnimatedPressable>
              ) : <View />}

              <AnimatedPressable
                onPress={() => setOpen(false)}
                hoverLift={false}
                pressScale={0.98}
                style={styles.doneAction}
              >
                <Text style={styles.doneActionText}>Aplicar</Text>
              </AnimatedPressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    trigger: {
      minWidth: 220,
      maxWidth: 320,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    triggerCopy: {
      flex: 1,
      minWidth: 0,
    },
    triggerLabel: {
      fontSize: 11,
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    triggerValue: {
      fontSize: 13,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    counter: {
      minWidth: 22,
      height: 22,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    counterText: {
      fontSize: 11,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    backdrop: {
      flex: 1,
      backgroundColor: theme.overlayLight,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    panel: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '82%',
      borderRadius: 24,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: spacing.lg,
      shadowColor: theme.shadowStrong,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.28,
      shadowRadius: 36,
      elevation: 10,
    },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    panelTitle: {
      fontSize: 20,
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
    },
    panelSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      lineHeight: 19,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    sections: {
      gap: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: 12,
      color: theme.textMuted,
      fontFamily: theme.fontSansBold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    optionList: {
      gap: spacing.xs,
    },
    optionRow: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgAlt,
    },
    optionRowActive: {
      borderColor: theme.primaryMuted,
      backgroundColor: theme.primaryAlpha12,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: isDark ? theme.bgCard : theme.surface,
    },
    checkboxActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    optionTitle: {
      fontSize: 14,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    optionCaption: {
      marginTop: 3,
      fontSize: 12,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    panelFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    clearAction: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
    },
    clearActionText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
    },
    doneAction: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.primary,
    },
    doneActionText: {
      fontSize: 13,
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
  });
}

export default TopicFilterDropdown;
