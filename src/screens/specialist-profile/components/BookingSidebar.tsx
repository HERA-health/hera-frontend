/**
 * BookingSidebar - Single card sidebar
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BookingSidebarProps } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { LocationMapPreview } from '../../../components/location';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable, Button } from '../../../components/common';

const STRINGS = {
  perSession: '/sesión',
  nextAvailability: 'Próxima disponibilidad',
  videoCall: 'Videollamada disponible',
  inPerson: 'Consulta presencial',
  bookSession: 'Reservar sesión',
  locationLabel: 'UBICACIÓN DE CONSULTA',
  howToGet: 'Cómo llegar',
};

const SectionDivider: React.FC<{ color: string }> = ({ color }) => (
  <View style={{ height: 0.5, backgroundColor: color }} />
);

export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  specialist,
  onBookPress,
  gradientColors,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const offersOnline = specialist.offersOnline ?? true;
  const offersInPerson = specialist.offersInPerson ?? false;
  const address = specialist.address;
  const showLocation = offersInPerson && !!address;
  const hasCoordinates = !!(address?.latitude && address?.longitude);

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

  const handleOpenDirections = async () => {
    if (!address) return;
    const url = hasCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address.street}, ${address.city}`)}`;

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

      <View style={styles.infoSection}>
        <View style={styles.availabilityRow}>
          <View style={styles.calendarIconWrap}>
            <Ionicons name="calendar-outline" size={18} color={theme.success} />
          </View>
          <View style={styles.availTextBlock}>
            <Text style={styles.availLabel}>{STRINGS.nextAvailability}</Text>
            <Text style={[styles.availValue, nextAvailableDate === null && styles.availValueNeutral]}>
              {availabilityText}
            </Text>
          </View>
        </View>

        <View style={styles.internalDivider} />

        {offersOnline && (
          <View style={styles.modalityRow}>
            <Ionicons name="videocam-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.modalityText}>{STRINGS.videoCall}</Text>
          </View>
        )}
        {offersInPerson && (
          <View style={styles.modalityRow}>
            <Ionicons name="business-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.modalityText}>{STRINGS.inPerson}</Text>
          </View>
        )}
      </View>

      <SectionDivider color={theme.borderLight} />

      <View style={styles.ctaSection}>
        <Button variant="primary" size="large" fullWidth onPress={onBookPress}>
          {STRINGS.bookSession}
        </Button>
      </View>

      {showLocation && address && (
        <>
          <SectionDivider color={theme.borderLight} />
          <View style={styles.locationSection}>
            <Text style={styles.locationLabel}>{STRINGS.locationLabel}</Text>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
              <View style={styles.addressTextBlock}>
                <Text style={styles.addressText}>{address.street}</Text>
                <Text style={styles.addressCity}>{address.city}</Text>
              </View>
            </View>

            {hasCoordinates && (
              <View style={styles.mapWrapper}>
                <LocationMapPreview
                  lat={address.latitude!}
                  lng={address.longitude!}
                  address={address.street}
                  city={address.city}
                  showDirectionsButton={false}
                  width="100%"
                  height={140}
                />
              </View>
            )}

            <AnimatedPressable
              style={styles.mapLink}
              onPress={handleOpenDirections}
              hoverLift={false}
              pressScale={0.98}
            >
              <Ionicons name="navigate-outline" size={14} color={theme.primary} />
              <Text style={styles.mapLinkText}>{STRINGS.howToGet}</Text>
            </AnimatedPressable>
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  sidebarCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  priceHeader: {
    padding: 20,
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
    color: theme.textOnPrimary,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },
  priceDuration: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
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
    backgroundColor: theme.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  availLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  availValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.success,
  },
  availValueNeutral: {
    color: theme.textSecondary,
    fontWeight: '500',
  },
  internalDivider: {
    height: 1,
    backgroundColor: theme.borderLight,
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
    color: theme.textPrimary,
  },
  ctaSection: {
    padding: spacing.md,
    gap: 10,
  },
  locationSection: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
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
    color: theme.textPrimary,
  },
  addressCity: {
    fontSize: 12,
    color: theme.textSecondary,
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
  mapLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
});

export default BookingSidebar;
