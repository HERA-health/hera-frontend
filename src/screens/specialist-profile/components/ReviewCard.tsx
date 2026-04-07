/**
 * ReviewCard - Individual review display component
 * Shows rating, text, and author with timestamp
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCardProps } from '../types';
import { heraLanding, spacing, borderRadius } from '../../../constants/colors';

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={styles.starsContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : 'star-outline'}
        size={14}
        color={star <= rating ? '#FFB800' : heraLanding.border}
      />
    ))}
  </View>
);

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <View style={styles.container}>
      <StarRating rating={review.rating} />

      <Text style={styles.reviewText} numberOfLines={4}>
        "{review.text}"
      </Text>

      <Text style={styles.author}>
        — {review.authorName}, {new Date(review.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: spacing.sm,
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 24,
    color: heraLanding.textPrimary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  author: {
    fontSize: 13,
    color: heraLanding.textMuted,
  },
});

export default ReviewCard;
