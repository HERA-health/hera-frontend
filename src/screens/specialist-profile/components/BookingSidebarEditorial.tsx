import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, Button } from '../../../components/common';
import { LocationMapPreview } from '../../../components/location';
import { borderRadius, spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatMadridDateKey, getMadridDateKey } from '../../../utils/madridTime';
import { formatProfileSlotLabel } from '../profilePresentation';
import type { BookingSidebarProps } from '../types';
import { SelectableAvailabilityPreview } from './SelectableAvailabilityPreview';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

const getDateKeyDayNumber = (dateKey: string): number | null => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return Math.floor(timestamp / MILLISECONDS_PER_DAY);
};

const resolveMadridDateKey = (value?: string | null): string | null => {
  if (!value) return null;
  if (DATE_KEY_PATTERN.test(value)) {
    return getDateKeyDayNumber(value) === null ? null : value;
  }
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : getMadridDateKey(parsedDate);
};

export const BookingSidebarEditorial: React.FC<BookingSidebarProps> = ({
  specialist,
  onBookPress,
  selectedSlot,
  onSlotChange,
  canBook = true,
  onCtaLayout,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const offersOnline = specialist.offersOnline ?? true;
  const offersInPerson = specialist.offersInPerson ?? false;
  const address = specialist.address;
  const showLocation = offersInPerson && Boolean(address);
  const hasCoordinates = address?.latitude != null && address.longitude != null;
  const slotDuration = specialist.slotDuration ?? 60;
  const nextAvailableDateKey = resolveMadridDateKey(specialist.nextAvailable);
  const nextAvailableDay = nextAvailableDateKey
    ? getDateKeyDayNumber(nextAvailableDateKey)
    : null;
  const todayDay = getDateKeyDayNumber(getMadridDateKey());
  const daysUntilAvailable = nextAvailableDay !== null && todayDay !== null
    ? nextAvailableDay - todayDay
    : null;
  const availabilityText = nextAvailableDateKey === null
    ? 'Consulta la disponibilidad'
    : daysUntilAvailable != null && daysUntilAvailable <= 7
      ? 'Disponible esta semana'
      : `Próxima cita: ${formatMadridDateKey(nextAvailableDateKey, {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })}`;
  const ctaLabel = selectedSlot
    ? `Continuar · ${formatProfileSlotLabel(selectedSlot.date, selectedSlot.slot.startTime)}`
    : 'Reservar sesión';

  const handleOpenDirections = async () => {
    if (!address) return;
    const url = hasCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address.street}, ${address.city}`)}`;
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch (error: unknown) {
      if (error instanceof Error) console.warn('No se pudieron abrir las indicaciones:', error.message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <Text style={styles.summaryEyebrow}>TU SESIÓN</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{specialist.pricePerSession}€</Text>
          <Text style={styles.priceSuffix}>/ sesión</Text>
        </View>
        <View style={styles.durationRow}>
          <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
          <Text style={styles.duration}>Sesión de {slotDuration} minutos</Text>
        </View>

        {specialist.firstVisitFree ? (
          <View style={styles.freeVisit}>
            <View style={styles.freeVisitIcon}>
              <Ionicons name="gift-outline" size={17} color={theme.success} />
            </View>
            <View style={styles.freeVisitCopy}>
              <Text style={styles.freeVisitTitle}>Primera sesión gratuita con este especialista</Text>
              <Text style={styles.freeVisitText}>
                Se aplicará si aún no has tenido sesiones con este profesional.
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.details}>
        <View style={styles.availabilityRow}>
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar-outline" size={18} color={theme.success} />
          </View>
          <View style={styles.availabilityCopy}>
            <Text style={styles.detailLabel}>Próxima disponibilidad</Text>
            <Text style={[styles.availabilityValue, !nextAvailableDateKey && styles.neutralValue]}>
              {availabilityText}
            </Text>
          </View>
        </View>
        <View style={styles.modalityList}>
          {offersOnline ? (
            <View style={styles.modality}>
              <Ionicons name="videocam-outline" size={16} color={theme.primary} />
              <Text style={styles.modalityText}>Videollamada</Text>
            </View>
          ) : null}
          {offersInPerson ? (
            <View style={styles.modality}>
              <Ionicons name="business-outline" size={16} color={theme.primary} />
              <Text style={styles.modalityText}>Presencial</Text>
            </View>
          ) : null}
        </View>
      </View>

      {canBook ? (
        <View style={styles.availabilitySection}>
          <SelectableAvailabilityPreview
            specialistId={specialist.id}
            nextAvailable={specialist.nextAvailable}
            canBook={canBook}
            selectedSlot={selectedSlot}
            onSlotChange={onSlotChange ?? (() => undefined)}
          />
        </View>
      ) : null}

      <View
        onLayout={(event) => onCtaLayout?.(
          event.nativeEvent.layout.y,
          event.nativeEvent.layout.height,
        )}
        style={styles.ctaSection}
      >
        <Button
          variant="primary"
          size="large"
          fullWidth
          disabled={!canBook}
          onPress={onBookPress}
        >
          {canBook ? ctaLabel : 'No acepta reservas ahora'}
        </Button>
        {!canBook ? (
          <Text style={styles.unavailableHint}>
            Este perfil no tiene modalidades de reserva pública activas.
          </Text>
        ) : selectedSlot ? (
          <Text style={styles.ctaHint}>Podrás revisar la modalidad antes de confirmar.</Text>
        ) : (
          <Text style={styles.ctaHint}>También puedes consultar el calendario completo.</Text>
        )}
      </View>

      {showLocation && address ? (
        <View style={styles.location}>
          <Text style={styles.detailLabel}>UBICACIÓN DE CONSULTA</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={17} color={theme.primary} />
            <View style={styles.addressCopy}>
              <Text style={styles.address}>{address.street}</Text>
              <Text style={styles.city}>{address.city}</Text>
            </View>
          </View>
          {hasCoordinates ? (
            <View style={styles.map}>
              <LocationMapPreview
                lat={address.latitude!}
                lng={address.longitude!}
                address={address.street}
                city={address.city}
                showDirectionsButton={false}
                width="100%"
                height={132}
              />
            </View>
          ) : null}
          <AnimatedPressable
            accessibilityRole="link"
            hoverLift={false}
            pressScale={0.98}
            onPress={handleOpenDirections}
            style={styles.directions}
          >
            <Ionicons name="navigate-outline" size={14} color={theme.primary} />
            <Text style={styles.directionsText}>Cómo llegar</Text>
          </AnimatedPressable>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.bgCard,
  },
  summary: { padding: spacing.lg },
  summaryEyebrow: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.fontSansSemiBold,
    color: theme.primary,
    letterSpacing: 1,
  },
  priceRow: { marginTop: spacing.xs, flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 34, lineHeight: 40, fontFamily: theme.fontHeading, color: theme.textPrimary },
  priceSuffix: { fontSize: 14, fontFamily: theme.fontSans, color: theme.textSecondary },
  durationRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  duration: { fontSize: 12, color: theme.textSecondary },
  freeVisit: {
    marginTop: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.successBg,
  },
  freeVisitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.bgCard : theme.surface,
  },
  freeVisitCopy: { flex: 1, gap: 3 },
  freeVisitTitle: { fontSize: 12, lineHeight: 17, fontFamily: theme.fontSansSemiBold, color: theme.success },
  freeVisitText: { fontSize: 11, lineHeight: 16, color: theme.textSecondary },
  details: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calendarIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.successBg,
  },
  availabilityCopy: { flex: 1 },
  detailLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textMuted,
    letterSpacing: 0.7,
  },
  availabilityValue: { marginTop: 2, fontSize: 13, fontFamily: theme.fontSansSemiBold, color: theme.success },
  neutralValue: { color: theme.textSecondary },
  modalityList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  modality: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: isDark ? theme.bgElevated : theme.primaryMuted,
  },
  modalityText: { fontSize: 12, fontFamily: theme.fontSansMedium, color: theme.textPrimary },
  availabilitySection: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  ctaSection: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  ctaHint: { fontSize: 11, lineHeight: 16, textAlign: 'center', color: theme.textSecondary },
  unavailableHint: { fontSize: 12, lineHeight: 17, textAlign: 'center', color: theme.textSecondary },
  location: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addressCopy: { flex: 1 },
  address: { fontSize: 13, fontFamily: theme.fontSansMedium, color: theme.textPrimary },
  city: { marginTop: 2, fontSize: 12, color: theme.textSecondary },
  map: { marginTop: 4, overflow: 'hidden', borderRadius: borderRadius.lg },
  directions: {
    minHeight: 42,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  directionsText: { fontSize: 12, fontFamily: theme.fontSansSemiBold, color: theme.primary },
});

export default BookingSidebarEditorial;
