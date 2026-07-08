import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';

import { AnimatedPressable, Button } from '../../components/common';
import { AuthorDisplaySelector } from '../../components/reviews/AuthorDisplaySelector';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type { AppRouteProp } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getPublicReviewInvitation,
  submitPublicReviewInvitation,
  type PublicReviewInvitation,
  type ReviewAuthorDisplayMode,
} from '../../services/reviewsService';

const RATING_LABELS = ['', 'Muy mala', 'Mejorable', 'Correcta', 'Buena', 'Excelente'];
const DEFAULT_AUTHOR_DISPLAY_MODE: ReviewAuthorDisplayMode = 'ANONYMOUS';

const getInvitationFallbackMessage = (error: unknown): string => {
  const code = getErrorCode(error);

  if (code === 'ALREADY_SUBMITTED') {
    return 'Esta reseña ya ha sido enviada.';
  }

  if (code === 'EXPIRED' || code === 'INVALID_OR_EXPIRED') {
    return 'El enlace de reseña ya no está disponible.';
  }

  if (code === 'UNAVAILABLE') {
    return 'Esta sesión no admite reseñas.';
  }

  return getErrorMessage(error, 'No se pudo abrir el enlace de reseña.');
};

export function PublicReviewScreen(): React.ReactElement {
  const route = useRoute<AppRouteProp<'PublicReview'>>();
  const { token } = route.params;
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const styles = useMemo(() => createStyles(theme, isDark, isCompact), [theme, isDark, isCompact]);

  const [invitation, setInvitation] = useState<PublicReviewInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [authorDisplayMode, setAuthorDisplayMode] = useState<ReviewAuthorDisplayMode>(
    DEFAULT_AUTHOR_DISPLAY_MODE
  );
  const [publicationConsentAccepted, setPublicationConsentAccepted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'SUBMITTED' | 'UPDATED' | null>(null);

  const hydrateForm = (nextInvitation: PublicReviewInvitation) => {
    const selectedMode = nextInvitation.existingReview?.authorDisplayMode
      ?? nextInvitation.selectedAuthorDisplayMode
      ?? nextInvitation.authorNameOptions[0]?.mode
      ?? DEFAULT_AUTHOR_DISPLAY_MODE;

    setAuthorDisplayMode(selectedMode);

    if (nextInvitation.status === 'EDITABLE' && nextInvitation.existingReview) {
      setRating(nextInvitation.existingReview.rating);
      setText(nextInvitation.existingReview.text);
    }
  };

  const loadInvitation = useCallback(async () => {
    try {
      setLoading(true);
      const nextInvitation = await getPublicReviewInvitation(token);
      setInvitation(nextInvitation);
      hydrateForm(nextInvitation);
      setError(null);
    } catch (loadError: unknown) {
      setInvitation(null);
      setError(getInvitationFallbackMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvitation();
  }, [loadInvitation]);

  const handleSubmit = async () => {
    const trimmedText = text.trim();

    if (rating === 0) {
      setError('Selecciona una valoración.');
      return;
    }

    if (trimmedText.length < 10) {
      setError('El comentario debe tener al menos 10 caracteres.');
      return;
    }

    if (!publicationConsentAccepted) {
      setError('Acepta la publicación de la reseña antes de enviarla.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await submitPublicReviewInvitation(token, {
        rating,
        text: trimmedText,
        authorDisplayMode,
        publicationConsentAccepted: true,
      });
      setSubmittedStatus(invitation?.status === 'EDITABLE' ? 'UPDATED' : 'SUBMITTED');
    } catch (submitError: unknown) {
      if (getErrorCode(submitError) === 'ALREADY_SUBMITTED') {
        setError(null);
        setSubmittedStatus('SUBMITTED');
        return;
      }

      setError(getErrorMessage(submitError, 'No se pudo enviar la reseña.'));
    } finally {
      setSubmitting(false);
    }
  };

  const specialistName = invitation?.specialistName ?? 'tu especialista';
  const isEditable = invitation?.status === 'EDITABLE';
  const isFormAvailable = (invitation?.status === 'AVAILABLE' || isEditable) && !submittedStatus;
  const isValid = rating > 0 && text.trim().length >= 10 && publicationConsentAccepted;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <View style={styles.shell}>
        <View style={styles.brandRail}>
          <Text style={styles.brand}>HERA</Text>
          <View style={styles.railLine} />
        </View>

        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons name="star-outline" size={22} color={theme.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Opinión verificada</Text>
              <Text style={styles.title}>
                {isEditable ? 'Actualiza tu reseña' : 'Comparte tu experiencia'}
              </Text>
              <Text style={styles.subtitle}>
                Solo aceptamos opiniones vinculadas a una sesión HERA completada. Puedes elegir cómo aparecerá tu nombre.
              </Text>
            </View>
          </View>

          {loading ? (
            <StateBlock
              icon="hourglass-outline"
              title="Preparando el formulario"
              text="Estamos validando tu enlace de reseña."
              loading
              styles={styles}
              theme={theme}
            />
          ) : submittedStatus || invitation?.status === 'SUBMITTED' ? (
            <StateBlock
              icon="checkmark-circle-outline"
              title={submittedStatus === 'UPDATED' ? 'Reseña actualizada' : 'Gracias por tu reseña'}
              text={
                submittedStatus === 'UPDATED'
                  ? `Tu opinión sobre ${specialistName} se ha actualizado.`
                  : `Tu valoración sobre ${specialistName} ha quedado registrada.`
              }
              styles={styles}
              theme={theme}
              tone="success"
            />
          ) : error && !invitation ? (
            <StateBlock
              icon="alert-circle-outline"
              title="No se pudo abrir el enlace"
              text={error}
              styles={styles}
              theme={theme}
              actionLabel="Reintentar"
              onAction={() => void loadInvitation()}
              tone="warning"
            />
          ) : invitation?.status === 'EXPIRED' ? (
            <StateBlock
              icon="time-outline"
              title="Enlace caducado"
              text="Este enlace de reseña ya no está disponible. Puedes pedir otro desde el perfil del especialista."
              styles={styles}
              theme={theme}
              tone="warning"
            />
          ) : invitation?.status === 'UNAVAILABLE' ? (
            <StateBlock
              icon="lock-closed-outline"
              title="Reseña no disponible"
              text="Esta sesión no admite reseñas en este momento."
              styles={styles}
              theme={theme}
              tone="warning"
            />
          ) : isFormAvailable ? (
            <View style={styles.form}>
              <View style={styles.specialistStrip}>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.success} />
                  <Text style={styles.verifiedText}>Sesión HERA verificada</Text>
                </View>
                <Text style={styles.specialistText} numberOfLines={2}>
                  Opinión sobre <Text style={styles.specialistName}>{specialistName}</Text>
                </Text>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.formMain}>
                  <View style={styles.ratingBlock}>
                    <Text style={styles.label}>Valoración</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <AnimatedPressable
                          key={star}
                          onPress={() => setRating(star)}
                          hoverLift
                          pressScale={0.9}
                          style={styles.starButton}
                          accessibilityRole="button"
                          accessibilityLabel={`${star} de 5`}
                        >
                          <Ionicons
                            name={star <= rating ? 'star' : 'star-outline'}
                            size={isCompact ? 30 : 34}
                            color={star <= rating ? theme.starRating : theme.borderStrong}
                          />
                        </AnimatedPressable>
                      ))}
                    </View>
                    <Text style={styles.ratingLabel}>
                      {rating > 0 ? RATING_LABELS[rating] : 'Selecciona una valoración'}
                    </Text>
                  </View>

                  <View style={styles.commentBlock}>
                    <Text style={styles.label}>Comentario</Text>
                    <TextInput
                      value={text}
                      onChangeText={setText}
                      placeholder="Cuenta qué te ha ayudado, cómo te sentiste y qué destacarías..."
                      placeholderTextColor={theme.textMuted}
                      multiline
                      maxLength={1000}
                      textAlignVertical="top"
                      style={styles.input}
                    />
                    <Text style={styles.counter}>{text.trim().length}/1000</Text>
                  </View>

                  <AuthorDisplaySelector
                    options={invitation.authorNameOptions}
                    selectedMode={authorDisplayMode}
                    onSelect={setAuthorDisplayMode}
                    disabled={submitting}
                  />

                  <AnimatedPressable
                    onPress={() => setPublicationConsentAccepted((accepted) => !accepted)}
                    style={styles.consentRow}
                    hoverLift={false}
                    accessibilityRole="button"
                    accessibilityState={{ checked: publicationConsentAccepted }}
                  >
                    <Ionicons
                      name={publicationConsentAccepted ? 'checkbox-outline' : 'square-outline'}
                      size={22}
                      color={publicationConsentAccepted ? theme.primary : theme.textSecondary}
                    />
                    <Text style={styles.consentText}>
                      Entiendo que mi reseña se publicará con el nombre visible elegido y acepto enviarla.
                    </Text>
                  </AnimatedPressable>

                  {error ? (
                    <View style={styles.inlineError}>
                      <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
                      <Text style={styles.inlineErrorText}>{error}</Text>
                    </View>
                  ) : null}

                  <Button
                    variant="primary"
                    size="large"
                    onPress={() => void handleSubmit()}
                    disabled={!isValid || submitting}
                    loading={submitting}
                    fullWidth
                    icon={<Ionicons name={isEditable ? 'save-outline' : 'send-outline'} size={18} color={theme.actionPrimaryText} />}
                  >
                    {isEditable ? 'Actualizar reseña' : 'Enviar reseña'}
                  </Button>
                </View>

                <View style={styles.tipsPanel}>
                  <View style={styles.tipsTitleRow}>
                    <Ionicons name="bulb-outline" size={18} color={theme.primary} />
                    <Text style={styles.tipsTitle}>Consejos rápidos</Text>
                  </View>
                  <Text style={styles.tipText}>Habla de tu experiencia real en la sesión.</Text>
                  <Text style={styles.tipText}>Céntrate en comunicación, trato, claridad y utilidad.</Text>
                  <Text style={styles.tipText}>Evita datos clínicos sensibles o información de terceros.</Text>
                </View>
              </View>
            </View>
          ) : (
            <StateBlock
              icon="alert-circle-outline"
              title="No se pudo abrir el enlace"
              text={error ?? 'No se pudo validar esta invitación.'}
              styles={styles}
              theme={theme}
              tone="warning"
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

interface StateBlockProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'success' | 'warning';
}

