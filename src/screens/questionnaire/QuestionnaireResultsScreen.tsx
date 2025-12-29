import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { heraLanding, spacing, borderRadius } from '../../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MatchResult } from '../../utils/matchingAlgorithm';
import { LinearGradient } from 'expo-linear-gradient';

// HERA Design Colors
const HERA_COLORS = {
  background: '#F5F7F5',       // Light Sage - CRITICAL
  cardBg: '#FFFFFF',
  primary: '#8B9D83',          // Sage Green
  primaryLight: '#A8B8A0',
  primaryDark: '#6E8066',
  success: '#7BA377',          // Match percentage color
  successBg: '#F0F7F0',        // Match percentage background
  textPrimary: '#2C3E2C',      // Forest green
  textSecondary: '#6B7B6B',
  textMuted: '#9BA89B',
  border: '#E8EBE8',
  borderLight: '#F0F4F0',
  white: '#FFFFFF',
  celebration: '#FFD700',      // Gold for celebration
};

export function QuestionnaireResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const results: MatchResult[] = route.params?.results || [];

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const cardAnimations = useRef(results.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      // Header animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      // Staggered card animations
      Animated.stagger(
        100,
        cardAnimations.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, []);

  const topMatch = results[0];
  const otherMatches = results.slice(1, 6); // Show up to 5 more

  // Calculate grid columns
  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Empty state
  if (!results || results.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={64} color={HERA_COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No encontramos matches exactos</Text>
          <Text style={styles.emptyDescription}>
            Pero tenemos especialistas que pueden ayudarte.
          </Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Specialists')}
            >
              <Text style={styles.primaryButtonText}>Ver todos los especialistas</Text>
              <Ionicons name="arrow-forward" size={18} color={HERA_COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.navigate('Questionnaire')}
            >
              <Ionicons name="refresh" size={18} color={HERA_COLORS.primary} />
              <Text style={styles.outlineButtonText}>Ajustar preferencias</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render match percentage badge
  const renderMatchBadge = (percentage: number, size: 'large' | 'small' = 'small') => (
    <View style={[styles.matchBadge, size === 'large' && styles.matchBadgeLarge]}>
      <Ionicons
        name="checkmark-circle"
        size={size === 'large' ? 20 : 16}
        color={HERA_COLORS.success}
      />
      <Text style={[styles.matchBadgeText, size === 'large' && styles.matchBadgeTextLarge]}>
        {percentage}% match
      </Text>
    </View>
  );

  // Render specialist card
  const renderSpecialistCard = (
    result: MatchResult,
    index: number,
    isTopMatch: boolean = false
  ) => {
    const { specialist, affinityScore, matchedAttributes } = result;
    const percentage = specialist.affinityPercentage || Math.round((affinityScore / 130) * 100);
    const animValue = cardAnimations[index] || new Animated.Value(1);

    return (
      <Animated.View
        key={specialist.id}
        style={[
          styles.specialistCard,
          isTopMatch && styles.topMatchCard,
          {
            opacity: animValue,
            transform: [{
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}
      >
        {isTopMatch && (
          <View style={styles.topMatchBanner}>
            <Ionicons name="trophy" size={16} color={HERA_COLORS.celebration} />
            <Text style={styles.topMatchBannerText}>Tu Mejor Match</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {specialist.avatar ? (
              <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[HERA_COLORS.primary, HERA_COLORS.primaryDark]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {specialist.initial || specialist.name.charAt(0)}
                </Text>
              </LinearGradient>
            )}
            {specialist.firstVisitFree && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gratis</Text>
              </View>
            )}
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.specialistName} numberOfLines={1}>
              {specialist.name}
            </Text>
            <Text style={styles.specialistSpecialization} numberOfLines={1}>
              {specialist.specialization}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFB800" />
              <Text style={styles.ratingText}>
                {specialist.rating} ({specialist.reviewCount})
              </Text>
            </View>
          </View>

          {renderMatchBadge(percentage, isTopMatch ? 'large' : 'small')}
        </View>

        {/* Match reasons */}
        {matchedAttributes && matchedAttributes.length > 0 && (
          <View style={styles.matchReasons}>
            <Text style={styles.matchReasonsTitle}>Por que es buen match:</Text>
            <View style={styles.matchReasonsList}>
              {matchedAttributes.slice(0, 3).map((attr, idx) => (
                <View key={idx} style={styles.matchReason}>
                  <Ionicons name="checkmark" size={14} color={HERA_COLORS.success} />
                  <Text style={styles.matchReasonText}>{attr}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>
            {specialist.pricePerSession}€/sesion
          </Text>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => navigation.navigate('SpecialistDetail', { specialistId: specialist.id })}
          >
            <Text style={styles.viewProfileButtonText}>Ver perfil</Text>
            <Ionicons name="arrow-forward" size={16} color={HERA_COLORS.white} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isMobile ? spacing.md : spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <Animated.View
          style={[
            styles.successHeader,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <View style={styles.celebrationIcon}>
            <Text style={styles.celebrationEmoji}>✨</Text>
          </View>
          <Text style={[styles.successTitle, { fontSize: isMobile ? 28 : 36 }]}>
            ¡Listo!
          </Text>
          <Text style={[styles.successSubtitle, { fontSize: isMobile ? 16 : 18 }]}>
            Encontramos {results.length} especialista{results.length > 1 ? 's' : ''} perfecto{results.length > 1 ? 's' : ''} para ti
          </Text>
        </Animated.View>

        {/* Match Summary Card */}
        <Animated.View
          style={[
            styles.summaryCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Ionicons name="clipboard-outline" size={20} color={HERA_COLORS.primary} />
            <Text style={styles.summaryTitle}>Basado en tus preferencias</Text>
          </View>
          <Text style={styles.summaryDescription}>
            Hemos analizado tus respuestas y encontrado especialistas que coinciden con lo que buscas.
          </Text>
          <TouchableOpacity
            style={styles.editPreferencesLink}
            onPress={() => navigation.navigate('Questionnaire')}
          >
            <Text style={styles.editPreferencesText}>Editar preferencias</Text>
            <Ionicons name="chevron-forward" size={16} color={HERA_COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Top Match */}
        {topMatch && (
          <View style={styles.section}>
            {renderSpecialistCard(topMatch, 0, true)}
          </View>
        )}

        {/* Other Matches */}
        {otherMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Otros especialistas recomendados</Text>
            <View style={[
              styles.matchesGrid,
              gridColumns === 1 && styles.matchesGridSingle,
            ]}>
              {otherMatches.map((result, idx) => (
                <View
                  key={result.specialist.id}
                  style={[
                    styles.gridItem,
                    gridColumns > 1 && { width: `${100 / gridColumns - 2}%` },
                  ]}
                >
                  {renderSpecialistCard(result, idx + 1)}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* More Options */}
        <View style={styles.moreOptionsSection}>
          <Text style={styles.moreOptionsTitle}>¿Quieres ver mas opciones?</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Specialists')}
          >
            <Text style={styles.viewAllButtonText}>Ver todos los especialistas</Text>
            <Ionicons name="arrow-forward" size={18} color={HERA_COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Retake Questionnaire */}
        <View style={styles.retakeSection}>
          <View style={styles.retakeContent}>
            <Ionicons name="refresh-outline" size={24} color={HERA_COLORS.textSecondary} />
            <View style={styles.retakeTextContainer}>
              <Text style={styles.retakeTitle}>¿Cambiaron tus necesidades?</Text>
              <Text style={styles.retakeDescription}>
                Puedes actualizar tus preferencias en cualquier momento
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => navigation.navigate('Questionnaire')}
          >
            <Ionicons name="create-outline" size={18} color={HERA_COLORS.primary} />
            <Text style={styles.retakeButtonText}>Actualizar cuestionario</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="home-outline" size={18} color={HERA_COLORS.textSecondary} />
            <Text style={styles.homeButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HERA_COLORS.background, // #F5F7F5 Light Sage - CRITICAL
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },

  // Success Header
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
  },
  celebrationIcon: {
    marginBottom: spacing.md,
  },
  celebrationEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontWeight: '700',
    color: HERA_COLORS.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    color: HERA_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: HERA_COLORS.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: HERA_COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: HERA_COLORS.textPrimary,
  },
  summaryDescription: {
    fontSize: 14,
    color: HERA_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  editPreferencesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editPreferencesText: {
    fontSize: 14,
    fontWeight: '600',
    color: HERA_COLORS.primary,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: HERA_COLORS.textPrimary,
    marginBottom: spacing.lg,
  },

  // Matches Grid
  matchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  matchesGridSingle: {
    flexDirection: 'column',
  },
  gridItem: {
    marginBottom: spacing.md,
  },

  // Specialist Card
  specialistCard: {
    backgroundColor: HERA_COLORS.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  topMatchCard: {
    borderWidth: 2,
    borderColor: HERA_COLORS.success,
  },
  topMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  topMatchBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B8860B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: HERA_COLORS.white,
  },
  freeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: HERA_COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: HERA_COLORS.white,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: HERA_COLORS.white,
  },
  cardInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: 17,
    fontWeight: '700',
    color: HERA_COLORS.textPrimary,
    marginBottom: 2,
  },
  specialistSpecialization: {
    fontSize: 14,
    color: HERA_COLORS.textSecondary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: HERA_COLORS.textSecondary,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: HERA_COLORS.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  matchBadgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  matchBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: HERA_COLORS.success,
  },
  matchBadgeTextLarge: {
    fontSize: 15,
    fontWeight: '700',
  },
  matchReasons: {
    backgroundColor: HERA_COLORS.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  matchReasonsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: HERA_COLORS.textMuted,
    marginBottom: spacing.sm,
  },
  matchReasonsList: {
    gap: spacing.xs,
  },
  matchReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchReasonText: {
    fontSize: 14,
    color: HERA_COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: HERA_COLORS.primary,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: HERA_COLORS.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: HERA_COLORS.white,
  },

  // More Options
  moreOptionsSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: HERA_COLORS.borderLight,
    marginBottom: spacing.lg,
  },
  moreOptionsTitle: {
    fontSize: 16,
    color: HERA_COLORS.textSecondary,
    marginBottom: spacing.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: HERA_COLORS.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  viewAllButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: HERA_COLORS.primary,
  },

  // Retake Section
  retakeSection: {
    backgroundColor: HERA_COLORS.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  retakeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  retakeTextContainer: {
    flex: 1,
  },
  retakeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: HERA_COLORS.textPrimary,
    marginBottom: spacing.xs,
  },
  retakeDescription: {
    fontSize: 14,
    color: HERA_COLORS.textSecondary,
    lineHeight: 20,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: HERA_COLORS.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: HERA_COLORS.primary,
  },

  // Bottom Actions
  bottomActions: {
    alignItems: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  homeButtonText: {
    fontSize: 15,
    color: HERA_COLORS.textSecondary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: HERA_COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: HERA_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: HERA_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyActions: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: HERA_COLORS.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: HERA_COLORS.white,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: HERA_COLORS.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: HERA_COLORS.primary,
  },
});
