/**
 * TrustIndicatorsSection Component
 *
 * Build trust through concrete benefits with 6 value propositions.
 * Features stats, icons, and descriptions in a responsive grid.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';

interface TrustCard {
  icon: keyof typeof Ionicons.glyphMap;
  stat: string;
  description: string;
  iconColor: string;
  bgColor: string;
}

const trustCards: TrustCard[] = [
  {
    icon: 'shield-checkmark',
    stat: '100% Verificados',
    description: 'Todos nuestros especialistas pasan un riguroso proceso de verificación',
    iconColor: heraLanding.primary,
    bgColor: heraLanding.primaryMuted,
  },
  {
    icon: 'time-outline',
    stat: '24/7 Disponible',
    description: 'Reserva en minutos. Cancela hasta 24h antes sin coste',
    iconColor: heraLanding.secondary,
    bgColor: heraLanding.secondaryMuted,
  },
  {
    icon: 'pricetag-outline',
    stat: 'Desde 50€',
    description: 'Precios transparentes y accesibles sin sorpresas',
    iconColor: heraLanding.success,
    bgColor: '#E8F5E9',
  },
  {
    icon: 'lock-closed-outline',
    stat: 'RGPD Compliant',
    description: 'Datos protegidos y encriptados. 100% confidencial',
    iconColor: '#6B8DE3',
    bgColor: '#E8F0FF',
  },
  {
    icon: 'heart-outline',
    stat: '+5,000 Sesiones',
    description: 'Miles de personas ya cuidan su bienestar con nosotros',
    iconColor: heraLanding.warning,
    bgColor: '#FFF3E8',
  },
  {
    icon: 'videocam-outline',
    stat: 'Online o Presencial',
    description: 'Elige el formato que mejor se adapte a tu estilo de vida',
    iconColor: '#9B87C4',
    bgColor: '#F5F0FF',
  },
];

interface AnimatedCounterProps {
  target: string;
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ target, duration = 1500 }) => {
  const [displayValue, setDisplayValue] = useState(target);

  // Simple display without animation for now (animation can be enhanced later)
  useEffect(() => {
    setDisplayValue(target);
  }, [target]);

  return <Text style={styles.stat}>{displayValue}</Text>; // color overridden inline per card
};

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
      useNativeDriver: true,
    }).start();
  }, []);

  const getGridColumns = () => {
    if (isDesktop) return 3;
    if (isTablet) return 2;
    return 1;
  };

  const renderCards = () => {
    const columns = getGridColumns();
    const rows: TrustCard[][] = [];

    for (let i = 0; i < trustCards.length; i += columns) {
      rows.push(trustCards.slice(i, i + columns));
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
        {row.map((card, cardIndex) => (
          <Animated.View
            key={cardIndex}
            style={[
              styles.card,
              { backgroundColor: theme.bgCard, shadowColor: theme.shadowNeutral },
              isDesktop && styles.cardDesktop,
              isTablet && styles.cardTablet,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: card.bgColor + '22' }]}>
              <Ionicons name={card.icon} size={28} color={card.iconColor} />
            </View>

            {/* Stat */}
            <Text style={[styles.stat, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{card.stat}</Text>

            {/* Description */}
            <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{card.description}</Text>
          </Animated.View>
        ))}
      </View>
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgMuted }, isDesktop && styles.containerDesktop]}>
      <View style={styles.content}>
        {/* Section Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }, isDesktop && styles.titleDesktop]}>
            ¿Por qué elegir HERA?
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            Cuidamos cada detalle para tu bienestar
          </Text>
        </View>

        {/* Trust Grid */}
        <View style={styles.grid}>
          {renderCards()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.background,
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: 17,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },

  // Grid
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

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...shadows.md,
  },
  cardDesktop: {
    flex: 1,
    maxWidth: 360,
  },
  cardTablet: {
    flex: 1,
    maxWidth: 340,
  },

  // Icon
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  // Stat
  stat: {
    fontSize: 22,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Description
  description: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