function StateBlock({
  icon,
  title,
  text,
  styles,
  theme,
  loading = false,
  actionLabel,
  onAction,
  tone = 'default',
}: StateBlockProps): React.ReactElement {
  const iconColor = tone === 'success'
    ? theme.success
    : tone === 'warning'
      ? theme.warning
      : theme.primary;

  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={theme.primary} size="small" />
        ) : (
          <Ionicons name={icon} size={28} color={iconColor} />
        )}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {actionLabel && onAction ? (
        <Button variant="secondary" size="medium" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, isCompact: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: isCompact ? spacing.lg : spacing.xxl,
      paddingVertical: isCompact ? spacing.xl : spacing.xxxl,
    },
    shell: {
      width: '100%',
      maxWidth: 1080,
      alignSelf: 'center',
      flexDirection: isCompact ? 'column' : 'row',
      gap: isCompact ? spacing.lg : spacing.xl,
      alignItems: isCompact ? 'stretch' : 'center',
    },
    brandRail: {
      width: isCompact ? '100%' : 132,
      minHeight: isCompact ? 0 : 560,
      flexDirection: isCompact ? 'row' : 'column',
      alignItems: isCompact ? 'center' : 'flex-start',
      gap: spacing.md,
    },
    brand: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      letterSpacing: 0,
    },
    railLine: {
      flex: 1,
      height: isCompact ? 1 : undefined,
      width: isCompact ? undefined : 1,
      minHeight: isCompact ? 1 : 180,
      backgroundColor: theme.border,
    },
    panel: {
      flex: 1,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      padding: isCompact ? spacing.lg : spacing.xxl,
      shadowColor: isDark ? theme.shadowStrong : theme.shadowCard,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 1,
      shadowRadius: 34,
      elevation: 8,
    },
    header: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.lg,
      alignItems: isCompact ? 'flex-start' : 'center',
      paddingBottom: spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    iconShell: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: isCompact ? 30 : 38,
      lineHeight: isCompact ? 36 : 44,
      letterSpacing: 0,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
      maxWidth: 660,
    },
    form: {
      paddingTop: spacing.xl,
      gap: spacing.lg,
    },
    specialistStrip: {
      gap: spacing.sm,
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.borderLight,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    verifiedBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.successBg,
    },
    verifiedText: {
      color: theme.success,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
      lineHeight: 16,
    },
    specialistText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    specialistName: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    formGrid: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'flex-start',
      gap: isCompact ? spacing.lg : spacing.xl,
    },
    formMain: {
      flex: 1,
      width: '100%',
      gap: spacing.lg,
    },
    tipsPanel: {
      width: isCompact ? '100%' : 270,
      gap: spacing.sm,
      borderLeftWidth: isCompact ? 0 : 1,
      borderTopWidth: isCompact ? 1 : 0,
      borderColor: theme.borderLight,
      paddingLeft: isCompact ? 0 : spacing.lg,
      paddingTop: isCompact ? spacing.lg : 0,
    },
    tipsTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    tipsTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    tipText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
    ratingBlock: {
      gap: spacing.sm,
    },
    label: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    stars: {
      flexDirection: 'row',
      gap: isCompact ? spacing.xs : spacing.sm,
      alignItems: 'center',
    },
    starButton: {
      width: isCompact ? 42 : 48,
      height: isCompact ? 42 : 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      backgroundColor: theme.primaryAlpha12,
    },
    ratingLabel: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
    },
    commentBlock: {
      gap: spacing.sm,
    },
    input: {
      minHeight: 150,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgElevated,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 23,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    counter: {
      alignSelf: 'flex-end',
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    consentText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.errorBg,
      borderColor: theme.error,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    inlineErrorText: {
      flex: 1,
      color: theme.error,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    state: {
      minHeight: 300,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingTop: spacing.xl,
    },
    stateIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: typography.fontSizes.xl,
      textAlign: 'center',
      letterSpacing: 0,
    },
    stateText: {
      maxWidth: 460,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
      textAlign: 'center',
    },
  });

export default PublicReviewScreen;
