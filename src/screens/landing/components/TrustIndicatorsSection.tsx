/**
 * TrustIndicatorsSection
 *
 * Reframed as a trust and privacy section for sensitive mental-health work.
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
    icon: 'ribbon-outline',
    title: 'Verificación profesional',
    description: 'Flujos para revisar documentación y proteger la calidad del acceso profesional.',
    accent: 'primary',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacidad por defecto',
    description: 'La experiencia se diseña minimizando exposición de datos sensibles y ruido operativo.',
    accent: 'secondary',
  },
  {
    icon: 'document-text-outline',
    title: 'Consentimientos claros',
    description: 'Soporte para consentimiento clínico, aceptación legal y trazabilidad cuando el flujo lo requiere.',
    accent: 'success',
  },
  {
    icon: 'folder-open-outline',
    title: 'Documentación protegida',
    description: 'Documentos profesionales y clínicos tratados como información privada, no como adjuntos genéricos.',
    accent: 'warning',
  },
  {
    icon: 'key-outline',
    title: 'Área clínica segura',
    description: 'Acceso clínico con desbloqueo dedicado para separar la gestión diaria de la información más sensible.',
    accent: 'info',
  },
  {
    icon: 'lock-closed-outline',
    title: 'RGPD y LOPDGDD',
    description: 'Comunicación alineada con el marco de protección de datos aplicable en España.',
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
            CONFIANZA
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              isDesktop && styles.headerTitleDesktop,
            ]}
          >
            Seriedad para trabajar con información sensible
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Una plataforma de salud mental no solo tiene que ser cómoda: también
            debe cuidar la privacidad, la verificación, el consentimiento y cada
            dato sensible desde el primer contacto.
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
