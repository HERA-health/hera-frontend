import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReviewCardProps } from '../types';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

const StarRating: React.FC<{
  rating: number;
  styles: ReturnType<typeof createStyles>;
  warning: string;
  border: string;
}> = ({ rating, styles, warning, border }) => (
  <View style={styles.starsContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : 'star-outline'}
        size={14}
        color={star <= rating ? warning : border}
      />
    ))}
  </View>
);

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const formattedDate = new Date(review.date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <StarRating rating={review.rating} styles={styles} warning={theme.warning} border={theme.border} />
        <View style={styles.verifiedBadge}>
          <Ionicons name="shield-checkmark-outline" size={13} color={theme.success} />
          <Text style={styles.verifiedBadgeText}>Sesión verificada</Text>
        </View>
      </View>
      <Text style={styles.reviewText} numberOfLines={4}>"{review.text}"</Text>
      <Text style={styles.author}>— {review.authorName}, {formattedDate}</Text>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  verifiedBadge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.successBg,
  },
  verifiedBadgeText: {
    color: theme.success,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: theme.fontSansSemiBold,
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.textPrimary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  author: {
    fontSize: 13,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
  },
});

export default ReviewCard;
