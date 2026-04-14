import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCardProps } from '../types';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

const StarRating: React.FC<{ rating: number; styles: ReturnType<typeof createStyles>; warning: string; border: string }> = ({ rating, styles, warning, border }) => (
  <View style={styles.starsContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={14} color={star <= rating ? warning : border} />
    ))}
  </View>
);

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      <StarRating rating={review.rating} styles={styles} warning={theme.warning} border={theme.border} />
      <Text style={styles.reviewText} numberOfLines={4}>"{review.text}"</Text>
      <Text style={styles.author}>— {review.authorName}, {new Date(review.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
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
  starsContainer: { flexDirection: 'row', gap: 2, marginBottom: spacing.sm },
  reviewText: { fontSize: 15, lineHeight: 24, color: theme.textPrimary, fontStyle: 'italic', marginBottom: spacing.sm },
  author: { fontSize: 13, color: theme.textMuted },
});

export default ReviewCard;
