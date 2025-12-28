/**
 * SpecializationsGrid - Detailed specializations display
 * Shows specializations with icons and descriptions in a grid
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SpecializationsGridProps, getSpecializationIcon } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const SPECIALIZATION_DESCRIPTIONS: Record<string, string> = {
  'Ansiedad': 'Manejo del estrés, ataques de pánico y preocupaciones excesivas',
  'Estrés': 'Técnicas de relajación y gestión del estrés laboral y personal',
  'Depresión': 'Acompañamiento en estados de ánimo bajo y desmotivación',
  'Pareja': 'Comunicación, conflictos y fortalecimiento de relaciones',
  'Trauma': 'Procesamiento de experiencias difíciles y TEPT',
  'Autoestima': 'Desarrollo de la confianza y amor propio',
  'Duelo': 'Acompañamiento en procesos de pérdida y duelo',
  'TDAH': 'Estrategias de concentración y organización',
  'Adicciones': 'Apoyo en la superación de dependencias',
  'Fobias': 'Tratamiento de miedos específicos e irracionales',
  'TOC': 'Manejo de pensamientos obsesivos y compulsiones',
  'Alimentación': 'Relación saludable con la comida y el cuerpo',
  'Sueño': 'Mejora de la calidad del descanso nocturno',
  'Laboral': 'Desarrollo profesional y bienestar en el trabajo',
  'Familia': 'Dinámicas familiares y resolución de conflictos',
  'Adolescentes': 'Acompañamiento en la etapa adolescente',
  'Infantil': 'Desarrollo emocional y conductual en niños',
  'Sexología': 'Salud sexual y relaciones íntimas',
};

const getDescription = (name: string): string => {
  const normalizedName = name.toLowerCase();
  for (const [key, description] of Object.entries(SPECIALIZATION_DESCRIPTIONS)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return description;
    }
  }
  return 'Apoyo especializado en esta área de la salud mental';
};

interface SpecializationCardProps {
  name: string;
  icon: string;
  description: string;
}

const SpecializationCard: React.FC<SpecializationCardProps> = ({
  name,
  icon,
  description,
}) => (
  <View style={styles.card}>
    <Text style={styles.cardIcon}>{icon}</Text>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>
  </View>
);

export const SpecializationsGrid: React.FC<SpecializationsGridProps> = ({
  specializations,
  specializationsDetail,
}) => {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  if (!specializations || specializations.length === 0) {
    return null;
  }

  // Use detailed specializations if available, otherwise generate from names
  const displaySpecializations = specializationsDetail || specializations.map(name => ({
    name,
    icon: getSpecializationIcon(name),
    description: getDescription(name),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Áreas de especialización</Text>

      <View style={[styles.grid, isWideScreen && styles.gridWide]}>
        {displaySpecializations.map((spec, index) => (
          <View
            key={index}
            style={[styles.cardWrapper, isWideScreen && styles.cardWrapperWide]}
          >
            <SpecializationCard
              name={spec.name}
              icon={spec.icon}
              description={spec.description}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '100%',
  },
  cardWrapperWide: {
    width: '48%',
    marginRight: '2%',
  },
  card: {
    backgroundColor: heraLanding.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },
});

export default SpecializationsGrid;
