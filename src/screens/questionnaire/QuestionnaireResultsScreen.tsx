import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { spacing, borderRadius } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import { Button, AnimatedPressable, Card } from '../../components/common';
import type { MatchResult } from '../../utils/matchingAlgorithm';

type QuestionnaireResultsNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QuestionnaireResultsRouteProp = RouteProp<RootStackParamList, 'QuestionnaireResults'>;

const getResultsPalette = (theme: Theme, isDark: boolean) => ({
  accent: theme.primary,
  accentStrong: theme.primaryDark,
  accentSoft: theme.primaryLight,
  secondary: theme.secondary,
  success: theme.success,
  successBg: theme.successBg,
  warning: theme.warning,
  warningBg: theme.warningBg,
  bg: theme.bg,
  cardBg: theme.bgCard,
  surface: isDark ? theme.bgElevated : theme.bgMuted,
  text: theme.textPrimary,
  textSecondary: theme.textSecondary,
  textMuted: theme.textMuted,
  border: theme.border,
  borderLight: theme.borderLight,
});

type ResultsPalette = ReturnType<typeof getResultsPalette>;

export function QuestionnaireResultsScreen() {
  const navigation = useNavigation<QuestionnaireResultsNavigationProp>();
  const route = useRoute<QuestionnaireResultsRouteProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const palette = useMemo(() => getResultsPalette(theme, isDark), [theme, isDark]);
  const styles = useMemo(() => createStyles(theme, isDark, palette), [theme, isDark, palette]);

  const results = (route.params?.results || []) as MatchResult[];
  const isDesktop = width >= 1100;
  const isTablet = width >= 768 && width < 1100;
  const topMatch = results[0];
  const otherMatches = results.slice(1, 7);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cardAnimations = useRef(results.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(
        80,
        cardAnimations.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [cardAnimations, fadeAnim, slideAnim]);

  const renderMatchBadge = (percentage: number, prominent = false) => (
    <View style={[styles.matchBadge, prominent ? styles.matchBadgeProminent : null]}>
      <Ionicons
        name="checkmark-circle"
        size={prominent ? 18 : 16}
        color={palette.success}
      />
      <Text style={[styles.matchBadgeText, prominent ? styles.matchBadgeTextProminent : null]}>
        {percentage}% match
      </Text>
    </View>
  );

  const renderMatchCard = (result: MatchResult, index: number, isTop = false) => {
    const { specialist, affinityScore, matchedAttributes } = result;
    const percentage =
      specialist.affinityPercentage || Math.round((affinityScore / 130) * 100);
    const animValue = cardAnimations[index] || new Animated.Value(1);

    return (
      <Animated.View
        key={specialist.id}
        style={[
          isTop ? styles.topMatchWrapper : styles.matchCardWrapper,
          {
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Card style={isTop ? { ...styles.matchCard, ...styles.topMatchCard } : styles.matchCard}>
          {isTop ? (
            <View style={styles.topMatchBanner}>
              <Ionicons name="trophy" size={16} color={palette.warning} />
              <Text style={styles.topMatchBannerText}>Tu mejor match</Text>
            </View>
          ) : null}

          <View style={styles.matchHeader}>
            <View style={styles.avatarStack}>
              {specialist.avatar ? (
                <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[palette.accent, palette.secondary]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {specialist.initial || specialist.name.charAt(0)}
                  </Text>
                </LinearGradient>
              )}
              {specialist.firstVisitFree ? (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>Gratis</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.matchHeaderInfo}>
              <Text style={styles.specialistName} numberOfLines={1}>
                {specialist.name}
              </Text>
              <Text style={styles.specialistSpecialization} numberOfLines={2}>
                {specialist.specialization}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={palette.warning} />
                <Text style={styles.ratingText}>
                  {specialist.rating} ({specialist.reviewCount})
                </Text>
              </View>
            </View>

            {renderMatchBadge(percentage, isTop)}
          </View>

          {matchedAttributes.length > 0 ? (
            <View style={styles.reasonsPanel}>
              <Text style={styles.reasonsTitle}>Por qué encaja contigo</Text>
              <View style={styles.reasonsList}>
                {matchedAttributes.slice(0, isTop ? 4 : 3).map((attribute) => (
                  <View key={attribute} style={styles.reasonItem}>
                    <Ionicons name="checkmark" size={14} color={palette.success} />
                    <Text style={styles.reasonText}>{attribute}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.matchFooter}>
            <View>
              <Text style={styles.priceValue}>{specialist.pricePerSession}€/sesión</Text>
              <Text style={styles.priceHint}>
                {specialist.firstVisitFree ? 'Con primera visita gratuita' : 'Tarifa por sesión'}
              </Text>
            </View>

            <Button
              onPress={() =>
                navigation.navigate('SpecialistDetail', { specialistId: specialist.id })
              }
              size="medium"
              icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
              iconPosition="right"
            >
              Ver perfil
            </Button>
          </View>
        </Card>
      </Animated.View>
    );
  };

  if (results.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyScrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.emptyStateCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="search-outline" size={54} color={palette.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No encontramos matches exactos</Text>
            <Text style={styles.emptyDescription}>
              Aun así, podemos enseñarte especialistas que pueden ayudarte a empezar.
            </Text>
            <View style={styles.emptyActions}>
              <Button
                onPress={() => navigation.navigate('Specialists')}
                size="large"
                icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
                iconPosition="right"
              >
                Ver todos los especialistas
              </Button>
              <Button
                onPress={() => navigation.navigate('Questionnaire')}
                variant="outline"
                size="large"
                icon={<Ionicons name="refresh" size={18} color={palette.accent} />}
              >
                Ajustar preferencias
              </Button>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isDesktop ? spacing.xxxl : spacing.xl },
        ]}
        showsVerticalScrollIndicator={isDesktop}
      >
        <Animated.View
          style={[
            styles.successHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.celebrationWrap}>
            <Text style={styles.celebrationEmoji}>✨</Text>
          </View>
          <Text style={styles.successTitle}>Listo, ya tenemos tus mejores matches</Text>
          <Text style={styles.successSubtitle}>
            Encontramos {results.length} especialista{results.length > 1 ? 's' : ''} con buena afinidad
            para tu momento y tus preferencias.
          </Text>
        </Animated.View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="clipboard-outline" size={20} color={palette.accent} />
            </View>
            <View style={styles.summaryHeaderText}>
              <Text style={styles.summaryTitle}>Basado en tus preferencias</Text>
              <Text style={styles.summaryDescription}>
                Analizamos tus respuestas para priorizar especialidad, estilo terapéutico, disponibilidad y afinidad personal.
              </Text>
            </View>
          </View>

          <AnimatedPressable
            onPress={() => navigation.navigate('Questionnaire')}
            style={styles.summaryLink}
          >
            <Text style={styles.summaryLinkText}>Editar preferencias</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.accent} />
          </AnimatedPressable>
        </Card>

        {topMatch ? <View style={styles.section}>{renderMatchCard(topMatch, 0, true)}</View> : null}

        {otherMatches.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Otros especialistas recomendados</Text>
              <Text style={styles.sectionMeta}>{otherMatches.length} alternativas más</Text>
            </View>

            <View
              style={[
                styles.matchesGrid,
                isDesktop ? styles.matchesGridDesktop : null,
                isTablet ? styles.matchesGridTablet : null,
              ]}
            >
              {otherMatches.map((result, idx) => (
                <View
                  key={result.specialist.id}
                  style={[
                    styles.gridItem,
                    isDesktop ? styles.gridItemDesktop : null,
                    isTablet ? styles.gridItemTablet : null,
                  ]}
                >
                  {renderMatchCard(result, idx + 1)}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Card style={styles.moreOptionsCard}>
          <View style={styles.moreOptionsText}>
            <Text style={styles.moreOptionsTitle}>¿Quieres ver más opciones?</Text>
            <Text style={styles.moreOptionsDescription}>
              También puedes explorar el listado completo y comparar otros perfiles por tu cuenta.
            </Text>
          </View>
          <Button
            onPress={() => navigation.navigate('Specialists')}
            variant="outline"
            size="medium"
            icon={<Ionicons name="arrow-forward" size={16} color={palette.accent} />}
            iconPosition="right"
          >
            Ver todos
          </Button>
        </Card>

        <Card style={styles.retakeCard}>
          <View style={styles.retakeTextBlock}>
            <Ionicons name="refresh-outline" size={22} color={palette.textSecondary} />
            <View style={styles.retakeCopy}>
              <Text style={styles.retakeTitle}>¿Cambiaron tus necesidades?</Text>
              <Text style={styles.retakeDescription}>
                Puedes actualizar tus respuestas en cualquier momento para refinar tus recomendaciones.
              </Text>
            </View>
          </View>
          <Button
            onPress={() => navigation.navigate('Questionnaire')}
            variant="secondary"
            size="medium"
            icon={<Ionicons name="create-outline" size={16} color={theme.secondaryDark} />}
          >
            Actualizar cuestionario
          </Button>
        </Card>

        <View style={styles.bottomActions}>
          <Button
            onPress={() => navigation.navigate('Home')}
            variant="ghost"
            size="medium"
            icon={<Ionicons name="home-outline" size={16} color={palette.accent} />}
          >
            Volver al inicio
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, palette: ResultsPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxxl,
      maxWidth: 1160,
      alignSelf: 'center',
      width: '100%',
    },
    emptyScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    successHeader: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    celebrationWrap: {
      marginBottom: spacing.md,
    },
    celebrationEmoji: {
      fontSize: 58,
    },
    successTitle: {
      fontSize: 38,
      fontWeight: '800',
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      lineHeight: 44,
      maxWidth: 760,
    },
    successSubtitle: {
      fontSize: 18,
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 28,
      maxWidth: 720,
    },
    summaryCard: {
      backgroundColor: palette.cardBg,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: palette.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: isDark ? 0.2 : 0.06,
          shadowRadius: 18,
        },
        android: { elevation: 4 },
        web: {
          boxShadow: isDark
            ? '0 14px 28px rgba(0,0,0,0.24)'
            : '0 10px 24px rgba(26,36,26,0.08)',
        },
      }),
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    summaryIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryHeaderText: {
      flex: 1,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
      marginBottom: spacing.xs,
    },
    summaryDescription: {
      fontSize: 15,
      color: palette.textSecondary,
      lineHeight: 24,
    },
    summaryLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
    },
    summaryLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.accent,
    },
    section: {
      marginBottom: spacing.xxl,
    },
    sectionHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
      flexWrap: 'wrap',
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.text,
    },
    sectionMeta: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textMuted,
    },
    topMatchWrapper: {
      width: '100%',
    },
    matchCardWrapper: {
      width: '100%',
    },
    matchesGrid: {
      gap: spacing.md,
    },
    matchesGridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    matchesGridTablet: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    gridItem: {
      width: '100%',
    },
    gridItemDesktop: {
      width: '49%',
    },
    gridItemTablet: {
      width: '48%',
    },
    matchCard: {
      backgroundColor: palette.cardBg,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: palette.border,
    },
    topMatchCard: {
      borderColor: palette.success,
      borderWidth: 1.5,
    },
    topMatchBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: palette.warningBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      alignSelf: 'flex-start',
      marginBottom: spacing.md,
    },
    topMatchBannerText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.warning,
    },
    matchHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    avatarStack: {
      position: 'relative',
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    freeBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: palette.success,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: palette.cardBg,
    },
    freeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    matchHeaderInfo: {
      flex: 1,
      minWidth: 0,
    },
    specialistName: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.text,
      marginBottom: 4,
    },
    specialistSpecialization: {
      fontSize: 16,
      color: palette.textSecondary,
      marginBottom: spacing.xs,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    ratingText: {
      fontSize: 14,
      color: palette.textSecondary,
      fontWeight: '600',
    },
    matchBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: palette.successBg,
      alignSelf: 'flex-start',
    },
    matchBadgeProminent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    matchBadgeText: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.success,
    },
    matchBadgeTextProminent: {
      fontSize: 16,
    },
    reasonsPanel: {
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.borderLight,
      marginBottom: spacing.lg,
    },
    reasonsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.textMuted,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    reasonsList: {
      gap: spacing.sm,
    },
    reasonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reasonText: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
      lineHeight: 22,
    },
    matchFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    priceValue: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.text,
    },
    priceHint: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 2,
    },
    moreOptionsCard: {
      backgroundColor: palette.cardBg,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: palette.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.lg,
      flexWrap: 'wrap',
    },
    moreOptionsText: {
      flex: 1,
      minWidth: 260,
    },
    moreOptionsTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.text,
      marginBottom: spacing.xs,
    },
    moreOptionsDescription: {
      fontSize: 15,
      color: palette.textSecondary,
      lineHeight: 24,
    },
    retakeCard: {
      backgroundColor: palette.cardBg,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: palette.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.lg,
      flexWrap: 'wrap',
    },
    retakeTextBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      flex: 1,
      minWidth: 260,
    },
    retakeCopy: {
      flex: 1,
    },
    retakeTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
      marginBottom: spacing.xs,
    },
    retakeDescription: {
      fontSize: 15,
      color: palette.textSecondary,
      lineHeight: 24,
    },
    bottomActions: {
      alignItems: 'center',
      marginTop: spacing.md,
    },
    emptyStateCard: {
      width: '100%',
      maxWidth: 720,
      padding: spacing.xxxl,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      backgroundColor: palette.cardBg,
    },
    emptyIconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 16,
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
      maxWidth: 480,
    },
    emptyActions: {
      gap: spacing.md,
      width: '100%',
      maxWidth: 360,
    },
  });
