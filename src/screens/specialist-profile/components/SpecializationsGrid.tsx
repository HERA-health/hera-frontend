import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SpecializationsGridProps } from '../types';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

const createSpecialtyMap = (theme: Theme) => ({
  anxiety: { label: 'Ansiedad', icon: 'water-outline' as const, bgColor: theme.primaryAlpha12, color: theme.info, desc: 'Manejo del estrés y ataques de pánico.' },
  depression: { label: 'Depresión', icon: 'sunny-outline' as const, bgColor: theme.warningBg, color: theme.warningAmber, desc: 'Acompañamiento en estados de ánimo bajo.' },
  'self-esteem': { label: 'Autoestima', icon: 'star-outline' as const, bgColor: theme.secondaryLight, color: theme.secondaryDark, desc: 'Desarrollo de la confianza y amor propio.' },
  stress: { label: 'Estrés laboral', icon: 'briefcase-outline' as const, bgColor: theme.secondaryLight, color: theme.secondary, desc: 'Prevención del burnout y equilibrio.' },
  relationships: { label: 'Relaciones', icon: 'heart-half-outline' as const, bgColor: '#FCEAEA', color: '#C86A6A', desc: 'Vínculos sanos y terapia de pareja.' },
  sleep: { label: 'Problemas de sueño', icon: 'moon-outline' as const, bgColor: theme.primaryAlpha12, color: theme.info, desc: 'Higiene del sueño y descanso profundo.' },
  phobias: { label: 'Fobias', icon: 'shield-checkmark-outline' as const, bgColor: theme.successBg, color: theme.success, desc: 'Superación de miedos limitantes.' },
  trauma: { label: 'Trauma', icon: 'leaf-outline' as const, bgColor: theme.warningBg, color: theme.warningAmber, desc: 'Procesamiento de experiencias difíciles.' },
  couples: { label: 'Terapia de pareja', icon: 'people-outline' as const, bgColor: theme.primaryLight, color: theme.primaryDark, desc: 'Mejora de la comunicación y vínculos en pareja.' },
  grief: { label: 'Duelo', icon: 'heart-outline' as const, bgColor: theme.secondaryLight, color: theme.secondaryDark, desc: 'Acompañamiento en pérdidas y procesos de duelo.' },
  addiction: { label: 'Adicciones', icon: 'medical-outline' as const, bgColor: theme.successBg, color: theme.success, desc: 'Apoyo en procesos de deshabituación y recaídas.' },
  eating: { label: 'Trastornos alimentarios', icon: 'nutrition-outline' as const, bgColor: theme.warningBg, color: theme.warningAmber, desc: 'Acompañamiento en TCA.' },
  default: { label: 'Salud mental', icon: 'flower-outline' as const, bgColor: theme.bgAlt, color: theme.primaryDark, desc: 'Apoyo integral y personalizado.' },
});

export const SpecializationsGrid: React.FC<SpecializationsGridProps> = ({ specializations }) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const specialtyMap = useMemo(() => createSpecialtyMap(theme), [theme]);
  const isDesktop = width >= 768;

  if (!specializations?.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Áreas de especialización</Text>
      <View style={styles.grid}>
        {specializations.map((specKey, index) => {
          const config = specialtyMap[specKey.toLowerCase() as keyof typeof specialtyMap] || specialtyMap.default;
          return (
            <View key={`${specKey}-${index}`} style={[styles.card, { width: isDesktop ? '48%' : '100%' }]}>
              <View style={[styles.iconBox, { backgroundColor: config.bgColor }]}>
                <Ionicons name={config.icon} size={24} color={config.color} />
              </View>
              <View style={styles.textContent}>
                <Text style={styles.cardTitle}>{config.label || specKey}</Text>
                <Text style={styles.cardDescription}>{config.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    shadowColor: theme.shadowCard,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
});

export default SpecializationsGrid;
