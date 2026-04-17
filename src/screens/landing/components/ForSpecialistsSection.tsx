/**
 * ForSpecialistsSection
 *
 * Evolves the previous secondary banner into a product-focused section
 * that speaks clearly about real professional workflows.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';

interface ForSpecialistsSectionProps {
  onLearnMore: () => void;
}

const BENEFITS = [
  { icon: 'calendar-outline' as const, text: 'Agenda semanal y sesiones en un mismo panel' },
  { icon: 'people-outline' as const, text: 'Vista más clara de pacientes y seguimiento' },
  { icon: 'receipt-outline' as const, text: 'Facturación y configuración administrativa' },
  { icon: 'stats-chart-outline' as const, text: 'Métricas para entender tu actividad' },
];

export const ForSpecialistsSection: React.FC<ForSpecialistsSectionProps> = ({
  onLearnMore,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.secondaryMuted },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View
        style={[
          styles.content,
          isDesktop && styles.contentDesktop,
          isTablet && styles.contentTablet,
        ]}
      >
        {(isDesktop || isTablet) && (
          <View
            style={[
              styles.illustrationContainer,
              isDesktop && styles.illustrationContainerDesktop,
            ]}
          >
            <View style={styles.illustrationWrapper}>
              <LinearGradient
                colors={[theme.secondary, theme.secondaryDark]}
                style={styles.centralIcon}
              >
                <Ionicons name="briefcase-outline" size={46} color="#FFFFFF" />
              </LinearGradient>

              <View style={[styles.floatingBadge, styles.badge1, { backgroundColor: theme.bgCard }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.secondary} />
              </View>
              <View style={[styles.floatingBadge, styles.badge2, { backgroundColor: theme.bgCard }]}>
                <Ionicons name="receipt-outline" size={20} color={theme.success} />
              </View>
              <View style={[styles.floatingBadge, styles.badge3, { backgroundColor: theme.bgCard }]}>
                <Ionicons name="stats-chart-outline" size={20} color={theme.primary} />
              </View>

              <View style={[styles.bgCircle1, { backgroundColor: theme.secondaryAlpha12 }]} />
              <View style={[styles.bgCircle2, { backgroundColor: theme.primaryAlpha12 }]} />
            </View>
          </View>
        )}

        <View style={[styles.textContainer, isDesktop && styles.textContainerDesktop]}>
          <View style={[styles.badge, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="briefcase-outline" size={14} color={theme.secondaryDark} />
            <Text
              style={[
                styles.badgeText,
                { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Herramientas para especialistas en salud mental
            </Text>
          </View>

          <Text
            style={[
              styles.title,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              isDesktop && styles.titleDesktop,
            ]}
          >
            Una base más sólida para organizar tu consulta
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            HERA te ayuda a trabajar con una operativa más clara: agenda, pacientes,
            disponibilidad, sesiones y gestión administrativa dentro de la misma experiencia de salud mental.
          </Text>

          <View style={[styles.benefitsGrid, isDesktop && styles.benefitsGridDesktop]}>
            {BENEFITS.map((benefit) => (
              <View
                key={benefit.text}
                style={[
                  styles.benefitItem,
                  {
                    backgroundColor: theme.bgCard,
                    borderColor: theme.border,
                    shadowColor: theme.shadowNeutral,
                  },
                ]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: theme.secondaryAlpha12 }]}>
                  <Ionicons name={benefit.icon} size={18} color={theme.secondary} />
                </View>
                <Text
                  style={[
                    styles.benefitText,
                    { color: theme.textPrimary, fontFamily: theme.fontSans },
                  ]}
                >
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>

          <AnimatedPressable
            style={[
              styles.cta,
              {
                backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
                borderColor: theme.secondaryLight,
                shadowColor: theme.shadowNeutral,
              },
            ]}
            onPress={onLearnMore}
            hoverLift
            pressScale={0.98}
          >
            <Text
              style={[
                styles.ctaText,
                { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Entrar en mi espacio profesional
            </Text>
            <Ionicons name="arrow-forward" size={18} color={theme.secondaryDark} />
          </AnimatedPressable>
        </View>
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
    paddingVertical: 80,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 60,
  },
  contentTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  illustrationContainer: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainerDesktop: {
    flex: 0.45,
  },
  illustrationWrapper: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centralIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  floatingBadge: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  badge1: {
    top: 26,
    right: 42,
  },
  badge2: {
    bottom: 42,
    left: 28,
  },
  badge3: {
    top: 102,
    left: 18,
  },
  bgCircle1: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    zIndex: -1,
  },
  bgCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -18,
    right: -8,
    zIndex: -1,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  textContainerDesktop: {
    flex: 0.55,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
  },
  title: {
    fontSize: 32,
    marginBottom: 16,
  },
  titleDesktop: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 28,
    maxWidth: 520,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  benefitsGridDesktop: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 14,
    maxWidth: 250,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  ctaText: {
    fontSize: 16,
  },
});
