import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { Button } from '../../../components/common/Button';
import { borderRadius, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  BookingQuote,
  SessionType,
} from '../../../services/sessionsService';
import {
  BOOKING_SESSION_OPTIONS,
  formatBookingDate,
  formatOfficeLocation,
  formatSpecialization,
  getQuotePresentation,
  type BookingSelection,
  type BookingSpecialist,
} from './bookingPresentation';
import { BookingLocationMap } from './BookingLocationMap';

interface ProfessionalInfoColumnProps {
  specialist: BookingSpecialist;
  booking: BookingSelection;
  availableSessionTypes: SessionType[];
  onPrimaryAction: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  actionHint?: string | null;
  accountMessage?: string | null;
  bookingQuote?: BookingQuote | null;
  quoteLoading?: boolean;
  quoteError?: string | null;
  quoteIsEstimated?: boolean;
  loading?: boolean;
  sticky?: boolean;
  showAction?: boolean;
}

const STICKY_TOP_OFFSET = 24;
const STICKY_BOTTOM_GUTTER = 24;
const BOOKING_HEADER_HEIGHT = 72;

export const canUseStickyBookingSummary = ({
  contentHeight,
  requested,
  viewportHeight,
}: {
  contentHeight: number;
  requested: boolean;
  viewportHeight: number;
}) =>
  requested
  && contentHeight > 0
  && viewportHeight >= (
    BOOKING_HEADER_HEIGHT
    + contentHeight
    + STICKY_TOP_OFFSET
    + STICKY_BOTTOM_GUTTER
  );

