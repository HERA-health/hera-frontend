/**
 * TestimonialsSection
 *
 * Reused visually as a use-cases section to avoid inventing new testimonials
 * while still explaining real specialist workflows.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { GlassCard } from '../../../components/common/GlassCard';
import { MotionView } from '../../../components/common/MotionView';
import type { Theme } from '../../../constants/theme';

interface UseCase {
  id: string;
  title: string;
  summary: string;
  context: string;
  outcome: string;
  accentColor: (theme: Theme) => string;
  icon: keyof typeof Ionicons.glyphMap;
}

const USE_CASES: UseCase[] = [
  {
    id: '1',
    title: 'Semana clínica más ordenada',
    summary:
      'Consulta agenda, próximas sesiones y solicitudes pendientes sin saltar entre herramientas.',
    context: 'Para especialistas con varias sesiones a la semana',
    outcome: 'Menos fricción operativa al empezar el día',
    accentColor: (theme) => theme.primary,
    icon: 'calendar-outline',
  },
  {
    id: '2',
    title: 'Seguimiento de pacientes en un mismo entorno',
    summary:
      'Accede al listado de pacientes, sesiones asociadas y contexto operativo desde un panel coherente.',
    context: 'Para consultas que necesitan continuidad y seguimiento',
    outcome: 'Más claridad al revisar cada caso',
    accentColor: (theme) => theme.secondary,
    icon: 'people-outline',
  },
  {
    id: '3',
    title: 'Operación y negocio mejor conectados',
    summary:
      'Combina disponibilidad, facturación y dashboard para entender mejor la actividad de la consulta.',
    context: 'Para quien necesita una base de gestión más profesional',
    outcome: 'Visión más completa del trabajo y del negocio',
    accentColor: (theme) => theme.success,
    icon: 'stats-chart-outline',
  },
];

export const TestimonialsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const { theme } = useTheme();

  const renderCard = (item: UseCase, index: number) => {
    const accent = item.accentColor(theme);

    return (
      <MotionView
        key={item.id}
        entering="fadeInUp"
        delay={100 + index * 80}
        style={isDesktop || isTablet ? { flex: 1 } : undefined}
      >
        <GlassCard
          intensity={45}
          borderRadius={20}
          style={[
            styles.card,
            ...(isDesktop || isTablet ? [styles.cardEqualHeight] : []),
            ...(isDesktop ? [styles.cardDesktop] : []),
            ...(!isDesktop && !isTablet ? [styles.cardMobile] : []),
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: accent }]} />

          <View style={[styles.iconBg, { backgroundColor: accent + '18' }]}>
            <Ionicons name={item.icon} size={22} color={accent} />
          </View>

          <Text
            style={[
              styles.title,
              { color: theme.textPrimary, fontFamily: theme.fontSansBold },
            ]}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.summary,
              { color: theme.textPrimary, fontFamily: theme.fontSans },
            ]}
          >
            {item.summary}
          </Text>

          <View style={[styles.metaBlock, styles.metaBlockLast]}>
            <Text
              style={[
                styles.metaLabel,
                { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Contexto
            </Text>
            <Text
              style={[
                styles.metaText,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              {item.context}
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text
              style={[
                styles.metaLabel,
                { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Lo que resuelve
            </Text>
            <Text
              style={[
                styles.metaText,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              {item.outcome}
            </Text>
          </View>
        </GlassCard>
      </MotionView>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View style={styles.content}>
        <MotionView entering="fadeInUp" delay={0} style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            CASOS DE USO
          </Text>
          <Text
            style={[
              styles.headerTitle,
              isDesktop && styles.headerTitleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            Flujos que HERA ya puede sostener
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            En lugar de forzar testimonios nuevos, la landing muestra de forma honesta
            las situaciones que el producto ya ayuda a ordenar.
          </Text>
        </MotionView>

        {isDesktop || isTablet ? (
          <View style={styles.grid}>
            {USE_CASES.map((item, index) => renderCard(item, index))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            snapToInterval={308}
            decelerationRate="fast"
          >
            {USE_CASES.map((item, index) => renderCard(item, index))}
          </ScrollView>
        )}
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
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headerTitleDesktop: {
    fontSize: 40,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 760,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  card: {
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 280,
  },
  cardEqualHeight: {
    flex: 1,
    height: '100%',
  },
  cardDesktop: {
    padding: 32,
  },
  cardMobile: {
    width: 290,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 3,
    borderRadius: 3,
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    paddingLeft: 12,
  },
  summary: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
    paddingLeft: 12,
  },
  metaBlock: {
    paddingLeft: 12,
    marginBottom: 12,
  },
  metaBlockLast: {
    marginTop: 'auto',
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
