import { showAppAlert, useAppAlert } from '../../components/common/alert';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing, borderRadius } from '../../constants/colors';
import type { RootStackParamList, Specialist } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import { Button, AnimatedPressable } from '../../components/common';
import { questionnaire, categoryLabels, type Question } from '../../utils/questionnaireData';
import type { UserAnswers, MatchResult } from '../../utils/matchingAlgorithm';
import {
  getMatchedSpecialists,
  type SpecialistData,
} from '../../services/specialistsService';
import { submitQuestionnaire } from '../../services/questionnaireService';
import * as analyticsService from '../../services/analyticsService';

type QuestionnaireNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getQuestionnairePalette = (theme: Theme, isDark: boolean) => ({
  accent: theme.primary,
  accentStrong: theme.primaryDark,
  accentSoft: theme.primaryLight,
  accentContrast: theme.secondary,
  bg: theme.bg,
  cardBg: theme.bgCard,
  text: theme.textPrimary,
  textSecondary: theme.textSecondary,
  textMuted: theme.textMuted,
  border: theme.border,
  borderLight: theme.borderLight,
  muted: isDark ? theme.surfaceMuted : theme.bgMuted,
  selectedBg: isDark ? theme.primaryAlpha12 : theme.primaryLight,
  selectedBorder: theme.primary,
  optionBg: theme.bgCard,
  footerBg: isDark ? theme.bgElevated : theme.bg,
  success: theme.success,
  overlayCard: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)',
});

type QuestionnairePalette = ReturnType<typeof getQuestionnairePalette>;

const mapSpecialistToMatchResult = (specialistData: SpecialistData): MatchResult => {
  const name = specialistData.user.name;
  const initial = name.charAt(0).toUpperCase();

  const attributeLabels: Record<string, string> = {
    specialty: 'Especialidad coincidente',
    approach: 'Enfoque terapéutico compatible',
    sessionStyle: 'Estilo de sesión adecuado',
    personality: 'Personalidad compatible',
    ageGroup: 'Experiencia con tu grupo de edad',
    availability: 'Disponibilidad compatible',
    format: 'Formato de sesión compatible',
    experience: 'Alta experiencia profesional',
  };

  const matchedAttributes = (specialistData.matchedAttributes || []).map(
    (attr) => attributeLabels[attr] || attr
  );

  const specialist: Specialist = {
    id: specialistData.id,
    name,
    avatar: specialistData.avatar || undefined,
    initial,
    specialization: specialistData.specialization,
    rating: specialistData.rating,
    reviewCount: specialistData.reviewCount,
    description: specialistData.description,
    affinityPercentage: specialistData.affinity
      ? Math.round((specialistData.affinity / 130) * 100)
      : 0,
    tags: matchedAttributes,
    pricePerSession: specialistData.pricePerSession,
    firstVisitFree: specialistData.firstVisitFree,
    verified: true,
    matchingProfile: {
      therapeuticApproach: [],
      specialties: [],
      sessionStyle: '',
      personality: [],
      ageGroups: [],
      experienceYears: 0,
      language: [],
      availability: '',
      format: [],
    },
  };

  return {
    specialist,
    affinityScore: specialistData.affinity || 0,
    matchedAttributes,
  };
};

