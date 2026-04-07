import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius, layout } from '../../../constants/colors';
import { createReview } from '../../../services/reviewsService';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 768;

// Rating palette — derived from design token colors, one per star tier
const RATING_COLORS = [
  '',
  colors.feedback.error,       // 1★ — rojo
  colors.secondary.orange,     // 2★ — naranja
  colors.feedback.warning,     // 3★ — ámbar
  heraLanding.success,         // 4★ — verde salvia
  colors.feedback.success,     // 5★ — verde esmeralda
];

const MODAL_MAX_WIDTH = 520; // modal-specific layout constant (no token cubre esto)

interface ReviewModalProps {
  visible: boolean;
  sessionId: string;
  specialistName: string;
  specialistAvatar?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  sessionId,
  specialistName,
  specialistAvatar,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const starAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }),
      ]).start();
    } else {
      slideAnim.setValue(60);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.96);
    }
  }, [visible]);

  const animateStar = (index: number) => {
    Animated.sequence([
      Animated.spring(starAnims[index], { toValue: 1.4, useNativeDriver: true, tension: 200, friction: 6 }),
      Animated.spring(starAnims[index], { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
  };

  const handleStarPress = (star: number) => {
    setRating(star);
    for (let i = 0; i < star; i++) {
      setTimeout(() => animateStar(i), i * 60);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Selecciona una valoración'); return; }
    if (text.trim().length < 10) { setError('El comentario debe tener al menos 10 caracteres'); return; }
    setError(null);
    setLoading(true);
    try {
      await createReview({ sessionId, rating, text: text.trim() });
      setSubmitted(true);
      setTimeout(() => onSuccess(), 1800);
    } catch {
      setError('No se pudo enviar la reseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setRating(0);
    setText('');
    setError(null);
    setSubmitted(false);
    onClose();
  };

  const charCount = text.length;
  const isValid = rating > 0 && charCount >= 10 && charCount <= 1000;
  const activeRating = hoveredRating || rating;
  const activeColor = activeRating ? RATING_COLORS[activeRating] : heraLanding.border;

  const initials = specialistName
    ? specialistName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {submitted ? (
            <SuccessView specialistName={specialistName} rating={rating} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconBg}>
                    <Ionicons name="star" size={16} color={heraLanding.starRating} />
                  </View>
                  <Text style={styles.headerTitle}>Deja tu reseña</Text>
                </View>
                <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={heraLanding.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Specialist banner */}
              <View style={styles.specialistBanner}>
                {specialistAvatar ? (
                  <Image source={{ uri: specialistAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
                <View style={styles.specialistInfo}>
                  <Text style={styles.specialistLabel}>Tu sesión con</Text>
                  <Text style={styles.specialistName}>{specialistName}</Text>
                </View>
                <View style={styles.sessionBadge}>
                  <Ionicons name="videocam-outline" size={12} color={heraLanding.primary} />
                  <Text style={styles.sessionBadgeText}>Sesión</Text>
                </View>
              </View>

              {/* Stars */}
              <View style={styles.starsSection}>
                <Text style={styles.sectionLabel}>¿Cómo fue tu experiencia?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= activeRating;
                    const starColor = activeRating >= star ? RATING_COLORS[activeRating] : heraLanding.border;
                    return (
                      <Animated.View key={star} style={{ transform: [{ scale: starAnims[star - 1] }] }}>
                        <TouchableOpacity
                          onPress={() => handleStarPress(star)}
                          activeOpacity={0.8}
                          style={styles.starBtn}
                        >
                          <Ionicons
                            name={filled ? 'star' : 'star-outline'}
                            size={42}
                            color={starColor}
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
                {activeRating > 0 && (
                  <Animated.View style={styles.ratingLabelContainer}>
                    <View style={[styles.ratingPill, { backgroundColor: `${RATING_COLORS[activeRating]}18` }]}>
                      <Text style={[styles.ratingPillText, { color: RATING_COLORS[activeRating] }]}>
                        {RATING_LABELS[activeRating]}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Text input */}
              <View style={styles.textSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.sectionLabel}>Tu comentario</Text>
                  <Text style={[
                    styles.charCounter,
                    charCount > 0 && charCount < 10 && styles.charCounterError,
                  ]}>
                    {charCount}/1000
                  </Text>
                </View>
                <TextInput
                  style={[styles.textInput, { borderColor: charCount > 0 && charCount < 10 ? colors.feedback.error : heraLanding.border }]}
                  value={text}
                  onChangeText={setText}
                  placeholder="Cuéntanos cómo fue tu experiencia con este especialista…"
                  placeholderTextColor={heraLanding.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  editable={!loading}
                  textAlignVertical="top"
                />
              </View>

              {/* Privacy note */}
              <View style={styles.privacyRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={heraLanding.textMuted} />
                <Text style={styles.privacyText}>
                  Tu nombre aparecerá abreviado para proteger tu privacidad
                </Text>
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.feedback.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={17} color="#fff" />
                    <Text style={styles.submitBtnText}>Enviar reseña</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Success screen ───────────────────────────────────────────────────────────
const SuccessView: React.FC<{ specialistName: string; rating: number }> = ({ specialistName, rating }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();
  }, []);
  return (
    <View style={styles.successContainer}>
      <Animated.View style={[styles.successIcon, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark-circle" size={64} color={heraLanding.success} />
      </Animated.View>
      <Text style={styles.successTitle}>¡Gracias por tu reseña!</Text>
      <Text style={styles.successSub}>
        Tu valoración de {specialistName} ayuda a otros a encontrar la ayuda que necesitan.
      </Text>
      <View style={styles.successStars}>
        {[1, 2, 3, 4, 5].map(s => (
          <Ionicons
            key={s}
            name={s <= rating ? 'star' : 'star-outline'}
            size={22}
            color={s <= rating ? heraLanding.starRating : heraLanding.border}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isDesktop ? 0 : spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: heraLanding.overlay ?? 'rgba(20, 30, 20, 0.55)',
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxWidth: MODAL_MAX_WIDTH,
    maxHeight: '90%',
    shadowColor: heraLanding.shadowColorStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xl + spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${heraLanding.starRating}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Specialist banner
  specialistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: heraLanding.primaryAlpha12,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 17,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  specialistInfo: {
    flex: 1,
  },
  specialistLabel: {
    fontSize: 11,
    color: heraLanding.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specialistName: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // Stars
  starsSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabelContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  ratingPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingPillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: heraLanding.borderLight,
    marginBottom: spacing.lg,
  },

  // Text section
  textSection: {
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  charCounter: {
    fontSize: 12,
    color: heraLanding.textMuted,
  },
  charCounterError: {
    color: colors.feedback.error,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 15,
    color: heraLanding.textPrimary,
    minHeight: 110,
    backgroundColor: heraLanding.background,
    lineHeight: 22,
  },

  // Privacy
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  privacyText: {
    fontSize: 12,
    color: heraLanding.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.feedback.error}10`,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: colors.feedback.error,
    flex: 1,
  },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: heraLanding.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: heraLanding.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    backgroundColor: heraLanding.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Success
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    maxWidth: 340,
  },
  successStars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

export default ReviewModal;
