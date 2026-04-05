/**
 * ReviewsSection - Client testimonials section
 * Shows review cards or honest empty state placeholder
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewsSectionProps } from '../types';
import { ReviewCard } from './ReviewCard';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const STRINGS = {
  title: 'Reseñas de clientes',
  average: 'promedio',
  reviews: 'reseñas',
  emptyTitle: 'Las reseñas llegan pronto',
  emptySubtitle: 'Los pacientes podrán valorar sus sesiones próximamente',
  seeAll: 'Ver todas las reseñas',
};

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyStars}>★★★★★</Text>
    <Text style={styles.emptyTitle}>{STRINGS.emptyTitle}</Text>
    <Text style={styles.emptySubtitle}>{STRINGS.emptySubtitle}</Text>
  </View>
);

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  rating,
  reviewCount,
  onSeeAllPress,
}) => {
  const hasReviews = reviewCount > 0 && reviews.length > 0;
  const displayedReviews = reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{STRINGS.title}</Text>
        {hasReviews && (
          <View style={styles.summaryBadge}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.summaryText}>
              {rating.toFixed(1)} {STRINGS.average} ({reviewCount} {STRINGS.reviews})
            </Text>
          </View>
        )}
      </View>

      {/* Reviews List or Empty State */}
      {hasReviews ? (
        <View style={styles.reviewsList}>
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </View>
      ) : (
        <EmptyState />
      )}

      {/* See All Button */}
      {hasMoreReviews && onSeeAllPress && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onSeeAllPress}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>{STRINGS.seeAll}</Text>
          <Ionicons name="arrow-forward" size={16} color={heraLanding.primary} />
        </TouchableOpacity>
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  reviewsList: {
    gap: spacing.sm,
  },

  // Empty state
  emptyContainer: {
    borderWidth: 0.5,
    borderColor: heraLanding.textMuted,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStars: {
    fontSize: 22,
    color: '#E8B45D',
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: heraLanding.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },

  // See all
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  seeAllText: {
    fontSize: 15,
    color: heraLanding.primary,
    fontWeight: '500',
  },
});

export default ReviewsSection;
