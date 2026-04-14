import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewsSectionProps } from '../types';
import { ReviewCard } from './ReviewCard';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/common';

const STRINGS = {
  title: 'Reseñas de clientes',
  average: 'promedio',
  reviews: 'reseñas',
  emptyTitle: 'Las reseñas llegarán pronto',
  emptySubtitle: 'Los pacientes podrán valorar sus sesiones próximamente',
  seeAll: 'Ver todas las reseñas',
};

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  rating,
  reviewCount,
  onSeeAllPress,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const hasReviews = reviewCount > 0 && reviews.length > 0;
  const displayedReviews = reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{STRINGS.title}</Text>
        {hasReviews && (
          <View style={styles.summaryBadge}>
            <Ionicons name="star" size={16} color={theme.warning} />
            <Text style={styles.summaryText}>{rating.toFixed(1)} {STRINGS.average} ({reviewCount} {STRINGS.reviews})</Text>
          </View>
        )}
      </View>

      {hasReviews ? (
        <View style={styles.reviewsList}>
          {displayedReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyStars}>★★★★★</Text>
          <Text style={styles.emptyTitle}>{STRINGS.emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{STRINGS.emptySubtitle}</Text>
        </View>
      )}

      {hasMoreReviews && onSeeAllPress && (
        <AnimatedPressable style={styles.seeAllButton} onPress={onSeeAllPress} hoverLift={false} pressScale={0.98}>
          <Text style={styles.seeAllText}>{STRINGS.seeAll}</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.primary} />
        </AnimatedPressable>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...shadows.sm,
  },
  header: { marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.xs },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  summaryText: { fontSize: 14, color: theme.textSecondary },
  reviewsList: { gap: spacing.sm },
  emptyContainer: {
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
  },
  emptyStars: { fontSize: 22, color: theme.warning, letterSpacing: 4, marginBottom: spacing.md },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  emptySubtitle: { fontSize: 12, color: theme.textMuted, textAlign: 'center', maxWidth: 280 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.lg, paddingVertical: spacing.sm },
  seeAllText: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});

export default ReviewsSection;
