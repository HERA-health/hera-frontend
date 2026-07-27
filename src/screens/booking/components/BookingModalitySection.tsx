import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { borderRadius, spacing } from '../../../constants/colors';
import type { BookingOfficeLocation } from '../../../constants/types';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  BookingQuote,
  SessionType,
} from '../../../services/sessionsService';
import {
  BOOKING_SESSION_OPTIONS,
  formatOfficeLocation,
  getQuotePresentation,
} from './bookingPresentation';

interface BookingModalitySectionProps {
  selectedType: SessionType;
  availableSessionTypes: SessionType[];
  duration: number;
  onSessionTypeChange: (type: SessionType) => void;
  bookingQuote?: BookingQuote | null;
  quoteLoading?: boolean;
  quoteError?: string | null;
  quoteIsEstimated?: boolean;
  officeLocation?: BookingOfficeLocation;
  disabled?: boolean;
  busy?: boolean;
}

export const BookingModalitySection: React.FC<BookingModalitySectionProps> = ({
  selectedType,
  availableSessionTypes,
  duration,
  onSessionTypeChange,
  bookingQuote = null,
  quoteLoading = false,
  quoteError = null,
  quoteIsEstimated = false,
  officeLocation,
  disabled = false,
  busy = false,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );
  const options = useMemo(
    () => BOOKING_SESSION_OPTIONS.filter(({ type }) => availableSessionTypes.includes(type)),
    [availableSessionTypes],
  );
  const quote = getQuotePresentation({
    bookingQuote,
    quoteLoading,
    quoteError,
    quoteIsEstimated,
  });
  const formattedOfficeLocation = officeLocation
    ? formatOfficeLocation(officeLocation)
    : null;
  const showOfficeLocation = selectedType === 'IN_PERSON';
  const isCompact = width < 520;

  return (
    <View
      accessibilityState={{ busy, disabled }}
      style={styles.section}
    >
      <View style={styles.headingRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>1</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>MODALIDAD</Text>
          <Text style={styles.title}>¿Cómo prefieres tener tu sesión?</Text>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={15} color={theme.secondaryDark} />
            <Text style={styles.metricText}>{duration} min</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="wallet-outline" size={15} color={theme.secondaryDark} />
            <Text style={styles.metricText}>{quote.priceText}</Text>
          </View>
        </View>
      </View>

      {options.length > 0 ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Modalidad de la sesión"
          accessibilityState={{ busy, disabled }}
          style={styles.options}
        >
          {options.map((option) => {
            const selected = option.type === selectedType;

            return (
              <AnimatedPressable
                key={option.type}
                onPress={() => onSessionTypeChange(option.type)}
                disabled={disabled || busy}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label}. ${option.description}`}
                accessibilityState={{
                  checked: selected,
                  disabled: disabled || busy,
                }}
                style={[
                  styles.option,
                  isCompact ? styles.optionCompact : null,
                  disabled || busy ? styles.optionDisabled : null,
                  selected ? styles.optionSelected : null,
                ]}
              >
                <View
                  style={[
                    styles.optionIcon,
                    selected ? styles.optionIconSelected : null,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={19}
                    color={selected ? theme.textOnPrimary : theme.primary}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text
                    style={[
                      styles.optionTitle,
                      selected ? styles.optionTitleSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      selected ? styles.optionDescriptionSelected : null,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selected ? styles.radioSelected : null,
                  ]}
                >
                  {selected ? (
                    <View style={styles.radioDot} />
                  ) : null}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.unavailable}>
          <Ionicons
            name="alert-circle-outline"
            size={19}
            color={theme.warningAmber}
          />
          <Text style={styles.unavailableText}>
            Este profesional no tiene modalidades de reserva activas.
          </Text>
        </View>
      )}

      {showOfficeLocation ? (
        <View
          accessibilityLabel={
            formattedOfficeLocation
              ? `Ubicación de la consulta: ${formattedOfficeLocation.street}, ${formattedOfficeLocation.locality}`
              : 'La ubicación de la consulta no está publicada'
          }
          style={[
            styles.locationNotice,
            !formattedOfficeLocation ? styles.locationNoticeMissing : null,
          ]}
        >
          <View style={styles.locationIcon}>
            <Ionicons
              name="location-outline"
              size={18}
              color={formattedOfficeLocation ? theme.primary : theme.warningAmber}
            />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>UBICACIÓN DE LA CONSULTA</Text>
            {formattedOfficeLocation ? (
              <>
                <Text style={styles.locationStreet}>{formattedOfficeLocation.street}</Text>
                {formattedOfficeLocation.locality ? (
                  <Text style={styles.locationLocality}>{formattedOfficeLocation.locality}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.locationMissingText}>
                La dirección no está publicada en el perfil. Confírmala con el profesional antes de reservar.
              </Text>
            )}
          </View>
        </View>
      ) : null}

      {quoteError ? (
        <View accessibilityRole="alert" style={styles.quoteError}>
          <Ionicons name="information-circle-outline" size={17} color={theme.error} />
          <Text style={styles.quoteErrorText}>{quoteError}</Text>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) =>
  StyleSheet.create({
    section: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    stepBadge: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
      backgroundColor: theme.primary,
    },
    stepBadgeText: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
    },
    headingCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    eyebrow: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 10,
      letterSpacing: 1.15,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 21,
      lineHeight: 27,
    },
    metrics: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    metric: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    metricText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 12,
    },
    options: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    option: {
      minWidth: 0,
      minHeight: 72,
      flex: 1,
      flexBasis: 240,
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.textSecondary,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
    },
    optionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    optionCompact: {
      width: '100%',
      flexBasis: '100%',
    },
    optionDisabled: {
      opacity: 0.72,
    },
    optionIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: theme.primaryAlpha12,
    },
    optionIconSelected: {
      backgroundColor: theme.primaryLight,
    },
    optionCopy: {
      flex: 1,
      gap: 2,
    },
    optionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 14,
    },
    optionTitleSelected: {
      color: theme.textOnPrimary,
    },
    optionDescription: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 11,
      lineHeight: 16,
    },
    optionDescriptionSelected: {
      color: theme.textOnPrimary,
      opacity: 0.82,
    },
    radio: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.textSecondary,
      borderRadius: 10,
    },
    radioSelected: {
      borderColor: theme.textOnPrimary,
    },
    radioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.textOnPrimary,
    },
    unavailable: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.warningBg,
    },
    unavailableText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 12,
      lineHeight: 18,
    },
    locationNotice: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
      borderRadius: borderRadius.md,
      backgroundColor: theme.primaryAlpha12,
    },
    locationNoticeMissing: {
      borderColor: theme.warning,
      backgroundColor: theme.warningBg,
    },
    locationIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
    },
    locationCopy: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    locationLabel: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 9,
      letterSpacing: 0.9,
    },
    locationStreet: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    locationLocality: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 11,
      lineHeight: 16,
    },
    locationMissingText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 11,
      lineHeight: 16,
    },
    quoteError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    quoteErrorText: {
      flex: 1,
      color: theme.error,
      fontFamily: theme.fontSansMedium,
      fontSize: 11,
      lineHeight: 16,
    },
  });