export function QuestionnaireScreen() {
  const navigation = useNavigation<QuestionnaireNavigationProp>();
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const palette = useMemo(() => getQuestionnairePalette(theme, isDark), [theme, isDark]);
  const styles = useMemo(() => createStyles(theme, isDark, palette), [theme, isDark, palette]);

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const questionnaireCompletedRef = useRef(false);

  const totalSteps = questionnaire.length + 2;
  const isWelcome = currentStep === 0;
  const isReview = currentStep === totalSteps - 1;
  const currentQuestionIndex = currentStep - 1;
  const currentQuestion = !isWelcome && !isReview ? questionnaire[currentQuestionIndex] : null;
  const progress = isWelcome ? 0 : isReview ? 100 : (currentStep / (totalSteps - 1)) * 100;

  useEffect(() => {
    analyticsService.trackScreen('questionnaire');
    return () => {
      if (!questionnaireCompletedRef.current) {
        analyticsService.track('questionnaire_abandoned', { lastStep: currentStep });
      }
    };
  }, [currentStep]);

  useEffect(() => {
    const checkQuestionnaireStatus = async () => {
      try {
        const response = await getMatchedSpecialists();

        if (response.needsQuestionnaireRefresh) {
          showAppAlert(appAlert, 
            'Necesitamos actualizar tu cuestionario',
            'Tu cuestionario anterior ya no se puede recuperar con detalle. Actualízalo ahora para volver a guardar tus respuestas y mejorar el matching.',
            [
              {
                text: 'Actualizar respuestas',
                onPress: () => setCheckingStatus(false),
              },
              {
                text: 'Volver',
                onPress: () => navigation.goBack(),
                style: 'cancel',
              },
            ],
            { cancelable: false }
          );
          return;
        }

        if (response.hasCompletedQuestionnaire) {
          showAppAlert(appAlert, 
            'Cuestionario completado',
            'Ya completaste este cuestionario. ¿Qué quieres hacer ahora?',
            [
              {
                text: 'Actualizar respuestas',
                onPress: () => setCheckingStatus(false),
              },
              {
                text: 'Ver mis resultados',
                onPress: () => {
                  const results = response.specialists.map(mapSpecialistToMatchResult);
                  navigation.replace('QuestionnaireResults', { results });
                },
              },
              {
                text: 'Volver',
                onPress: () => navigation.goBack(),
                style: 'cancel',
              },
            ],
            { cancelable: false }
          );
          return;
        }
      } catch (error) {
        console.error('Error checking questionnaire status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    void checkQuestionnaireStatus();
  }, [navigation]);

  const animateTransition = useCallback(
    (direction: 'forward' | 'backward', callback: () => void) => {
      const slideDistance = direction === 'forward' ? -28 : 28;

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: slideDistance,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        callback();
        slideAnim.setValue(direction === 'forward' ? 28 : -28);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const handleOptionSelect = (optionValue: string) => {
    if (!currentQuestion) return;

    if (currentQuestion.type === 'single') {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: optionValue,
      }));
      return;
    }

    const currentAnswer = answers[currentQuestion.id];
    const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
    const isSelected = currentAnswers.includes(optionValue);

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: isSelected
        ? currentAnswers.filter((value) => value !== optionValue)
        : [...currentAnswers, optionValue],
    }));
  };

  const isOptionSelected = (optionValue: string): boolean => {
    if (!currentQuestion) return false;
    const currentAnswer = answers[currentQuestion.id];
    if (!currentAnswer) return false;
    return Array.isArray(currentAnswer)
      ? currentAnswer.includes(optionValue)
      : currentAnswer === optionValue;
  };

  const canGoNext = (): boolean => {
    if (isWelcome || isReview) return true;
    if (!currentQuestion) return false;

    const answer = answers[currentQuestion.id];
    return currentQuestion.type === 'single'
      ? Boolean(answer)
      : Array.isArray(answer) && answer.length > 0;
  };

  const handleNext = async () => {
    if (isReview) {
      try {
        setLoading(true);
        const response = await submitQuestionnaire(answers);
        const results = response.specialists.map(mapSpecialistToMatchResult);

        questionnaireCompletedRef.current = true;
        analyticsService.track('questionnaire_completed', { totalSteps: questionnaire.length });
        navigation.navigate('QuestionnaireResults', { results });
      } catch (error) {
        console.error('Error submitting questionnaire:', error);
        showAppAlert(appAlert, 
          'No se pudo completar',
          'No pudimos guardar tus respuestas. Inténtalo de nuevo en unos segundos.'
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (currentStep === 0) {
      analyticsService.track('questionnaire_started');
    } else {
      analyticsService.track('questionnaire_step_completed', {
        step: currentStep,
        totalSteps: questionnaire.length,
      });
    }

    animateTransition('forward', () => {
      setCurrentStep((prev) => prev + 1);
    });
  };

  const handlePrevious = () => {
    if (currentStep === 0) return;
    animateTransition('backward', () => {
      setCurrentStep((prev) => prev - 1);
    });
  };

  const getAnswerSummary = (questionId: string): string => {
    const answer = answers[questionId];
    const question = questionnaire.find((item) => item.id === questionId);
    if (!question || !answer) return '';

    if (Array.isArray(answer)) {
      return answer
        .map((value) => {
          const option = question.options.find((item) => item.value === value);
          return option ? `${option.emoji || ''} ${option.text}`.trim() : value;
        })
        .join(', ');
    }

    const option = question.options.find((item) => item.value === answer);
    return option ? `${option.emoji || ''} ${option.text}`.trim() : answer;
  };

  const cardWidth = isMobile ? '100%' : isTablet ? '92%' : 760;
  const cardPadding = isMobile ? spacing.xl : isTablet ? spacing.xxl : 48;
  const questionFontSize = isMobile ? 22 : isTablet ? 26 : 30;
  if (checkingStatus) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={styles.loadingText}>Verificando tu cuestionario...</Text>
      </View>
    );
  }

  const renderWelcome = () => (
    <View style={styles.welcomeContent}>
      <View style={styles.welcomeHeroBadge}>
        <Ionicons name="sparkles" size={18} color={palette.accent} />
        <Text style={styles.welcomeHeroBadgeText}>Afinidad clínica y personal</Text>
      </View>

      <Text style={styles.welcomeTitle}>Vamos a encontrar el especialista adecuado para ti</Text>
      <Text style={styles.welcomeSubtitle}>
        Este cuestionario nos ayuda a recomendarte perfiles realmente compatibles con tu momento y tu forma de vivir la terapia.
      </Text>

      <View style={styles.welcomeStats}>
        <View style={styles.welcomeStat}>
          <Text style={styles.welcomeStatNumber}>15</Text>
          <Text style={styles.welcomeStatLabel}>preguntas cuidadas</Text>
        </View>
        <View style={styles.welcomeStat}>
          <Text style={styles.welcomeStatNumber}>3-4 min</Text>
          <Text style={styles.welcomeStatLabel}>de respuesta</Text>
        </View>
        <View style={styles.welcomeStat}>
          <Text style={styles.welcomeStatNumber}>100%</Text>
          <Text style={styles.welcomeStatLabel}>confidencial</Text>
        </View>
      </View>

      <View style={styles.welcomeFeatures}>
        {[
          'Comparamos especialidad, estilo terapéutico y disponibilidad.',
          'Te mostramos mejores matches, no solo un listado genérico.',
          'Puedes actualizarlo más adelante si cambian tus necesidades.',
        ].map((feature) => (
          <View key={feature} style={styles.welcomeFeature}>
            <View style={styles.welcomeFeatureIcon}>
              <Ionicons name="checkmark" size={16} color={palette.accent} />
            </View>
            <Text style={styles.welcomeFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.welcomeCtaWrap}>
        <Button
          onPress={handleNext}
          size="large"
          icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          iconPosition="right"
          style={styles.welcomeInlineCta}
        >
          Comenzar
        </Button>
      </View>
    </View>
  );

  const renderQuestion = (question: Question) => (
    <View style={styles.questionContent}>
      <View style={styles.questionMeta}>
        <Text style={styles.questionCategory}>{categoryLabels[question.category] || question.category}</Text>
        <Text style={styles.questionCounter}>
          {currentStep} / {questionnaire.length}
        </Text>
      </View>

      <Text style={[styles.questionText, { fontSize: questionFontSize }]}>{question.text}</Text>

      {question.helpText ? <Text style={styles.helpText}>{question.helpText}</Text> : null}

      {question.type === 'multiple' && (
        <View style={styles.multipleHint}>
          <Ionicons name="information-circle-outline" size={16} color={palette.accent} />
          <Text style={styles.multipleHintText}>Puedes seleccionar varias opciones</Text>
        </View>
      )}

      <View style={styles.optionsContainer}>
        {question.options.map((option) => {
          const selected = isOptionSelected(option.value);
          return (
            <AnimatedPressable
              key={option.id}
              onPress={() => handleOptionSelect(option.value)}
              style={[
                styles.option,
                selected ? styles.optionSelected : null,
                isMobile ? styles.optionMobile : null,
              ]}
            >
              <View style={styles.optionLeft}>
                {option.emoji ? <Text style={styles.optionEmoji}>{option.emoji}</Text> : null}
                <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
                  {option.text}
                </Text>
              </View>
              <View style={[styles.checkbox, selected ? styles.checkboxSelected : null]}>
                {selected ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <View style={styles.checkboxDot} />
                )}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.reviewContent}>
      <Text style={styles.reviewTitle}>Revisión final</Text>
      <Text style={styles.reviewSubtitle}>
        Antes de buscar especialistas, revisa que este resumen refleje bien lo que estás buscando.
      </Text>

      <ScrollView style={styles.reviewList} nestedScrollEnabled showsVerticalScrollIndicator={isDesktop}>
        {questionnaire.map((question) => {
          const summary = getAnswerSummary(question.id);
          if (!summary) return null;

          return (
            <View key={question.id} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {categoryLabels[question.category] || question.category}
              </Text>
              <Text style={styles.reviewValue}>{summary}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {!isWelcome ? (
        <View style={[styles.progressWrapper, { paddingHorizontal: isMobile ? spacing.md : spacing.xl }]}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressTitle}>Cuestionario de afinidad</Text>
            <Text style={styles.progressText}>
              {isReview ? 'Revisión final' : `Paso ${currentStep} de ${questionnaire.length}`}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: isWelcome ? (isMobile ? 36 : 72) : isMobile ? 24 : 40 },
        ]}
        showsVerticalScrollIndicator={isDesktop}
      >
        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              padding: cardPadding,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {isWelcome ? renderWelcome() : null}
          {currentQuestion ? renderQuestion(currentQuestion) : null}
          {isReview ? renderReview() : null}
        </Animated.View>

        {!isWelcome ? (
          <View style={[styles.inlineFooter, { width: cardWidth }]}>
            <View style={[styles.footerContent, isMobile ? styles.footerContentMobile : null]}>
              {currentStep > 0 ? (
              <Button
                onPress={handlePrevious}
                variant="outline"
                size="large"
                icon={<Ionicons name="arrow-back" size={18} color={palette.accent} />}
                style={isMobile ? styles.mobileFullWidth : styles.footerButton}
              >
                  Atrás
                </Button>
              ) : (
                <View style={styles.footerSpacer} />
              )}

              <Button
                onPress={handleNext}
                disabled={!canGoNext() || loading}
                loading={loading}
                size="large"
                icon={
                  loading ? undefined : (
                    <Ionicons
                      name={isReview ? 'search' : 'arrow-forward'}
                      size={18}
                      color="#FFFFFF"
                    />
                  )
                }
                iconPosition="right"
                style={isMobile ? styles.mobileFullWidth : styles.footerButton}
              >
                {isReview ? 'Buscar especialistas' : 'Continuar'}
              </Button>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <AnimatedPressable
        style={[styles.closeButton, { top: isMobile ? 16 : 24, right: isMobile ? 16 : 24 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={22} color={palette.textSecondary} />
      </AnimatedPressable>
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, palette: QuestionnairePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    progressWrapper: {
      paddingTop: Platform.OS === 'ios' ? 56 : 22,
      paddingBottom: spacing.md,
      backgroundColor: palette.footerBg,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    progressTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    progressTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: palette.border,
      borderRadius: 999,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: palette.accent,
      borderRadius: 999,
    },
    progressText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingBottom: 128,
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: palette.cardBg,
      borderRadius: borderRadius.xl,
      maxWidth: 760,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.24 : 0.08,
          shadowRadius: 22,
        },
        android: {
          elevation: 5,
        },
        web: {
          boxShadow: isDark
            ? '0 16px 36px rgba(0,0,0,0.34)'
            : '0 12px 28px rgba(26,36,26,0.08)',
        },
      }),
    },
    welcomeContent: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    welcomeHeroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: palette.accentSoft,
      marginBottom: spacing.lg,
    },
    welcomeHeroBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.accent,
    },
    welcomeTitle: {
      fontSize: 36,
      fontWeight: '800',
      color: palette.text,
      marginBottom: spacing.md,
      textAlign: 'center',
      lineHeight: 42,
      maxWidth: 560,
    },
    welcomeSubtitle: {
      fontSize: 18,
      fontWeight: '500',
      color: palette.textSecondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
      lineHeight: 28,
      maxWidth: 560,
    },
    welcomeStats: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginBottom: spacing.xxl,
    },
    welcomeStat: {
      minWidth: 132,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: palette.muted,
      borderWidth: 1,
      borderColor: palette.borderLight,
      alignItems: 'center',
    },
    welcomeStatNumber: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.text,
      marginBottom: 4,
    },
    welcomeStatLabel: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    welcomeFeatures: {
      width: '100%',
      maxWidth: 520,
      gap: spacing.md,
    },
    welcomeFeature: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: palette.overlayCard,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    welcomeFeatureIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: palette.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    welcomeFeatureText: {
      fontSize: 15,
      color: palette.text,
      flex: 1,
      lineHeight: 21,
    },
    questionContent: {
      flex: 1,
    },
    questionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    questionCategory: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    questionCounter: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textMuted,
    },
    questionText: {
      fontWeight: '700',
      color: palette.text,
      lineHeight: 38,
      marginBottom: spacing.md,
    },
    helpText: {
      fontSize: 16,
      color: palette.textSecondary,
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    multipleHint: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      alignSelf: 'flex-start',
      marginBottom: spacing.xl,
      gap: spacing.xs,
    },
    multipleHintText: {
      fontSize: 14,
      color: palette.accentStrong,
      fontWeight: '600',
    },
    optionsContainer: {
      gap: spacing.md,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.optionBg,
      borderWidth: 1.5,
      borderColor: palette.border,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      minHeight: 62,
    },
    optionMobile: {
      padding: spacing.md,
    },
    optionSelected: {
      borderColor: palette.selectedBorder,
      backgroundColor: palette.selectedBg,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
      paddingRight: spacing.md,
    },
    optionEmoji: {
      fontSize: 24,
    },
    optionText: {
      fontSize: 16,
      color: palette.text,
      flex: 1,
      lineHeight: 22,
    },
    optionTextSelected: {
      fontWeight: '700',
      color: palette.accentStrong,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: palette.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.optionBg,
    },
    checkboxSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    checkboxDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: 'transparent',
    },
    reviewContent: {
      flex: 1,
    },
    reviewTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: palette.text,
      marginBottom: spacing.sm,
    },
    reviewSubtitle: {
      fontSize: 16,
      color: palette.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    reviewList: {
      maxHeight: 420,
    },
    reviewItem: {
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    reviewLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.xs,
    },
    reviewValue: {
      fontSize: 16,
      color: palette.text,
      lineHeight: 22,
    },
    inlineFooter: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    footerContent: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      gap: spacing.md,
    },
    footerContentMobile: {
      flexDirection: 'column-reverse',
      gap: spacing.md,
    },
    footerSpacer: {
      width: 220,
    },
    footerButton: {
      minWidth: 220,
    },
    mobileFullWidth: {
      width: '100%',
    },
    welcomeCtaWrap: {
      width: '100%',
      alignItems: 'center',
      marginTop: spacing.xxl,
    },
    welcomeInlineCta: {
      minWidth: 240,
    },
    closeButton: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.cardBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.28 : 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: isDark
            ? '0 8px 16px rgba(0,0,0,0.28)'
            : '0 8px 14px rgba(44,62,44,0.10)',
        },
      }),
    },
  });

