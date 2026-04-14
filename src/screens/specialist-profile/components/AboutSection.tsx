import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AboutSectionProps } from '../types';
import { spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

export const APPROACH_TRANSLATIONS: Record<string, string> = {
  cbt: 'Cognitivo-Conductual (TCC)',
  act: 'Aceptación y Compromiso (ACT)',
  emdr: 'EMDR',
  psychodynamic: 'Psicodinámico',
  humanistic: 'Humanista',
  systemic: 'Sistémico',
  mindfulness: 'Mindfulness',
  gestalt: 'Gestalt',
};

export const AboutSection: React.FC<AboutSectionProps> = ({
  bio,
  therapeuticApproach,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  if (!bio && !therapeuticApproach) {
    return null;
  }

  const formatApproaches = (rawText: string) =>
    rawText
      .split(',')
      .map((item) => {
        const cleanItem = item.trim().toLowerCase();
        return APPROACH_TRANSLATIONS[cleanItem] || item.trim();
      })
      .join(', ');

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
          <Text style={styles.approachText}>{formatApproaches(therapeuticApproach)}</Text>
        </View>
      ) : null}
    </View>
  );
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      padding: spacing.xl,
      borderRadius: 24,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.8,
      shadowRadius: 24,
      elevation: 2,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    bioContainer: {
      gap: spacing.sm,
    },
    bioText: {
      fontSize: 16,
      lineHeight: 27,
      fontFamily: theme.fontSans,
      color: theme.textPrimary,
    },
    approachContainer: {
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    approachLabel: {
      fontSize: 12,
      fontFamily: theme.fontSansBold,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    approachText: {
      fontSize: 15,
      lineHeight: 24,
      fontFamily: theme.fontSans,
      color: theme.textPrimary,
    },
  });
}

export default AboutSection;
