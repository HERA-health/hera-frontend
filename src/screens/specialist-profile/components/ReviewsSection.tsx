import React, { useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReviewsSectionProps } from '../types';
import { ReviewCard } from './ReviewCard';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable, Button } from '../../../components/common';
import { ProfileDisclosureSection } from './ProfileDisclosureSection';
import {
  canReviewSpecialist,
  requestPublicReviewLink,
  type CanReviewSpecialistReason,
} from '../../../services/reviewsService';
import ReviewModal from '../../sessions/components/ReviewModal';

const STRINGS = {
  title: 'Reseñas de clientes',
  average: 'promedio',
  reviews: 'reseñas',
  emptyTitle: 'Sin reseñas todavía',
  seeAll: 'Ver todas las reseñas',
};

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const getDirectReviewBlockedMessage = (
  reason?: CanReviewSpecialistReason
): string => {
  if (reason === 'CLIENT_EMAIL_REQUIRED') {
    return 'Necesitamos un email asociado a tu cuenta para poder verificar y publicar tu reseña.';
  }

  if (reason === 'SPECIALIST_NOT_FOUND') {
    return 'No se pudo validar este perfil de especialista.';
  }

  return 'Para dejar una reseña necesitas haber completado una sesión HERA con este especialista.';
};

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  specialistId,
  specialistName = 'tu especialista',
  specialistAvatar,
  reviews,
  rating,
  reviewCount,
  onSeeAllPress,
  onReviewSubmitted,
  isAuthenticated = false,
  isClient = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [directReviewSessionId, setDirectReviewSessionId] = useState<string | null>(null);
  const [directReviewLoading, setDirectReviewLoading] = useState(false);
  const [directReviewMessage, setDirectReviewMessage] = useState<string | null>(null);

  const hasReviews = reviewCount > 0 && reviews.length > 0;
  const displayedReviews = reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;
  const reviewCountLabel = reviewCount === 1 ? 'reseña' : STRINGS.reviews;
  const summary = hasReviews
    ? `${rating.toFixed(1)} ${STRINGS.average} (${reviewCount} ${reviewCountLabel})`
    : STRINGS.emptyTitle;

  const canUseDirectReview = Boolean(isAuthenticated && isClient && specialistId);
  const showAddReviewCta = Boolean(specialistId && (!isAuthenticated || isClient));

  const handleDirectReview = async () => {
    if (!specialistId) {
      return;
    }

    try {
      setDirectReviewLoading(true);
      setDirectReviewMessage(null);
      setRequestOpen(false);

      const result = await canReviewSpecialist(specialistId);

      if (result.canReview && result.sessionId) {
        setDirectReviewSessionId(result.sessionId);
        return;
      }

      setDirectReviewMessage(getDirectReviewBlockedMessage(result.reason));
    } catch {
      setDirectReviewMessage('No se pudo comprobar si puedes dejar una reseña ahora mismo.');
    } finally {
      setDirectReviewLoading(false);
    }
  };

  const handleAddReviewPress = () => {
    setRequestError(null);
    setDirectReviewMessage(null);

    if (canUseDirectReview) {
      void handleDirectReview();
      return;
    }

    setRequestOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setRequestSent(false);
      }
      return nextOpen;
    });
  };

  const handleReviewSuccess = () => {
    setDirectReviewSessionId(null);
    onReviewSubmitted?.();
  };

  const handleRequestLink = async () => {
    const trimmedEmail = email.trim();

    if (!specialistId) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setRequestError('Introduce un email válido.');
      return;
    }

    try {
      setRequesting(true);
      setRequestError(null);
      await requestPublicReviewLink(specialistId, trimmedEmail);
      setRequestSent(true);
    } catch {
      setRequestSent(true);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ProfileDisclosureSection
        title={STRINGS.title}
        iconName="star-outline"
        summary={summary}
        defaultExpanded
        testID="reviews-disclosure"
      >
        <View style={styles.trustRow}>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark-outline" size={15} color={theme.success} />
            <Text style={styles.trustBadgeText}>Sesiones HERA verificadas</Text>
          </View>

          {showAddReviewCta ? (
            <AnimatedPressable
              style={styles.addButton}
              onPress={handleAddReviewPress}
              disabled={directReviewLoading}
              hoverLift={false}
              pressScale={0.98}
              accessibilityRole="button"
              accessibilityState={{ disabled: directReviewLoading }}
            >
              {directReviewLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="add-circle-outline" size={17} color={theme.primary} />
              )}
              <Text style={styles.addButtonText}>Añadir tu opinión</Text>
            </AnimatedPressable>
          ) : null}
        </View>

        {directReviewMessage ? (
          <View style={styles.directReviewMessage}>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={styles.directReviewMessageText}>{directReviewMessage}</Text>
          </View>
        ) : null}

        {requestOpen && specialistId && !canUseDirectReview ? (
          <View style={styles.requestBox}>
            {requestSent ? (
              <View style={styles.requestConfirmation}>
                <Ionicons name="mail-outline" size={20} color={theme.primary} />
                <Text style={styles.requestConfirmationText}>
                  Revisa tu correo. Si este email está asociado a una sesión HERA completada con este especialista, recibirás un enlace para dejar o editar tu opinión.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.requestLabel}>Recibe tu enlace verificado</Text>
                <View style={styles.requestControls}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!requesting}
                    style={styles.emailInput}
                  />
                  <Button
                    variant="primary"
                    size="medium"
                    onPress={() => void handleRequestLink()}
                    disabled={requesting}
                    loading={requesting}
                    icon={<Ionicons name="mail-outline" size={16} color={theme.actionPrimaryText} />}
                  >
                    Enviar enlace
                  </Button>
                </View>
                {requestError ? (
                  <Text style={styles.requestError}>{requestError}</Text>
                ) : (
                  <Text style={styles.requestHelp}>
                    Solo se enviará si este email corresponde a una sesión privada HERA completada con este especialista.
                  </Text>
                )}
              </>
            )}
          </View>
        ) : null}

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
        ) : (
          <Text style={styles.emptyText}>
            Los pacientes ya pueden añadir opiniones verificadas después de completar su sesión.
          </Text>
        )}
      </ProfileDisclosureSection>

      <ReviewModal
        visible={Boolean(directReviewSessionId)}
        sessionId={directReviewSessionId ?? ''}
        specialistName={specialistName}
        specialistAvatar={specialistAvatar}
        onClose={() => setDirectReviewSessionId(null)}
        onSuccess={handleReviewSuccess}
      />
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
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  trustBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: theme.successBg,
  },
  trustBadgeText: {
    color: theme.success,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.fontSansSemiBold,
  },
  addButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
  },
  addButtonText: {
    color: theme.primary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fontSansSemiBold,
  },
  requestBox: {
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.bgElevated,
  },
  requestLabel: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fontSansSemiBold,
  },
  requestControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    minWidth: 220,
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    backgroundColor: theme.bgCard,
    color: theme.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: theme.fontSans,
  },
  requestHelp: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fontSans,
  },
  requestError: {
    color: theme.error,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fontSansSemiBold,
  },
  requestConfirmation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  requestConfirmationText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: theme.fontSans,
  },
  directReviewMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
    backgroundColor: theme.primaryAlpha12,
  },
  directReviewMessageText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: theme.fontSans,
  },
  reviewsList: { gap: spacing.sm },
  emptyText: {
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: theme.fontSans,
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
    color: theme.primary,
    fontFamily: theme.fontSansSemiBold,
  },
});

export default ReviewsSection;
