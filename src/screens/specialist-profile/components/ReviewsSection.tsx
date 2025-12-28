/**
 * ReviewsSection - Client testimonials section
 * Shows review summary and list of reviews
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

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="chatbubbles-outline" size={48} color={heraLanding.textMuted} />
    <Text style={styles.emptyTitle}>Este especialista aún no tiene reseñas</Text>
    <Text style={styles.emptySubtitle}>
      Sé el primero en dejar tu opinión después de tu sesión
    </Text>
  </View>
);

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  rating,
  reviewCount,
  onSeeAllPress,
}) => {
  const displayedReviews = reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reseñas de clientes</Text>
        {reviewCount > 0 && (
          <View style={styles.summaryBadge}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.summaryText}>
              {rating.toFixed(1)} promedio ({reviewCount} reseñas)
            </Text>
          </View>
        )}
      </View>

      {/* Reviews List or Empty State */}
      {displayedReviews.length > 0 ? (
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
          <Text style={styles.seeAllText}>Ver todas las reseñas</Text>
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: heraLanding.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
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
