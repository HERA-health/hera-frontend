/**
 * TimeSlotsColumn
 * Calendly-style time slot selection list
 * Part of the 4-column Calendly-style booking layout
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { branding, colors, spacing, borderRadius, shadows } from '../../../constants/colors';
import { TimeSlot } from '../../../services/sessionsService';

interface TimeSlotsColumnProps {
  selectedDate: string | null;
  availableSlots: TimeSlot[];
  selectedTime: string | null;
  onTimeSelect: (slot: TimeSlot) => void;
  loading?: boolean;
}

const EmptyState = ({ icon, message, submessage }: { icon: string; message: string; submessage?: string }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {submessage && <Text style={styles.emptySubmessage}>{submessage}</Text>}
  </View>
);

const TimeSlotButton = ({
  slot,
  isSelected,
  onPress,
}: {
  slot: TimeSlot;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.slotButton, isSelected && styles.slotButtonSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.slotButtonText, isSelected && styles.slotButtonTextSelected]}>
      {slot.startTime}
    </Text>
    {isSelected && (
      <Ionicons name="checkmark" size={18} color={branding.cardBackground} />
    )}
  </TouchableOpacity>
);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export const TimeSlotsColumn: React.FC<TimeSlotsColumnProps> = ({
  selectedDate,
  availableSlots,
  selectedTime,
  onTimeSelect,
  loading = false,
}) => {
  // No date selected yet
  if (!selectedDate) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Horarios disponibles</Text>
        </View>
        <EmptyState
          icon="📅"
          message="Selecciona una fecha"
          submessage="Elige una fecha en el calendario para ver los horarios disponibles"
        />
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Horarios disponibles</Text>
          <Text style={styles.dateSubtitle}>{formatDate(selectedDate)}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={branding.primary} />
          <Text style={styles.loadingText}>Cargando horarios...</Text>
        </View>
      </View>
    );
  }

  // No slots available for selected date
  if (availableSlots.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Horarios disponibles</Text>
          <Text style={styles.dateSubtitle}>{formatDate(selectedDate)}</Text>
        </View>
        <EmptyState
          icon="😔"
          message="No hay horarios disponibles"
          submessage="Selecciona otra fecha para ver más opciones"
        />
      </View>
    );
  }

  // Group slots by morning/afternoon/evening
  const morningSlots = availableSlots.filter(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour < 12;
  });
  const afternoonSlots = availableSlots.filter(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour >= 12 && hour < 18;
  });
  const eveningSlots = availableSlots.filter(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour >= 18;
  });

  const renderSlotGroup = (title: string, slots: TimeSlot[], icon: string) => {
    if (slots.length === 0) return null;
    return (
      <View style={styles.slotGroup}>
        <View style={styles.slotGroupHeader}>
          <Text style={styles.slotGroupIcon}>{icon}</Text>
          <Text style={styles.slotGroupTitle}>{title}</Text>
          <Text style={styles.slotGroupCount}>{slots.length}</Text>
        </View>
        <View style={styles.slotsGrid}>
          {slots.map((slot, index) => (
            <TimeSlotButton
              key={`${slot.startTime}-${index}`}
              slot={slot}
              isSelected={selectedTime === slot.startTime}
              onPress={() => onTimeSelect(slot)}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Horarios disponibles</Text>
        <Text style={styles.dateSubtitle}>{formatDate(selectedDate)}</Text>
        <View style={styles.availabilityBadge}>
          <Ionicons name="time-outline" size={14} color={branding.primary} />
          <Text style={styles.availabilityText}>
            {availableSlots.length} {availableSlots.length === 1 ? 'horario' : 'horarios'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {renderSlotGroup('Mañana', morningSlots, '🌅')}
        {renderSlotGroup('Tarde', afternoonSlots, '☀️')}
        {renderSlotGroup('Noche', eveningSlots, '🌙')}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
    maxHeight: '100%', // CRITICAL: Don't exceed parent height
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    overflow: 'hidden',
    // CRITICAL: Ensure container respects parent height for internal scroll
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    flexShrink: 0, // CRITICAL: Header doesn't shrink
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.xs,
  },
  dateSubtitle: {
    fontSize: 14,
    color: branding.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${branding.primary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: branding.primary,
  },
  scrollView: {
    flex: 1,
    // CRITICAL: This takes remaining space after header and scrolls internally
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg, // Extra padding at bottom for better UX
  },
  slotGroup: {
    marginBottom: spacing.lg,
  },
  slotGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  slotGroupIcon: {
    fontSize: 14,
  },
  slotGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: branding.textSecondary,
    flex: 1,
  },
  slotGroupCount: {
    fontSize: 12,
    color: branding.textLight,
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  slotsGrid: {
    gap: spacing.sm,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  slotButtonSelected: {
    backgroundColor: branding.primary,
    borderColor: branding.primaryDark,
  },
  slotButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: branding.text,
  },
  slotButtonTextSelected: {
    color: branding.cardBackground,
  },
  // Empty & Loading States
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubmessage: {
    fontSize: 14,
    color: branding.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: branding.textSecondary,
  },
});

export default TimeSlotsColumn;