export const ProfessionalInfoColumn: React.FC<ProfessionalInfoColumnProps> = ({
  specialist,
  booking,
  availableSessionTypes,
  onPrimaryAction,
  actionLabel,
  actionDisabled = false,
  actionHint = null,
  accountMessage = null,
  bookingQuote = null,
  quoteLoading = false,
  quoteError = null,
  quoteIsEstimated = false,
  loading = false,
  sticky = false,
  showAction = true,
}) => {
  const { theme, isDark } = useTheme();
  const { height: viewportHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;

    setContentHeight((currentHeight) =>
      Math.abs(currentHeight - nextHeight) > 0.5 ? nextHeight : currentHeight
    );
  }, []);
  const activeType = BOOKING_SESSION_OPTIONS.find(
    ({ type }) => type === booking.sessionType && availableSessionTypes.includes(type),
  );
  const quote = getQuotePresentation({
    bookingQuote,
    quoteLoading,
    quoteError,
    quoteIsEstimated,
  });
  const officeLocation = specialist.officeLocation
    ? formatOfficeLocation(specialist.officeLocation)
    : null;
  const webStickyStyle: ViewStyle | undefined =
    Platform.OS === 'web' && canUseStickyBookingSummary({
      contentHeight,
      requested: sticky,
      viewportHeight,
    })
      ? ({
          position: 'sticky',
          top: STICKY_TOP_OFFSET,
        } as unknown as ViewStyle)
      : undefined;

  return (
    <View
      onLayout={handleLayout}
      style={[styles.container, webStickyStyle]}
      testID="booking-summary-card"
    >
      <View style={styles.profile}>
        <View style={styles.profileRow}>
          {specialist.avatar ? (
            <Image
              source={{ uri: specialist.avatar }}
              style={styles.avatar}
              accessibilityLabel={`Foto de ${specialist.name}`}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {specialist.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}

          <View style={styles.profileCopy}>
            <Text style={styles.profileEyebrow}>TU PROFESIONAL</Text>
            <Text style={styles.name}>{specialist.name}</Text>
            <Text style={styles.title}>{specialist.title || 'Profesional de salud mental'}</Text>
            <Text style={styles.profilePrice}>{quote.pricePerSessionText}</Text>
            {quoteIsEstimated && !quoteError ? (
              <Text style={styles.estimatedPriceText}>Precio del profesional</Text>
            ) : null}
          </View>
        </View>

        {specialist.specializations?.length ? (
          <View style={styles.tags}>
            {specialist.specializations.slice(0, 3).map((specialization) => (
              <View key={specialization} style={styles.tag}>
                <Text style={styles.tagText}>{formatSpecialization(specialization)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.summary}>
        <View style={styles.summaryHeading}>
          <Text style={styles.summaryEyebrow}>RESUMEN DE LA CITA</Text>
          {activeType ? (
            <View style={styles.modalityBadge}>
              <Ionicons name={activeType.icon} size={13} color={theme.secondaryDark} />
              <Text style={styles.modalityBadgeText}>{activeType.label}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryRows}>
          <SummaryRow
            icon="calendar-outline"
            label="Fecha"
            value={booking.selectedDate ? formatBookingDate(booking.selectedDate) : 'Por elegir'}
            active={Boolean(booking.selectedDate)}
          />
          <SummaryRow
            icon="time-outline"
            label="Hora"
            value={booking.selectedTime || 'Por elegir'}
            active={Boolean(booking.selectedTime)}
          />
          <SummaryRow
            icon="hourglass-outline"
            label="Duración"
            value={`${specialist.sessionDuration ?? 60} min`}
            active
          />
          {booking.sessionType === 'IN_PERSON' ? (
            <SummaryRow
              icon="location-outline"
              label="Consulta"
              value={
                officeLocation
                  ? [officeLocation.street, officeLocation.locality].filter(Boolean).join(', ')
                  : 'Dirección no publicada'
              }
              active={Boolean(officeLocation)}
            />
          ) : null}
        </View>

        <View style={styles.total}>
          <View style={styles.totalCopy}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text
              accessibilityRole={quoteError ? 'alert' : undefined}
              style={[
                styles.totalCaption,
                quoteError ? styles.totalCaptionError : null,
              ]}
            >
              {quote.caption}
            </Text>
          </View>
          <Text style={styles.totalValue}>{quote.priceText}</Text>
        </View>
      </View>

      <View style={styles.conditions}>
        <View style={styles.condition}>
          <Ionicons name="globe-outline" size={15} color={theme.textSecondary} />
          <Text style={styles.conditionText}>Horario de Europe/Madrid</Text>
        </View>
        <View style={styles.condition}>
          <Ionicons name="refresh-outline" size={15} color={theme.textSecondary} />
          <Text style={styles.conditionText}>Cancelación gratuita hasta 24 h antes</Text>
        </View>
      </View>

      {accountMessage ? (
        <View accessibilityRole="alert" style={styles.accountNotice}>
          <Ionicons name="information-circle-outline" size={18} color={theme.warningAmber} />
          <Text style={styles.accountNoticeText}>{accountMessage}</Text>
        </View>
      ) : null}

      {showAction ? (
        <View style={styles.action}>
          <Button
            variant="primary"
            size="medium"
            onPress={onPrimaryAction}
            disabled={actionDisabled}
            loading={loading}
            fullWidth
            icon={
              !loading ? (
                <Ionicons
                  name={actionLabel === 'Confirmar cita' ? 'checkmark-circle-outline' : 'arrow-down-outline'}
                  size={18}
                  color={theme.textOnPrimary}
                />
              ) : undefined
            }
          >
            {actionLabel}
          </Button>
          {actionHint ? (
            <Text style={styles.actionHint}>{actionHint}</Text>
          ) : null}
        </View>
      ) : null}

      {booking.sessionType === 'IN_PERSON' ? (
        <BookingLocationMap officeLocation={specialist.officeLocation} />
      ) : null}
    </View>
  );
};

interface SummaryRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  active: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  icon,
  label,
  value,
  active,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );
  const mutedIconColor = isDark ? theme.textMuted : theme.textSecondary;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.summaryRow}
    >
      <View style={styles.summaryIcon}>
        <Ionicons
          name={icon}
          size={15}
          color={active ? theme.primary : mutedIconColor}
        />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          !active ? styles.summaryValueMuted : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) => {
  const functionalMutedText = isDark ? theme.textMuted : theme.textSecondary;

  return StyleSheet.create({
    container: {
      width: '100%',
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 28,
      elevation: 4,
    },
    profile: {
      gap: spacing.md,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
    },
    avatarPlaceholder: {
      width: 58,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
      borderRadius: 29,
      backgroundColor: theme.primaryAlpha12,
    },
    avatarLetter: {
      color: theme.primary,
      fontFamily: theme.fontHeading,
      fontSize: 23,
    },
    profileCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    profileEyebrow: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 9,
      letterSpacing: 1.1,
    },
    name: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 21,
      lineHeight: 25,
    },
    title: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 12,
      lineHeight: 17,
    },
    profilePrice: {
      marginTop: 3,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
    },
    estimatedPriceText: {
      color: functionalMutedText,
      fontFamily: theme.fontSans,
      fontSize: 9,
      lineHeight: 13,
    },
    tags: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    tag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    tagText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 10,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    summary: {
      gap: spacing.md,
    },
    summaryHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    summaryEyebrow: {
      color: functionalMutedText,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 9,
      letterSpacing: 1.05,
    },
    modalityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      backgroundColor: theme.secondaryAlpha12,
    },
    modalityBadgeText: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 10,
    },
    summaryRows: {
      gap: spacing.xs,
    },
    summaryRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    summaryIcon: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    summaryLabel: {
      width: 58,
      color: functionalMutedText,
      fontFamily: theme.fontSansMedium,
      fontSize: 11,
    },
    summaryValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      textAlign: 'right',
    },
    summaryValueMuted: {
      color: functionalMutedText,
      fontFamily: theme.fontSansMedium,
    },
    total: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalCopy: {
      flex: 1,
      gap: 3,
    },
    totalLabel: {
      color: functionalMutedText,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 9,
      letterSpacing: 0.9,
    },
    totalCaption: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 10,
      lineHeight: 15,
    },
    totalCaptionError: {
      color: theme.error,
      fontFamily: theme.fontSansMedium,
    },
    totalValue: {
      minWidth: 88,
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 25,
      lineHeight: 29,
      textAlign: 'right',
    },
    conditions: {
      gap: spacing.xs,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    condition: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    conditionText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 10,
      lineHeight: 15,
    },
    accountNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: theme.warningBg,
    },
    accountNoticeText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 11,
      lineHeight: 16,
    },
    action: {
      gap: spacing.xs,
    },
    actionHint: {
      color: functionalMutedText,
      fontFamily: theme.fontSans,
      fontSize: 10,
      lineHeight: 15,
      textAlign: 'center',
    },
  });
};

export default ProfessionalInfoColumn;
