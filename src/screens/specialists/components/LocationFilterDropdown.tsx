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

interface DistanceOption {
  value: number;
  label: string;
}

interface LocationFilterDropdownProps {
  enabled: boolean;
  maxDistance: number;
  distanceOptions: DistanceOption[];
  hasLocation: boolean;
  onToggleEnabled: () => void;
  onDistanceChange: (distance: number) => void;
}

export function LocationFilterDropdown({
  enabled,
  maxDistance,
  distanceOptions,
  hasLocation,
  onToggleEnabled,
  onDistanceChange,
}: LocationFilterDropdownProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [open, setOpen] = useState(false);

  const triggerValue = !hasLocation
    ? 'Añade tu ubicación'
    : enabled
      ? `Cerca de mí · ${maxDistance} km`
      : 'Sin priorizar distancia';

  return (
    <>
      <AnimatedPressable
        onPress={() => setOpen(true)}
        hoverLift={false}
        pressScale={0.98}
        style={styles.trigger}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerLabel}>Ubicación</Text>
          <Text style={styles.triggerValue} numberOfLines={1}>
            {triggerValue}
          </Text>
        </View>
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
                <Text style={styles.panelTitle}>Ubicación</Text>
                <Text style={styles.panelSubtitle}>
                  Decide si quieres priorizar especialistas cercanos y hasta qué distancia.
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

            {!hasLocation ? (
              <View style={styles.infoCard}>
                <Ionicons name="location-outline" size={18} color={theme.primary} />
                <View style={styles.infoCopy}>
                  <Text style={styles.infoTitle}>Ubicación no configurada</Text>
                  <Text style={styles.infoText}>
                    Añade tu ubicación en el perfil para poder filtrar por cercanía.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <AnimatedPressable
                  onPress={onToggleEnabled}
                  hoverLift={false}
                  pressScale={0.98}
                  style={[styles.optionRow, enabled ? styles.optionRowActive : null]}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.checkbox, enabled ? styles.checkboxActive : null]}>
                      {enabled ? (
                        <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />
                      ) : (
                        <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.optionTitle}>Mostrar especialistas cerca de mí</Text>
                      <Text style={styles.optionCaption}>Ordena y filtra los resultados por proximidad.</Text>
                    </View>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={() => {
                    if (enabled) onToggleEnabled();
                  }}
                  hoverLift={false}
                  pressScale={0.98}
                  style={[styles.optionRow, !enabled ? styles.optionRowActive : null]}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.checkbox, !enabled ? styles.checkboxActive : null]}>
                      {!enabled ? (
                        <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />
                      ) : (
                        <Ionicons name="shuffle-outline" size={14} color={theme.textMuted} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.optionTitle}>No priorizar distancia</Text>
                      <Text style={styles.optionCaption}>Muestra todo el catálogo sin limitar por ubicación.</Text>
                    </View>
                  </View>
                </AnimatedPressable>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Radio de búsqueda</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.distanceList}
                  >
                    {distanceOptions.map((option) => {
                      const selected = maxDistance === option.value;
                      return (
                        <AnimatedPressable
                          key={option.value}
                          onPress={() => onDistanceChange(option.value)}
                          hoverLift={false}
                          pressScale={0.98}
                          style={[
                            styles.distanceChip,
                            selected ? styles.distanceChipActive : null,
                            !enabled ? styles.distanceChipMuted : null,
                          ]}
                        >
                          <Text style={[styles.distanceChipText, selected ? styles.distanceChipTextActive : null]}>
                            {option.label}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}

            <View style={styles.panelFooter}>
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
    infoCard: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.primaryMuted,
      backgroundColor: theme.primaryAlpha12,
    },
    infoCopy: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 14,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      marginBottom: 4,
    },
    infoText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      lineHeight: 19,
    },
    optionRow: {
      marginBottom: spacing.sm,
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
    section: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: 12,
      color: theme.textMuted,
      fontFamily: theme.fontSansBold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    distanceList: {
      gap: spacing.xs,
      paddingBottom: 2,
    },
    distanceChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    distanceChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    distanceChipMuted: {
      opacity: 0.55,
    },
    distanceChipText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
    },
    distanceChipTextActive: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
    panelFooter: {
      alignItems: 'flex-end',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
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

export default LocationFilterDropdown;
