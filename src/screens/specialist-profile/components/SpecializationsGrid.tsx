import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpecializationsGridProps } from '../types';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';

// Mapeo hermoso y pastel para las especialidades
const SPECIALTY_MAP: Record<string, { label: string, icon: React.ComponentProps<typeof Ionicons>['name'], bgColor: string, color: string, desc: string }> = {
  'anxiety': { label: 'Ansiedad', icon: 'water-outline', bgColor: '#E8F3F1', color: '#4A8B7B', desc: 'Manejo del estrés y ataques de pánico.' },
  'depression': { label: 'Depresión', icon: 'sunny-outline', bgColor: '#FFF4E5', color: '#B8860B', desc: 'Acompañamiento en estados de ánimo bajo.' },
  'self-esteem': { label: 'Autoestima', icon: 'star-outline', bgColor: '#F3E8FF', color: '#9B87C4', desc: 'Desarrollo de la confianza y amor propio.' },
  'stress': { label: 'Estrés laboral', icon: 'briefcase-outline', bgColor: '#EDE7F6', color: '#7E57C2', desc: 'Prevención del burnout y equilibrio.' },
  'relationships': { label: 'Relaciones', icon: 'heart-half-outline', bgColor: '#FFEBEE', color: '#E57373', desc: 'Vínculos sanos y terapia de pareja.' },
  'sleep': { label: 'Problemas de sueño', icon: 'moon-outline', bgColor: '#E3F2FD', color: '#4A6B8B', desc: 'Higiene del sueño y descanso profundo.' },
  'phobias': { label: 'Fobias', icon: 'shield-checkmark-outline', bgColor: '#E8F5E9', color: '#388E3C', desc: 'Superación de miedos limitantes.' },
  'trauma': { label: 'Trauma', icon: 'leaf-outline', bgColor: '#FFF3E0', color: '#F57C00', desc: 'Procesamiento de experiencias difíciles.' },
  'default': { label: 'Salud Mental', icon: 'flower-outline', bgColor: heraLanding.background, color: heraLanding.primaryDark, desc: 'Apoyo integral y personalizado.' }
};

export const SpecializationsGrid: React.FC<SpecializationsGridProps> = ({
  specializations,
}) => {
  const { width } = useWindowDimensions();
  const [isDesktop, setIsDesktop] = useState(
    () => Dimensions.get('window').width >= 768
  );

  useEffect(() => {
    setIsDesktop(width >= 768);
  }, [width]);

  if (!specializations || specializations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Áreas de especialización</Text>

      <View style={styles.grid}>
        {specializations.map((specKey, index) => {
          const config = SPECIALTY_MAP[specKey.toLowerCase()] || SPECIALTY_MAP['default'];
          
          return (
            <View
              key={index}
              style={[
                styles.card,
                { width: isDesktop ? '48%' : '100%' }
              ]}
            >
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(44, 62, 44, 0.06)' } as any,
      default: { elevation: 3, shadowColor: colors.neutral.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }
    })
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: heraLanding.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
    ...Platform.select({
      web: { transition: 'transform 0.2s ease, box-shadow 0.2s ease' } as any,
    }),
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    lineHeight: 18,
  },
});

export default SpecializationsGrid;