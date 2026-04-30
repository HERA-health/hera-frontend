import React, { useMemo } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable } from '../../../components/common';
import { borderRadius, spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ApiSession } from '../types';
import { getSessionOfficeLocation } from '../utils/sessionLocation';

interface SessionLocationBlockProps {
  session: ApiSession;
}

const openDirections = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};

const SessionLocationBlock: React.FC<SessionLocationBlockProps> = ({ session }) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);
  const location = useMemo(() => getSessionOfficeLocation(session), [session]);

  if (!location) {
    return null;
  }

  const showCompactAction = width >= 430;
  const hasDirections = Boolean(location.directionsUrl);
  const addressText = location.hasAddress
    ? location.fullAddress
    : location.hasCoordinates
      ? 'Ubicación de consulta guardada por el especialista'
      : 'Dirección pendiente de confirmar por el especialista';
  const directionsUrl = location.directionsUrl;

  const directionsButton = directionsUrl ? (
    <AnimatedPressable
      style={styles.directionsPill}
      onPress={() => openDirections(directionsUrl)}
      accessibilityLabel="Abrir indicaciones en Google Maps"
      accessibilityRole="link"
      hoverLift
      pressScale={0.98}
    >
      <Ionicons name="navigate-outline" size={15} color={theme.primary} />
      <Text style={styles.directionsPillText}>Cómo llegar</Text>
    </AnimatedPressable>
  ) : null;

  return (
    <View style={[styles.block, !hasDirections && styles.blockMuted]}>
      <View style={styles.headerRow}>
        <View style={styles.iconShell}>
          <Ionicons
            name={hasDirections ? 'location-outline' : 'information-circle-outline'}
            size={18}
            color={hasDirections ? theme.primary : theme.textMuted}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>Consulta presencial</Text>
          <Text style={styles.address} numberOfLines={hasDirections ? 2 : 3}>
            {addressText}
          </Text>
        </View>

        {showCompactAction ? directionsButton : null}
      </View>

      {!showCompactAction ? directionsButton : null}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean, width: number) =>
  StyleSheet.create({
    block: {
      gap: spacing.md,
      marginBottom: spacing.md,
      padding: width >= 520 ? spacing.md : 14,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
      backgroundColor: isDark ? theme.secondaryMuted : theme.bgMuted,
    },
    blockMuted: {
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconShell: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
      marginBottom: 3,
    },
    address: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    directionsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
      backgroundColor: isDark ? theme.primaryMuted : theme.bgCard,
    },
    directionsPillText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
    },
  });

export default SessionLocationBlock;
