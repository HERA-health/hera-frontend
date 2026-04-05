import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AboutSectionProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

export const APPROACH_TRANSLATIONS: Record<string, string> = {
  'cbt': 'Cognitivo-Conductual (TCC)',
  'act': 'Aceptación y Compromiso (ACT)',
  'emdr': 'EMDR',
  'psychodynamic': 'Psicodinámico',
  'humanistic': 'Humanista',
  'systemic': 'Sistémico',
  'mindfulness': 'Mindfulness',
  'gestalt': 'Gestalt',
};

export const AboutSection: React.FC<AboutSectionProps> = ({
  bio,
  therapeuticApproach,
}) => {
  if (!bio && !therapeuticApproach) {
    return null;
  }

  // Función para traducir las claves separadas por coma
  const formatApproaches = (rawText: string) => {
    return rawText.split(',').map(item => {
      const cleanItem = item.trim().toLowerCase();
      return APPROACH_TRANSLATIONS[cleanItem] || item.trim();
    }).join(', ');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sobre mí</Text>

      {bio ? (
        <View style={styles.bioContainer}>
          {bio.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.bioText}>
              {paragraph}
            </Text>
          ))}
        </View>
      ) : null}

      {therapeuticApproach ? (
        <View style={styles.approachContainer}>
          <Text style={styles.approachLabel}>Enfoque terapéutico</Text>
          <Text style={styles.approachText}>
            {formatApproaches(therapeuticApproach)}
          </Text>
        </View>
      ) : null}
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
    marginBottom: spacing.md,
  },
  bioContainer: {
    gap: spacing.sm,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 26,
    color: heraLanding.textPrimary,
  },
  approachContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  approachLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: heraLanding.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  approachText: {
    fontSize: 15,
    lineHeight: 24,
    color: heraLanding.textPrimary,
  },
});

export default AboutSection;
