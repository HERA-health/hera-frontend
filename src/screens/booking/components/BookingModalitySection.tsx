import { type PrivateServiceOption } from '../../../services/privateCatalogService';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
} from './bookingPresentation';

interface BookingModalitySectionProps {
  prices?: PrivateServiceOption[];
  headingMinHeight?: number;
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
  headingMinHeight = 24,
  availableSessionTypes,
  onSessionTypeChange,
  quoteError = null,
  officeLocation,
  disabled = false,
  busy = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );
  const options = useMemo(
    () => BOOKING_SESSION_OPTIONS.filter(({ type }) => availableSessionTypes.includes(type)),
    [availableSessionTypes],
  );
  const formattedOfficeLocation = officeLocation
    ? formatOfficeLocation(officeLocation)
    : null;
  const showOfficeLocation = selectedType === 'IN_PERSON';

  return (
    <View
      accessibilityState={{ busy, disabled }}
      style={styles.section}
    >
      <View style={[styles.headingRow, { minHeight: headingMinHeight }]}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>2</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" aria-level={2} style={styles.title}>Modalidad de consulta</Text>
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
                onPress={() => { if (!selected) onSessionTypeChange(option.type); }}
                hoverLift={false}
                disabled={disabled || busy}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label}. ${option.description}`}
                accessibilityState={{
                  checked: selected,
                  disabled: disabled || busy,
                }}
                style={[
                  styles.option,
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
                    color={theme.primary}
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
            Selecciona un servicio para ver sus modalidades.
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
      gap: 10,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepBadge: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: theme.primary,
    },
    stepBadgeText: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
    },
    headingCopy: {
      flexShrink: 1,
      minWidth: 0,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplay,
      fontSize: 18,
      lineHeight: 24,
    },
    options: {
      gap: 8,
    },
    option: {
      minWidth: 0,
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 12,
      backgroundColor: theme.bgCard,
    },
    optionSelected: {
      borderColor: theme.primaryAlpha20,
      backgroundColor: theme.primaryMuted,
    },
    optionDisabled: {
      opacity: 0.72,
    },
    optionIcon: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: theme.primaryAlpha12,
    },
    optionIconSelected: {
      backgroundColor: theme.primaryAlpha12,
    },
    optionCopy: {
      flex: 1,
      gap: 2,
    },
    optionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    optionTitleSelected: {
      color: theme.textPrimary,
    },
    optionDescription: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    optionDescriptionSelected: {
      color: theme.textSecondary,
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
      borderColor: theme.primary,
    },
    radioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
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
      width: '100%',
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
      width: '100%',
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
