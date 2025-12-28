/**
 * EmptyState Component
 * Inspiring, hopeful, beautiful empty state design
 * Makes users feel good about starting their wellness journey
 *
 * CRITICAL: Background harmony with #F5F7F5 (Light Sage)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'leaf-outline',
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Decorative elements */}
        <View style={styles.decorativeTop}>
          <View style={styles.decorativeLine} />
        </View>

        {/* Beautiful icon with layered background */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconOuterRing}>
            <View style={styles.iconMiddleRing}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={40}
                  color={heraLanding.primary}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Inspirational quote */}
        <View style={styles.quoteContainer}>
          <Ionicons name="sparkles" size={14} color={heraLanding.primary} />
          <Text style={styles.quoteText}>
            "El primer paso es el más importante"
          </Text>
        </View>

        {/* CTA Button */}
        {actionLabel && onAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAction}
            activeOpacity={0.9}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="arrow-forward-circle" size={22} color={colors.neutral.white} />
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Helper text */}
        <View style={styles.helperContainer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={heraLanding.textMuted} />
          <Text style={styles.helperText}>
            Especialistas verificados y confidencialidad garantizada
          </Text>
        </View>
      </View>

      {/* Floating decorative elements */}
      <View style={styles.floatingElements}>
        <View style={[styles.floatingDot, styles.floatingDot1]} />
        <View style={[styles.floatingDot, styles.floatingDot2]} />
        <View style={[styles.floatingDot, styles.floatingDot3]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isDesktop ? spacing.xxxl : spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: heraLanding.background, // #F5F7F5 Light Sage - CRITICAL
    position: 'relative',
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: isDesktop ? spacing.xxxl : spacing.xl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },

  // Decorative elements
  decorativeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    overflow: 'hidden',
  },
  decorativeLine: {
    height: 4,
    backgroundColor: heraLanding.primary,
    borderRadius: 2,
  },

  // Icon with layered rings
  iconWrapper: {
    marginBottom: spacing.xl,
  },
  iconOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${heraLanding.primary}06`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconMiddleRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${heraLanding.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: `${heraLanding.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Message
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },

  // Inspirational quote
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: `${heraLanding.primary}08`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.xl,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: heraLanding.primary,
    fontWeight: '500',
  },

  // CTA Button
  actionButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    minWidth: 220,
    shadowColor: heraLanding.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: spacing.lg,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
    letterSpacing: 0.3,
  },

  // Helper
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helperText: {
    fontSize: 12,
    color: heraLanding.textMuted,
    textAlign: 'center',
  },

  // Floating decorative elements
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  floatingDot: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: `${heraLanding.primary}15`,
  },
  floatingDot1: {
    width: 80,
    height: 80,
    top: '10%',
    left: '5%',
  },
  floatingDot2: {
    width: 60,
    height: 60,
    top: '20%',
    right: '8%',
  },
  floatingDot3: {
    width: 40,
    height: 40,
    bottom: '15%',
    left: '10%',
  },
});

export default EmptyState;
