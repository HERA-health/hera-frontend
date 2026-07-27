import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LocationMapPreview } from '../../../components/location';
import { spacing } from '../../../constants/colors';
import type { BookingOfficeLocation } from '../../../constants/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatOfficeLocation } from './bookingPresentation';

interface BookingLocationMapProps {
  officeLocation?: BookingOfficeLocation;
  height?: number;
}

export const BookingLocationMap: React.FC<BookingLocationMapProps> = ({
  officeLocation,
  height = 132,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!officeLocation) {
    return null;
  }

  const latitude = officeLocation.latitude;
  const longitude = officeLocation.longitude;

  if (
    typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
  ) {
    return null;
  }

  const formattedLocation = formatOfficeLocation(officeLocation);

  return (
    <View
      accessibilityLabel={`Mapa de la consulta en ${formattedLocation.street}, ${formattedLocation.locality}`}
      style={styles.container}
    >
      <Text style={styles.eyebrow}>UBICACIÓN DE LA CONSULTA</Text>
      <LocationMapPreview
        lat={latitude}
        lng={longitude}
        address={formattedLocation.street}
        city={formattedLocation.locality}
        width="100%"
        height={height}
        interactive={false}
        showDirectionsButton={false}
      />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    eyebrow: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 9,
      letterSpacing: 0.9,
    },
  });
