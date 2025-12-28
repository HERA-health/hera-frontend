/**
 * AboutSection - Bio and therapeutic approach section
 * Simple, readable presentation of specialist's description
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { AboutSectionProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

export const AboutSection: React.FC<AboutSectionProps> = ({
  bio,
  therapeuticApproach,
}) => {
  if (!bio && !therapeuticApproach) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sobre mí</Text>

      {bio && (
        <View style={styles.bioContainer}>
          {bio.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.bioText}>
              {paragraph}
            </Text>
          ))}
        </View>
      )}

      {therapeuticApproach && (
        <View style={styles.approachContainer}>
          <Text style={styles.approachLabel}>Enfoque terapéutico</Text>
          <Text style={styles.approachText}>{therapeuticApproach}</Text>
        </View>
      )}
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
    fontSize: 14,
    fontWeight: '600',
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
