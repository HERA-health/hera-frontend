/**
 * FeatureCard Component
 * Displays a feature with an icon, title, and description
 * Used on the home screen to showcase platform features
 *
 * Usage:
 * <FeatureCard
 *   icon="brain"
 *   iconColor="#4169E1"
 *   iconBackground="#E0F2FE"
 *   title="Matching Inteligente"
 *   description="Encuentra especialistas afines"
 * />
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { colors, spacing, typography } from '../../constants/colors';
import { Feature } from '../../constants/types';

interface FeatureCardProps {
  feature: Feature;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  return (
    <Card style={styles.card} padding="medium">
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: feature.iconBackground },
        ]}
      >
        <Ionicons
          name={feature.icon as any}
          size={24}
          color={feature.iconColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{feature.title}</Text>
        <Text style={styles.description}>{feature.description}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
});
