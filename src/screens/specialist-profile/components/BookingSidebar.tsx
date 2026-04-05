/**
 * BookingSidebar - Single card sidebar
 * Gradient price header · availability · modality · CTAs · location + map
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BookingSidebarProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';
import { LocationMapPreview } from '../../../components/location';


const STRINGS = {
  perSession:        '/sesión',
  nextAvailability:  'Próxima disponibilidad',
  videoCall:         'Videollamada disponible',
  inPerson:          'Consulta presencial',
  bookSession:       'Reservar sesión',
  locationLabel:     'UBICACIÓN DE CONSULTA',
  howToGet:          'Cómo llegar',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

const SectionDivider: React.FC = () => <View style={styles.sectionDivider} />;

// ─── Component ────────────────────────────────────────────────────────────────

export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  specialist,
  onBookPress,
  gradientColors,
}) => {
  const [mapLinkHovered,   setMapLinkHovered]   = useState(false);

  const offersOnline    = specialist.offersOnline   ?? true;
  const offersInPerson  = specialist.offersInPerson ?? false;
  const address         = specialist.address;
  const showLocation    = offersInPerson && !!address;
  const hasCoordinates  = !!(address?.latitude && address?.longitude);

  const slotDuration = specialist.slotDuration ?? 60;
  const sessionDurationText = `Sesión de ${slotDuration} minutos`;

  const nextAvailableDate = specialist.nextAvailable ? new Date(specialist.nextAvailable) : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const daysUntilAvailable = nextAvailableDate
    ? Math.floor((nextAvailableDate.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const availabilityText = nextAvailableDate === null
    ? 'Consulta disponibilidad'
    : daysUntilAvailable !== null && daysUntilAvailable <= 7
      ? 'Disponible esta semana'
      : 'Próxima cita: ' + nextAvailableDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

  // Web-only hover props helper
  const webHover = (
    onEnter: () => void,
    onLeave: () => void,
  ): Record<string, unknown> => {
    if (Platform.OS !== 'web') return {};
    return { onMouseEnter: onEnter, onMouseLeave: onLeave };
  };

  const handleOpenDirections = async () => {
    if (!address) return;
    let url: string;
    if (hasCoordinates) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`;
    } else {
      const dest = encodeURIComponent(`${address.street}, ${address.city}`);
      url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn('No se pudo abrir las indicaciones:', error.message);
      }
    }
  };

  return (
    <View style={styles.sidebarCard}>

      {/* ══ SECTION 1: Price header (gradient, no own borderRadius) ══ */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.priceHeader}
      >
        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>{specialist.pricePerSession}€</Text>
          <Text style={styles.priceLabel}>{STRINGS.perSession}</Text>
        </View>
        <Text style={styles.priceDuration}>{sessionDurationText}</Text>
      </LinearGradient>

      {/* ══ SECTION 2: Availability + modality ══ */}
      <View style={styles.infoSection}>

        {/* Availability row */}
        <View style={styles.availabilityRow}>
          <View style={styles.calendarIconWrap}>
            <Ionicons name="calendar-outline" size={18} color={heraLanding.success} />
          </View>
          <View>
            <Text style={styles.availLabel}>{STRINGS.nextAvailability}</Text>
            <Text style={[styles.availValue, nextAvailableDate === null && styles.availValueNeutral]}>
              {availabilityText}
            </Text>
          </View>
        </View>

        {/* Internal divider */}
        <View style={styles.internalDivider} />

        {/* Modality rows */}
        {offersOnline && (
          <View style={styles.modalityRow}>
            <Ionicons name="videocam-outline" size={16} color={heraLanding.textSecondary} />
            <Text style={styles.modalityText}>{STRINGS.videoCall}</Text>
          </View>
        )}
        {offersInPerson && (
          <View style={styles.modalityRow}>
            <Ionicons name="business-outline" size={16} color={heraLanding.textSecondary} />
            <Text style={styles.modalityText}>{STRINGS.inPerson}</Text>
          </View>
        )}

      </View>

      {/* ── Divider between info and CTAs ── */}
      <SectionDivider />

      {/* ══ SECTION 3: CTAs ══ */}
      <View style={styles.ctaSection}>
        {/* Primary CTA */}
        <Pressable
          style={({ hovered, pressed }) => [
            styles.primaryCTA,
            hovered && styles.primaryCTAHovered,
            pressed && { transform: [{ scale: 0.98 }] }
          ]}
          onPress={onBookPress}
        >
          <Text style={styles.primaryCTAText}>{STRINGS.bookSession}</Text>
        </Pressable>

      </View>

      {/* ══ SECTION 4: Location (only if in-person + address) ══ */}
      {showLocation && address && (
        <>
          <SectionDivider />
          <View style={styles.locationSection}>

            <Text style={styles.locationLabel}>{STRINGS.locationLabel}</Text>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={heraLanding.textSecondary} />
              <View style={styles.addressTextBlock}>
                <Text style={styles.addressText}>{address.street}</Text>
                <Text style={styles.addressCity}>{address.city}</Text>
              </View>
            </View>

            {/* Map preview (only when coordinates available) */}
            {hasCoordinates && (
              <View style={styles.mapWrapper}>
                <LocationMapPreview
                  lat={address.latitude!}
                  lng={address.longitude!}
                  address={address.street}
                  city={address.city}
                  showDirectionsButton={false}
                  width={300}
                  height={140}
                />
              </View>
            )}

            {/* Cómo llegar button */}
            <TouchableOpacity
              style={[
                styles.mapLink,
                mapLinkHovered && styles.mapLinkHovered,
              ]}
              onPress={handleOpenDirections}
              activeOpacity={0.7}
              {...webHover(
                () => setMapLinkHovered(true),
                () => setMapLinkHovered(false),
              )}
            >
              <Ionicons name="navigate-outline" size={14} color={gradientColors[0]} />
              <Text style={[styles.mapLinkText, { color: gradientColors[0] }]}>
                {STRINGS.howToGet}
              </Text>
            </TouchableOpacity>

          </View>
        </>
      )}

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Single card
  sidebarCard: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: heraLanding.border,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // ── Price header ──
  priceHeader: {
    padding: 20,
    // No borderRadius — card overflow:'hidden' clips it
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: spacing.xs,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: heraLanding.whiteAlpha85,
  },
  priceDuration: {
    fontSize: 13,
    color: heraLanding.whiteAlpha80,
  },

  // ── Info section ──
  infoSection: {
    padding: spacing.md,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: heraLanding.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availLabel: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    marginBottom: 2,
  },
  availValue: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.success,
  },
  availValueNeutral: {
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  internalDivider: {
    height: 1,
    backgroundColor: heraLanding.border,
    marginVertical: 12,
  },
  modalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  modalityText: {
    fontSize: 13,
    color: heraLanding.textPrimary,
  },

  // ── Section divider ──
  sectionDivider: {
    height: 0.5,
    backgroundColor: heraLanding.border,
  },

  // ── CTA section ──
  ctaSection: {
    padding: spacing.md,
    gap: 10,
  },
  primaryCTA: {
    backgroundColor: heraLanding.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...Platform.select({ web: { transition: 'all 0.2s ease' } as any })
  },
  primaryCTAHovered: {
    backgroundColor: heraLanding.primaryDark,
    ...Platform.select({ web: { boxShadow: '0 4px 14px rgba(139, 157, 131, 0.4)' } as any })
  },
  primaryCTAText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  // ── Location section ──
  locationSection: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { textTransform: 'uppercase' } as Record<string, string> : {}),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addressTextBlock: {
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  addressCity: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  mapWrapper: {
    marginTop: 12,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  mapLinkHovered: {
    opacity: 0.7,
  },
  mapLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default BookingSidebar;
