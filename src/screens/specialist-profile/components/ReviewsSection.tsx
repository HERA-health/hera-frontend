import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReviewsSectionProps } from '../types';
import { ReviewCard } from './ReviewCard';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/common';
import { ProfileDisclosureSection } from './ProfileDisclosureSection';

const STRINGS = {
  title: 'Reseñas de clientes',
  average: 'promedio',
  reviews: 'reseñas',
  emptyTitle: 'Sin reseñas todavía',
  seeAll: 'Ver todas las reseñas',
};

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  rating,
  reviewCount,
  onSeeAllPress,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasReviews = reviewCount > 0 && reviews.length > 0;
  const displayedReviews = reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;
  const reviewCountLabel = reviewCount === 1 ? 'reseña' : STRINGS.reviews;
  const summary = hasReviews
    ? `${rating.toFixed(1)} ${STRINGS.average} (${reviewCount} ${reviewCountLabel})`
    : STRINGS.emptyTitle;

  return (
    <View style={styles.container}>
      <ProfileDisclosureSection
        title={STRINGS.title}
        iconName="star-outline"
        summary={summary}
        defaultExpanded={hasReviews}
        testID="reviews-disclosure"
      >
        {hasReviews ? (
          <>
            <View style={styles.reviewsList}>
              {displayedReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </View>

            {hasMoreReviews && onSeeAllPress ? (
              <AnimatedPressable style={styles.seeAllButton} onPress={onSeeAllPress} hoverLift={false} pressScale={0.98}>
                <Text style={styles.seeAllText}>{STRINGS.seeAll}</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.primary} />
              </AnimatedPressable>
            ) : null}
          </>
        ) : null}
      </ProfileDisclosureSection>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...shadows.sm,
  },
  reviewsList: { gap: spacing.sm },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.lg, paddingVertical: spacing.sm },
  seeAllText: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});

export default ReviewsSection;
