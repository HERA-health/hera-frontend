import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { borderRadius, spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { createReview } from '../../../services/reviewsService';

interface ReviewModalProps {
  visible: boolean;
  sessionId: string;
  specialistName: string;
  specialistAvatar?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MODAL_MAX_WIDTH = 560;
const RATING_LABELS = ['', 'Muy mala', 'Mejorable', 'Correcta', 'Buena', 'Excelente'];

const SuccessView: React.FC<{ specialistName: string; rating: number; theme: Theme }> = ({
  specialistName,
  rating,
  theme,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const styles = useMemo(() => createSuccessStyles(theme), [theme]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  return (
    <View style={styles.successContainer}>
      <Animated.View
        style={[
          styles.successIconShell,
          { backgroundColor: theme.successBg, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons name="checkmark" size={40} color={theme.success} />
      </Animated.View>

      <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Gracias por tu reseña</Text>
      <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
        Tu valoración sobre {specialistName} ayudará a otras personas a elegir con más confianza.
      </Text>

      <View style={styles.successStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
            color={star <= rating ? theme.starRating : theme.border}
          />
        ))}
      </View>
    </View>
  );
};

const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  sessionId,
  specialistName,
  specialistAvatar,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(18)).current;
  const cardScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
      ]).start();
      return;
    }

    backdropAnim.setValue(0);
    cardAnim.setValue(18);
    cardScale.setValue(0.98);
  }, [visible, backdropAnim, cardAnim, cardScale]);

  const resetState = () => {
    setRating(0);
    setText('');
    setError(null);
    setSubmitted(false);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      setError('No se encontró la sesión a reseñar.');
      return;
    }
    if (rating === 0) {
      setError('Selecciona una valoración.');
      return;
    }
    if (text.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await createReview({ sessionId, rating, text: text.trim() });
      setSubmitted(true);
      setTimeout(() => {
        resetState();
        onSuccess();
      }, 1200);
    } catch {
      setError('No se pudo enviar la reseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = rating > 0 && text.trim().length >= 10;
  const initials = specialistName
    ? specialistName
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <AnimatedPressable
            onPress={handleClose}
            style={StyleSheet.absoluteFillObject}
            hoverLift={false}
            pressScale={1}
          >
            <View style={StyleSheet.absoluteFillObject} />
          </AnimatedPressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY: cardAnim }, { scale: cardScale }] },
          ]}
        >
          {submitted ? (
            <SuccessView specialistName={specialistName} rating={rating} theme={theme} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <View style={styles.headerBadge}>
                    <Ionicons name="star-outline" size={14} color={theme.secondaryDark} />
                    <Text style={styles.headerBadgeText}>Reseña</Text>
                  </View>
                  <Text style={styles.title}>Cuéntanos cómo fue tu sesión</Text>
                  <Text style={styles.subtitle}>
                    Tu opinión ayuda a otras personas y mejora la confianza en la plataforma.
                  </Text>
                </View>

                <AnimatedPressable
                  onPress={handleClose}
                  style={styles.closeButton}
                  hoverLift={false}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </AnimatedPressable>
              </View>

              <View style={styles.specialistCard}>
                {specialistAvatar ? (
                  <Image source={{ uri: specialistAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{initials}</Text>
                  </View>
                )}

                <View style={styles.specialistCopy}>
                  <Text style={styles.specialistLabel}>Reseña para</Text>
                  <Text style={styles.specialistName}>{specialistName}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Valoración</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= rating;
                    return (
                      <AnimatedPressable
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.starButton}
                        hoverLift={false}
                      >
                        <Ionicons
                          name={active ? 'star' : 'star-outline'}
                          size={34}
                          color={active ? theme.starRating : theme.textMuted}
                        />
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {rating > 0 ? (
                  <View style={[styles.ratingPill, { backgroundColor: `${theme.starRating}18` }]}>
                    <Text style={[styles.ratingPillText, { color: theme.starRating }]}>
                      {RATING_LABELS[rating]}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Comentario</Text>
                  <Text style={styles.charCounter}>{text.length}/1000</Text>
                </View>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Escribe aquí cómo fue tu experiencia con este especialista..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  editable={!loading}
                  textAlignVertical="top"
                  style={styles.input}
                />
              </View>

              <View style={styles.privacyNotice}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.textMuted} />
                <Text style={styles.privacyText}>
                  Tu nombre aparecerá abreviado para proteger tu privacidad.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={15} color={theme.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Button variant="outline" size="medium" onPress={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={handleSubmit}
                  disabled={!isValid || loading}
                  icon={
                    loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                    )
                  }
                >
                  Enviar reseña
                </Button>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? spacing.xl : spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(8,10,14,0.72)' : 'rgba(18,24,18,0.38)',
    },
    card: {
      width: '100%',
      maxWidth: MODAL_MAX_WIDTH,
      maxHeight: '88%',
      borderRadius: borderRadius.xxl,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 28,
      elevation: 10,
      overflow: 'hidden',
    },
    scrollContent: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.secondaryAlpha12,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    headerBadgeText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.secondaryDark,
    },
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.bgElevated : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    specialistCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.xl,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
    },
    avatarFallback: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    avatarFallbackText: {
      fontSize: 18,
      fontFamily: theme.fontSansBold,
      color: theme.primary,
    },
    specialistCopy: {
      flex: 1,
      gap: 2,
    },
    specialistLabel: {
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
    },
    specialistName: {
      fontSize: 16,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    section: {
      gap: spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionLabel: {
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    starButton: {
      padding: 4,
    },
    ratingPill: {
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: borderRadius.full,
    },
    ratingPillText: {
      fontSize: 14,
      fontFamily: theme.fontSansBold,
    },
    charCounter: {
      fontSize: 12,
      fontFamily: theme.fontSans,
      color: theme.textMuted,
    },
    input: {
      minHeight: 128,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.bgElevated : theme.bgMuted,
      color: theme.textPrimary,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: theme.fontSans,
    },
    privacyNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    privacyText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: `${theme.error}12`,
      borderWidth: 1,
      borderColor: `${theme.error}30`,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.error,
    },
    actions: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
  });

const createSuccessStyles = (theme: Theme) =>
  StyleSheet.create({
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxxl,
      gap: spacing.lg,
    },
    successIconShell: {
      width: 88,
      height: 88,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: {
      fontSize: 24,
      fontFamily: theme.fontDisplayBold,
      textAlign: 'center',
    },
    successSubtitle: {
      fontSize: 15,
      lineHeight: 23,
      textAlign: 'center',
      fontFamily: theme.fontSans,
      maxWidth: 360,
    },
    successStars: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
  });

export default ReviewModal;
