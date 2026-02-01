/**
 * BookingSidebar - Sticky sidebar with booking info, map, and schedule
 * Two-column layout: Right column
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookingSidebarProps, Schedule, Address } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';
import { LocationMapPreview } from '../../../components/location';

// ============== SUB-COMPONENTS ==============

interface InfoRowProps {
  icon: string;
  text: string;
  highlight?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, text, highlight }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={[styles.infoText, highlight && styles.infoTextHighlight]}>
      {text}
    </Text>
  </View>
);

const Divider: React.FC = () => <View style={styles.divider} />;

interface LocationSectionProps {
  address?: Address;
}

const LocationSection: React.FC<LocationSectionProps> = ({ address }) => {
  // Check if we have valid coordinates
  const hasCoordinates = !!(address?.latitude && address?.longitude);

  return (
    <View style={styles.mapSection}>
      <Text style={styles.sectionLabel}>📍 UBICACIÓN</Text>

      {hasCoordinates ? (
        // Show interactive map when we have coordinates
        <View style={styles.mapWrapper}>
          <LocationMapPreview
            lat={address!.latitude!}
            lng={address!.longitude!}
            address={address!.street}
            city={address!.city}
            height={200}
            showDirectionsButton
          />
        </View>
      ) : address ? (
        // Show address text only when no coordinates - with helpful message
        <View style={styles.addressOnlyContainer}>
          <View style={styles.addressIconContainer}>
            <Ionicons name="location" size={24} color={heraLanding.primary} />
          </View>
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressStreet}>{address.street}</Text>
            <Text style={styles.addressCity}>
              {address.postalCode} {address.city}
            </Text>
            <Text style={styles.noMapHint}>
              El mapa estará disponible cuando el especialista actualice su dirección
            </Text>
          </View>
        </View>
      ) : (
        // No address available
        <View style={styles.noAddressContainer}>
          <Ionicons name="location-outline" size={32} color={heraLanding.textMuted} />
          <Text style={styles.noAddressText}>Dirección no disponible</Text>
        </View>
      )}
    </View>
  );
};

interface ScheduleDisplayProps {
  schedule?: Schedule;
}

const formatScheduleRows = (schedule: Schedule): { label: string; hours: string }[] => {
  const rows: { label: string; hours: string }[] = [];

  // Check if weekdays have same hours
  const weekdays = [schedule.monday, schedule.tuesday, schedule.wednesday, schedule.thursday, schedule.friday];
  const weekdayHours = weekdays.filter(d => d?.available).map(d => `${d?.start}-${d?.end}`);
  const allWeekdaysSame = weekdayHours.length > 0 && weekdayHours.every(h => h === weekdayHours[0]);

  if (allWeekdaysSame && weekdays[0]?.available) {
    rows.push({ label: 'L-V', hours: `${weekdays[0].start}-${weekdays[0].end}` });
  } else {
    if (schedule.monday?.available) rows.push({ label: 'Lun', hours: `${schedule.monday.start}-${schedule.monday.end}` });
    if (schedule.tuesday?.available) rows.push({ label: 'Mar', hours: `${schedule.tuesday.start}-${schedule.tuesday.end}` });
    if (schedule.wednesday?.available) rows.push({ label: 'Mié', hours: `${schedule.wednesday.start}-${schedule.wednesday.end}` });
    if (schedule.thursday?.available) rows.push({ label: 'Jue', hours: `${schedule.thursday.start}-${schedule.thursday.end}` });
    if (schedule.friday?.available) rows.push({ label: 'Vie', hours: `${schedule.friday.start}-${schedule.friday.end}` });
  }

  if (schedule.saturday?.available) {
    rows.push({ label: 'Sáb', hours: `${schedule.saturday.start}-${schedule.saturday.end}` });
  } else {
    rows.push({ label: 'Sáb', hours: 'Cerrado' });
  }

  if (schedule.sunday?.available) {
    rows.push({ label: 'Dom', hours: `${schedule.sunday.start}-${schedule.sunday.end}` });
  } else {
    rows.push({ label: 'Dom', hours: 'Cerrado' });
  }

  return rows;
};

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule }) => {
  if (!schedule) return null;

  const rows = formatScheduleRows(schedule);

  return (
    <View style={styles.scheduleSection}>
      <Text style={styles.sectionLabel}>🕐 HORARIOS</Text>
      {rows.map((row, index) => (
        <View key={index} style={styles.scheduleRow}>
          <Text style={styles.scheduleLabel}>{row.label}</Text>
          <Text style={[
            styles.scheduleHours,
            row.hours === 'Cerrado' && styles.scheduleClosed
          ]}>
            {row.hours}
          </Text>
        </View>
      ))}
    </View>
  );
};

// ============== MAIN COMPONENT ==============

export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  specialist,
  onBookPress,
}) => {
  const getModalityText = () => {
    const types = specialist.sessionTypes || [];
    const parts: string[] = [];
    if (types.includes('VIDEO_CALL')) parts.push('Videollamada');
    if (types.includes('IN_PERSON')) parts.push('Presencial');
    if (types.includes('PHONE_CALL')) parts.push('Teléfono');
    return parts.length > 0 ? parts.join(' / ') : 'Online';
  };

  const getAvailabilityText = () => {
    if (specialist.isAvailableToday) return 'Disponible hoy';
    if (specialist.nextAvailable) return specialist.nextAvailable;
    return 'Consultar disponibilidad';
  };

  // Show location if specialist offers in-person sessions (check both flags)
  const showLocationSection = specialist.offersInPerson === true || specialist.sessionTypes?.includes('IN_PERSON');

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {specialist.avatar ? (
          <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{specialist.name[0]}</Text>
          </View>
        )}
        {specialist.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      {/* Name & Title */}
      <Text style={styles.name}>{specialist.name}</Text>
      <Text style={styles.title}>{specialist.title}</Text>

      {/* Rating */}
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={14} color="#FFB800" />
        <Text style={styles.ratingText}>
          {specialist.rating.toFixed(1)} ({specialist.reviewCount})
        </Text>
      </View>

      <Divider />

      {/* Quick Info */}
      <View style={styles.quickInfo}>
        <InfoRow icon="💶" text={`${specialist.pricePerSession}€/sesión`} />
        <InfoRow icon="📹" text={getModalityText()} />
        <InfoRow
          icon="📅"
          text={getAvailabilityText()}
          highlight={specialist.isAvailableToday}
        />
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onBookPress}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Reservar sesión</Text>
      </TouchableOpacity>

      {/* Location Section (only for in-person) */}
      {showLocationSection && (
        <>
          <Divider />
          <LocationSection address={specialist.address} />
        </>
      )}

      {/* Schedule Section */}
      {specialist.schedule && (
        <>
          <Divider />
          <ScheduleDisplay schedule={specialist.schedule} />
        </>
      )}
    </View>
  );
};

