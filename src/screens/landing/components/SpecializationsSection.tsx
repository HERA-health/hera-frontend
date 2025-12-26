/**
 * SpecializationsSection Component
 *
 * Shows breadth of offerings with 8 specialization cards.
 * Grid layout with icons and hover effects.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';

interface Specialization {
  id: string;
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const specializations: Specialization[] = [
  {
    id: 'anxiety',
    emoji: '😰',
    icon: 'pulse-outline',
    title: 'Ansiedad y Estrés',
    description: 'Técnicas para manejar la ansiedad y recuperar el control',
    color: heraLanding.primary,
    bgColor: heraLanding.primaryMuted,
  },
  {
    id: 'couples',
    emoji: '💑',
    icon: 'heart-outline',
    title: 'Terapia de Pareja',
    description: 'Mejora la comunicación y fortalece tu relación',
    color: '#E57373',
    bgColor: '#FFEBEE',
  },
  {
    id: 'depression',
    emoji: '😢',
    icon: 'cloudy-outline',
    title: 'Depresión',
    description: 'Apoyo profesional para superar momentos difíciles',
    color: '#7986CB',
    bgColor: '#E8EAF6',
  },
  {
    id: 'trauma',
    emoji: '🧠',
    icon: 'medical-outline',
    title: 'Trauma y EMDR',
    description: 'Procesa experiencias traumáticas con técnicas avanzadas',
    color: heraLanding.secondary,
    bgColor: heraLanding.secondaryMuted,
  },
  {
    id: 'selfesteem',
    emoji: '💪',
    icon: 'sunny-outline',
    title: 'Autoestima',
    description: 'Desarrolla confianza y aprende a valorarte',
    color: '#FFB74D',
    bgColor: '#FFF3E0',
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    icon: 'people-outline',
    title: 'Terapia Familiar',
    description: 'Mejora la dinámica familiar y resuelve conflictos',
    color: '#4DB6AC',
    bgColor: '#E0F2F1',
  },
  {
    id: 'personal',
    emoji: '🎯',
    icon: 'trophy-outline',
    title: 'Desarrollo Personal',
    description: 'Alcanza tus metas y maximiza tu potencial',
    color: heraLanding.success,
    bgColor: '#E8F5E9',
  },
  {
    id: 'work',
    emoji: '🏢',
    icon: 'briefcase-outline',
    title: 'Estrés Laboral',
    description: 'Gestiona el burnout y encuentra equilibrio',
    color: '#9575CD',
    bgColor: '#EDE7F6',
  },
];

interface SpecializationsSectionProps {
  onSpecializationPress?: (id: string) => void;
}

export const SpecializationsSection: React.FC<SpecializationsSectionProps> = ({
  onSpecializationPress,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getColumns = () => {
    if (isDesktop) return 4;
    if (isTablet) return 3;
    return 2;
  };

  const renderGrid = () => {
    const columns = getColumns();
    const rows: Specialization[][] = [];

    for (let i = 0; i < specializations.length; i += columns) {
      rows.push(specializations.slice(i, i + columns));
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
        {row.map((spec) => (
          <TouchableOpacity
            key={spec.id}
            style={[
              styles.card,
              isDesktop && styles.cardDesktop,
              isTablet && styles.cardTablet,
            ]}
            onPress={() => onSpecializationPress?.(spec.id)}
            activeOpacity={0.85}
          >
            {/* Icon Container */}
            <View style={[styles.iconContainer, { backgroundColor: spec.bgColor }]}>
              <Text style={styles.emoji}>{spec.emoji}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>{spec.title}</Text>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>
              {spec.description}
            </Text>

            {/* Link */}
            <View style={styles.linkContainer}>
              <Text style={[styles.linkText, { color: spec.color }]}>
                Ver especialistas
              </Text>
              <Ionicons name="arrow-forward" size={14} color={spec.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.content}>
        {/* Section Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]}>
            Encuentra el especialista que necesitas
          </Text>
          <Text style={styles.headerSubtitle}>
            Más de 20 especialidades para cuidar cada aspecto de tu bienestar
          </Text>
        </View>

        {/* Specializations Grid */}
        <View style={styles.grid}>
          {renderGrid()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  headerTitleDesktop: {
    fontSize: 40,
  },
  headerSubtitle: {
    fontSize: 17,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    maxWidth: 600,
  },

  // Grid
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowDesktop: {
    gap: 20,
  },
  rowTablet: {
    gap: 16,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: heraLanding.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    ...shadows.sm,
  },
  cardDesktop: {
    padding: 24,
  },
  cardTablet: {
    padding: 20,
  },

  // Icon
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emoji: {
    fontSize: 26,
  },

  // Title
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 6,
    lineHeight: 22,
  },

  // Description
  description: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    flex: 1,
  },

  // Link
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
