/**
 * ProfessionalInfoColumn
 * Displays specialist information, session type selector, and dynamic booking summary
 * Part of the 4-column Calendly-style booking layout
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { branding, heraLanding, colors, spacing, borderRadius, shadows } from '../../../constants/colors';
import { SessionType } from '../../../services/sessionsService';

interface SpecialistInfo {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  pricePerSession: number;
  specializations?: string[];
  sessionDuration?: number;
}

interface BookingState {
  selectedDate: string | null;
  selectedTime: string | null;
  sessionType: SessionType;
}

interface ProfessionalInfoColumnProps {
  specialist: SpecialistInfo;
  booking: BookingState;
  onConfirm: () => void;
  onSessionTypeChange: (type: SessionType) => void;
  loading?: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

// Session Type Selector Component
const SessionTypeSelector = ({
  selectedType,
  onTypeChange,
}: {
  selectedType: SessionType;
  onTypeChange: (type: SessionType) => void;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Tipo de sesion</Text>
    <View style={styles.typeButtons}>
      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === 'VIDEO_CALL' && styles.typeButtonSelected,
        ]}
        onPress={() => onTypeChange('VIDEO_CALL')}
        activeOpacity={0.7}
      >
        <Text style={styles.typeButtonIcon}>📹</Text>
        <Text
          style={[
            styles.typeButtonText,
            selectedType === 'VIDEO_CALL' && styles.typeButtonTextSelected,
          ]}
        >
          Videollamada
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === 'IN_PERSON' && styles.typeButtonSelected,
        ]}
        onPress={() => onTypeChange('IN_PERSON')}
        activeOpacity={0.7}
      >
        <Text style={styles.typeButtonIcon}>🏢</Text>
        <Text
          style={[
            styles.typeButtonText,
            selectedType === 'IN_PERSON' && styles.typeButtonTextSelected,
          ]}
        >
          Presencial
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const ProfessionalInfoColumn: React.FC<ProfessionalInfoColumnProps> = ({
  specialist,
  booking,
  onConfirm,
  onSessionTypeChange,
  loading = false,
}) => {
  const isComplete = booking.selectedDate && booking.selectedTime;
  const { name, title, avatar, pricePerSession, specializations, sessionDuration = 60 } = specialist;
  const isVideoCall = booking.sessionType === 'VIDEO_CALL';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Avatar + Name */}
        <View style={styles.section}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{name[0]}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{name}</Text>
          {title && <Text style={styles.title}>{title}</Text>}
        </View>

        {/* Section 2: Session Details */}
        <View style={styles.section}>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>💶</Text>
              <Text style={styles.detailValue}>€{pricePerSession}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏱️</Text>
              <Text style={styles.detailValue}>{sessionDuration}min</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Session Type Selector */}
        <SessionTypeSelector
          selectedType={booking.sessionType}
          onTypeChange={onSessionTypeChange}
        />

        {/* Section 4: Specializations */}
        {specializations && specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especialidades</Text>
            <View style={styles.specializationsContainer}>
              {specializations.slice(0, 3).map((spec, index) => (
                <View key={index} style={styles.specializationTag}>
                  <Text style={styles.specializationText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 5: Session Info - Dynamic based on type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="globe-outline" size={14} color={heraLanding.textSecondary} />
              <Text style={styles.infoText}>Zona horaria: Madrid (CET)</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="refresh-outline" size={14} color={heraLanding.textSecondary} />
              <Text style={styles.infoText}>Cancelacion gratis 24h antes</Text>
            </View>
            {isVideoCall ? (
              <View style={styles.infoItem}>
                <Ionicons name="lock-closed-outline" size={14} color={heraLanding.textSecondary} />
                <Text style={styles.infoText}>Videollamada privada y segura</Text>
              </View>
            ) : (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color={heraLanding.textSecondary} />
                <Text style={styles.infoText}>En la consulta del profesional</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 6: Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumen</Text>

          <View style={styles.summaryGrid}>
            {/* Date */}
            <View style={styles.summaryItem}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={booking.selectedDate ? heraLanding.primary : heraLanding.textMuted}
              />
              <Text
                style={[styles.summaryValue, !booking.selectedDate && styles.summaryPlaceholder]}
              >
                {booking.selectedDate ? formatDate(booking.selectedDate) : 'Fecha'}
              </Text>
            </View>

            {/* Time */}
            <View style={styles.summaryItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color={booking.selectedTime ? heraLanding.primary : heraLanding.textMuted}
              />
              <Text
                style={[styles.summaryValue, !booking.selectedTime && styles.summaryPlaceholder]}
              >
                {booking.selectedTime || 'Hora'}
              </Text>
            </View>

            {/* Session Type */}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTypeIcon}>{isVideoCall ? '📹' : '🏢'}</Text>
              <Text style={styles.summaryValue}>
                {isVideoCall ? 'Video' : 'Presencial'}
              </Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>€{pricePerSession}</Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, !isComplete && styles.confirmButtonDisabled]}
            onPress={onConfirm}
            disabled={!isComplete || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={isComplete ? heraLanding.textOnPrimary : heraLanding.textMuted}
                />
                <Text
                  style={[styles.confirmButtonText, !isComplete && styles.confirmButtonTextDisabled]}
                >
                  Confirmar Reserva
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    flex: 1,
    maxHeight: '100%',
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {},
  // Avatar Section
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: heraLanding.background,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${heraLanding.primary}20`,
    borderWidth: 3,
    borderColor: heraLanding.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: heraLanding.primary,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },
  // Details Row
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: heraLanding.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  detailItem: {
    alignItems: 'center',
    gap: 2,
  },
  detailIcon: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  // Section Title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Session Type Selector
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.background,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  typeButtonSelected: {
    backgroundColor: `${heraLanding.primary}15`,
    borderColor: heraLanding.primary,
  },
  typeButtonIcon: {
    fontSize: 14,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  typeButtonTextSelected: {
    color: heraLanding.textPrimary,
    fontWeight: '600',
  },
  // Specializations
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specializationTag: {
    backgroundColor: `${heraLanding.primary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  specializationText: {
    fontSize: 11,
    color: heraLanding.primary,
    fontWeight: '500',
  },
  // Info List
  infoList: {
    gap: spacing.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
  },
  // Summary Section
  summarySection: {
    backgroundColor: heraLanding.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryTypeIcon: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    textTransform: 'capitalize',
  },
  summaryPlaceholder: {
    color: heraLanding.textMuted,
    fontWeight: '400',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    height: 48,
    gap: spacing.xs,
  },
  confirmButtonDisabled: {
    backgroundColor: heraLanding.disabled,
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  confirmButtonTextDisabled: {
    color: heraLanding.textMuted,
  },
});

export default ProfessionalInfoColumn;