// ============== STYLES ==============

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.md,
  },

  // Avatar
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: heraLanding.background,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: heraLanding.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: heraLanding.background,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: heraLanding.success,
    borderWidth: 3,
    borderColor: heraLanding.cardBg,
  },

  // Name & Title
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // Rating
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  ratingText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: heraLanding.border,
    marginVertical: spacing.md,
  },

  // Quick Info
  quickInfo: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: heraLanding.textPrimary,
  },
  infoTextHighlight: {
    color: heraLanding.success,
    fontWeight: '500',
  },

  // CTA Button
  ctaButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  ctaText: {
    color: heraLanding.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  // Map Section
  mapSection: {
    marginTop: spacing.xs,
  },
  mapWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  // Address only (no map)
  addressOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: heraLanding.background,
    borderRadius: borderRadius.md,
  },
  addressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${heraLanding.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTextContainer: {
    flex: 1,
  },
  addressStreet: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  addressCity: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  noMapHint: {
    fontSize: 11,
    color: heraLanding.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  // No address
  noAddressContainer: {
    padding: spacing.xl,
    backgroundColor: heraLanding.background,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  noAddressText: {
    fontSize: 13,
    color: heraLanding.textMuted,
  },

  // Schedule Section
  scheduleSection: {
    marginTop: spacing.xs,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scheduleLabel: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  scheduleHours: {
    fontSize: 13,
    color: heraLanding.textPrimary,
  },
  scheduleClosed: {
    color: heraLanding.textMuted,
  },
});

export default BookingSidebar;
