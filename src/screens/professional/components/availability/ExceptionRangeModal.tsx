import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable, Button } from '../../../../components/common';
import { borderRadius, shadows, spacing } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { AvailabilityExceptionRangeImpact } from '../../../../services/availabilityService';
import { MAX_EXCEPTION_RANGE_DAYS } from '../../utils/availabilityExceptionRanges';
import {
  AVAILABILITY_EXCEPTION_TYPES,
  type AvailabilityExceptionTypeId,
  getExceptionToneColor,
} from '../../utils/availabilityExceptionTypes';
import type { ExceptionRangeSelectionStep } from './useExceptionRangeDraft';

type CalendarMarkedDates = Record<string, {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  color?: string;
  textColor?: string;
  startingDay?: boolean;
  endingDay?: boolean;
}>;

interface ExceptionRangeModalProps {
  visible: boolean;
  rangeLabel: string;
  selectionStep: ExceptionRangeSelectionStep;
  markedDates: CalendarMarkedDates;
  calendarTheme: React.ComponentProps<typeof Calendar>['theme'];
  minDate: string;
  isTooLong: boolean;
  impact: AvailabilityExceptionRangeImpact | null;
  impactLoading: boolean;
  impactError: string | null;
  selectedTypeId: AvailabilityExceptionTypeId;
  saving: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onDayPress: (day: { dateString: string }) => void;
  onSelectType: (typeId: AvailabilityExceptionTypeId) => void;
  onSubmit: () => void;
}

export function ExceptionRangeModal({
  visible,
  rangeLabel,
  selectionStep,
  markedDates,
  calendarTheme,
  minDate,
  isTooLong,
  impact,
  impactLoading,
  impactError,
  selectedTypeId,
  saving,
  canSubmit,
  onClose,
  onDayPress,
  onSelectType,
  onSubmit,
}: ExceptionRangeModalProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [isDark, theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bloquear periodo</Text>
            <AnimatedPressable onPress={onClose} style={styles.modalCloseButton} hoverLift={false}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalRangeSummary}>
              <View style={[styles.iconShell, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="calendar-number-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.modalRangeSummaryText}>
                <Text style={styles.modalRangeTitle}>{rangeLabel}</Text>
                <Text style={styles.modalRangeHint}>
                  {selectionStep === 'end'
                    ? 'Selecciona el final del periodo o bloquea solo este día.'
                    : 'Periodo preparado para bloquear.'}
                </Text>
              </View>
            </View>
            <View style={styles.modalCalendar}>
              <Calendar
                onDayPress={onDayPress}
                markedDates={markedDates}
                markingType="period"
                minDate={minDate}
                theme={calendarTheme}
              />
            </View>
            {isTooLong ? (
              <View style={styles.modalWarning}>
                <Ionicons name="warning-outline" size={17} color={theme.warning} />
                <Text style={styles.modalWarningText}>
                  El periodo no puede superar {MAX_EXCEPTION_RANGE_DAYS} días.
                </Text>
              </View>
            ) : null}
            {impactLoading ? (
              <View style={styles.modalInfo}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.modalInfoText}>Comprobando sesiones activas...</Text>
              </View>
            ) : null}
            {!impactLoading && impact?.activeSessionCount ? (
              <View style={styles.modalWarning}>
                <Ionicons name="alert-circle-outline" size={17} color={theme.warning} />
                <Text style={styles.modalWarningText}>
                  Hay {impact.activeSessionCount} sesiones activas en este periodo. Se mantienen programadas.
                </Text>
              </View>
            ) : null}
            {!impactLoading && impactError ? (
              <View style={styles.modalWarning}>
                <Ionicons name="information-circle-outline" size={17} color={theme.warning} />
                <Text style={styles.modalWarningText}>{impactError}</Text>
              </View>
            ) : null}
            <Text style={styles.modalLabel}>Tipo de ausencia</Text>
            <View style={styles.exTypeGrid}>
              {AVAILABILITY_EXCEPTION_TYPES.map((type) => {
                const typeColor = getExceptionToneColor(theme, type);
                const isSelected = selectedTypeId === type.id;

                return (
                  <AnimatedPressable
                    key={type.id}
                    style={isSelected
                      ? [styles.exTypeBtn, { backgroundColor: `${typeColor}20`, borderColor: typeColor }]
                      : styles.exTypeBtn}
                    onPress={() => onSelectType(type.id)}
                    hoverLift={false}
                  >
                    <Ionicons
                      name={type.icon}
                      size={18}
                      color={isSelected ? typeColor : theme.textSecondary}
                    />
                    <Text style={[styles.exTypeBtnText, isSelected && { color: typeColor }]}>
                      {type.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.modalActionWrap}>
            <Button
              variant="primary"
              size="large"
              onPress={onSubmit}
              disabled={!canSubmit}
              loading={saving}
              fullWidth
            >
              Bloquear periodo
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    fontFamily: theme.fontHeading,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flexShrink: 1,
  },
  modalBodyContent: {
    paddingBottom: spacing.sm,
  },
  modalRangeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
  },
  iconShell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRangeSummaryText: {
    flex: 1,
    gap: 2,
  },
  modalRangeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
  },
  modalRangeHint: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
  },
  modalCalendar: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgElevated,
  },
  modalLabel: {
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
  },
  exTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.primaryAlpha12,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.warning,
    backgroundColor: theme.warningBg,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
  },
  modalActionWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  exTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
  },
  exTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    fontFamily: theme.fontSansSemiBold,
  },
});
