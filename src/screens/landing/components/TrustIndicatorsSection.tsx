/**
 * TrustIndicatorsSection
 *
 * Reframed as a grid of specialist capabilities rather than marketplace claims.
 * Uses theme tokens only.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';

interface CapabilityCard {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}

const capabilityCards: CapabilityCard[] = [
  {
    icon: 'calendar-outline',
    title: 'Agenda y sesiones',
    description: 'Ordena tu calendario profesional con una vista clara de la actividad diaria.',
    accent: 'primary',
  },
  {
    icon: 'people-outline',
    title: 'Gestión de pacientes',
    description: 'Consulta la base de pacientes y mantén el seguimiento dentro del mismo entorno.',
    accent: 'secondary',
  },
  {
    icon: 'time-outline',
    title: 'Disponibilidad',
    description: 'Configura tus franjas y adapta la operativa semanal sin depender de flujos externos.',
    accent: 'success',
  },
  {
    icon: 'receipt-outline',
    title: 'Facturación',
    description: 'Centraliza configuración, historial de facturas y tareas administrativas clave.',
    accent: 'warning',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Dashboard',
    description: 'Revisa actividad, ingresos, sesiones y tendencias desde un panel pensado para decidir.',
    accent: 'info',
  },
  {
    icon: 'lock-closed-outline',
    title: 'RGPD y LOPDGDD',
    description: 'Protección de datos y privacidad alineadas con el RGPD y la Ley Orgánica 3/2018 en España.',
    accent: 'primary',
  },
];

export const TrustIndicatorsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  const getGridColumns = () => {
    if (isDesktop) return 3;
    if (isTablet) return 2;
    return 1;
  };

  const getAccentColors = (accent: CapabilityCard['accent']) => {
    switch (accent) {
      case 'secondary':
        return { icon: theme.secondary, bg: theme.secondaryAlpha12 };
      case 'success':
        return { icon: theme.success, bg: theme.successBg };
      case 'warning':
        return { icon: theme.warning, bg: theme.warningBg };
      case 'info':
        return { icon: theme.info, bg: theme.primaryAlpha12 };
      default:
        return { icon: theme.primary, bg: theme.primaryAlpha12 };
    }
  };

  const renderCards = () => {
    const columns = getGridColumns();
    const rows: CapabilityCard[][] = [];

    for (let i = 0; i < capabilityCards.length; i += columns) {
      rows.push(capabilityCards.slice(i, i + columns));
    }

    return rows.map((row, rowIndex) => (
      <View
        key={rowIndex}
        style={[
          styles.row,
          isDesktop && styles.rowDesktop,
          isTablet && styles.rowTablet,
        ]}
      >
        {row.map((card, cardIndex) => {
          const accent = getAccentColors(card.accent);

          return (
            <Animated.View
              key={card.title}
              style={[
                styles.card,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  shadowColor: theme.shadowNeutral,
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
                isDesktop && styles.cardDesktop,
                isTablet && styles.cardTablet,
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: accent.bg }]}>
                <Ionicons name={card.icon} size={26} color={accent.icon} />
              </View>

              <Text
                style={[
                  styles.title,
                  { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                {card.title}
              </Text>

              <Text
                style={[
                  styles.description,
                  { color: theme.textSecondary, fontFamily: theme.fontSans },
                ]}
              >
                {card.description}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    ));
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgMuted },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            HERRAMIENTAS
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              isDesktop && styles.headerTitleDesktop,
            ]}
          >
            Todo lo esencial para tu operativa
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            HERA deja de hablarte como un marketplace secundario y empieza a presentarse
            como tu espacio de trabajo.
          </Text>
        </View>

        <View style={styles.grid}>{renderCards()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 100,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  headerTitleDesktop: {
    fontSize: 40,
  },
  headerSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 760,
  },
  grid: {
    gap: 20,
  },
  row: {
    gap: 20,
  },
  rowDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  rowTablet: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  cardDesktop: {
    flex: 1,
    maxWidth: 360,
  },
  cardTablet: {
    flex: 1,
    maxWidth: 340,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
});
