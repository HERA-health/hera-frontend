import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { heraLanding, spacing, borderRadius, typography } from '../../constants/colors';
import { questionnaire, categoryLabels, Question } from '../../utils/questionnaireData';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAnswers } from '../../utils/matchingAlgorithm';
import { api } from '../../services/api';
import { getMatchedSpecialists } from '../../services/specialistsService';
import * as analyticsService from '../../services/analyticsService';

// Step types for the questionnaire flow
type StepType = 'welcome' | 'question' | 'review';

interface StepConfig {
  type: StepType;
  questionIndex?: number;
}

export function QuestionnaireScreen() {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isMobile = screenWidth < 768;

  // Step management - includes welcome (0), questions (1-15), review (16)
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const questionnaireCompletedRef = useRef(false);

  // Total steps: welcome + 15 questions + review
  const totalSteps = questionnaire.length + 2;
  const isWelcome = currentStep === 0;
  const isReview = currentStep === totalSteps - 1;
  const currentQuestionIndex = currentStep - 1; // Adjust for welcome screen
  const currentQuestion = !isWelcome && !isReview ? questionnaire[currentQuestionIndex] : null;

  // Progress calculation (excluding welcome, including review as 100%)
  const progress = isWelcome ? 0 : isReview ? 100 : ((currentStep) / (totalSteps - 1)) * 100;

  useEffect(() => {
    analyticsService.trackScreen('questionnaire');
    return () => {
      if (!questionnaireCompletedRef.current) {
        analyticsService.track('questionnaire_abandoned', { lastStep: currentStep });
      }
    };
  }, []);

  // Check if user has already completed the questionnaire
  useEffect(() => {
    const checkQuestionnaireStatus = async () => {
      try {
        const response = await getMatchedSpecialists();

        if (response.hasCompletedQuestionnaire) {
          Alert.alert(
            'Cuestionario Completado',
            'Ya has completado el cuestionario anteriormente. ¿Qué te gustaría hacer?',
            [
              {
                text: 'Actualizar respuestas',
                onPress: () => setCheckingStatus(false),
              },
              {
                text: 'Ver mis resultados',
                onPress: () => {
                  const results = response.specialists.map((s) => {
                    const name = s.user.name;
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

                    const matchedAttributes = (s.matchedAttributes || []).map(
                      (attr: string) => attributeLabels[attr] || attr
                    );

                    return {
                      specialist: {
                        id: s.id,
                        name,
                        avatar: s.avatar || undefined,
                        initial,
                        specialization: s.specialization,
                        rating: s.rating,
                        reviewCount: s.reviewCount,
                        description: s.description,
                        affinityPercentage: s.affinity ? Math.round((s.affinity / 130) * 100) : 0,
                        tags: matchedAttributes,
                        pricePerSession: s.pricePerSession,
                        firstVisitFree: s.firstVisitFree,
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
                      },
                      affinityScore: s.affinity || 0,
                      matchedAttributes,
                    };
                  });
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
        }
      } catch (error) {
        console.error('Error checking questionnaire status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkQuestionnaireStatus();
  }, []);

  // Animate transition between steps
  const animateTransition = useCallback((direction: 'forward' | 'backward', callback: () => void) => {
    const slideDistance = direction === 'forward' ? -30 : 30;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: slideDistance,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'forward' ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // Option selection handler
  const handleOptionSelect = (optionValue: string) => {
    if (!currentQuestion) return;

    if (currentQuestion.type === 'single') {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: optionValue,
      }));
    } else {
      const currentAnswer = answers[currentQuestion.id];
      const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
      const isSelected = currentAnswers.includes(optionValue);

      if (isSelected) {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: currentAnswers.filter(v => v !== optionValue),
        }));
      } else {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: [...currentAnswers, optionValue],
        }));
      }
    }
  };

  const isOptionSelected = (optionValue: string): boolean => {
    if (!currentQuestion) return false;
    const currentAnswer = answers[currentQuestion.id];
    if (!currentAnswer) return false;
    if (Array.isArray(currentAnswer)) {
      return currentAnswer.includes(optionValue);
    }
    return currentAnswer === optionValue;
  };

  const canGoNext = (): boolean => {
    if (isWelcome) return true;
    if (isReview) return true;
    if (!currentQuestion) return false;

    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'single') {
      return !!answer;
    } else {
      return Array.isArray(answer) && answer.length > 0;
    }
  };

  // Submit questionnaire to backend
  const submitQuestionnaire = async (answersData: UserAnswers) => {
    try {
      const response = await api.post('/questionnaire/submit', {
        answers: answersData
      });
      return response.data;
    } catch (error: any) {
      console.error('Error submitting questionnaire:', error);
      throw error;
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    if (isReview) {
      // Submit questionnaire
      try {
        setLoading(true);
        const response = await submitQuestionnaire(answers);

        const backendSpecialists = response.data.specialists;
        const results = backendSpecialists.map((s: any) => {
          const name = s.user.name;
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

          const matchedAttributes = (s.matchedAttributes || []).map(
            (attr: string) => attributeLabels[attr] || attr
          );

          return {
            specialist: {
              id: s.id,
              name,
              avatar: s.avatar || undefined,
              initial,
              specialization: s.specialization,
              rating: s.rating,
              reviewCount: s.reviewCount,
              description: s.description,
              affinityPercentage: s.affinity ? Math.round((s.affinity / 130) * 100) : 0,
              tags: matchedAttributes,
              pricePerSession: s.pricePerSession,
              firstVisitFree: s.firstVisitFree,
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
            },
            affinityScore: s.affinity || 0,
            matchedAttributes,
          };
        });

        questionnaireCompletedRef.current = true;
        analyticsService.track('questionnaire_completed', { totalSteps: questionnaire.length });
        navigation.navigate('QuestionnaireResults', { results });
      } catch (error: any) {
        Alert.alert(
          'Error',
          'No se pudieron guardar tus respuestas. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    } else {
      if (currentStep === 0) {
        analyticsService.track('questionnaire_started');
      } else {
        analyticsService.track('questionnaire_step_completed', {
          step: currentStep,
          totalSteps: questionnaire.length,
        });
      }
      animateTransition('forward', () => {
        setCurrentStep(currentStep + 1);
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      animateTransition('backward', () => {
        setCurrentStep(currentStep - 1);
      });
    }
  };

  // Get answer summary for review screen
  const getAnswerSummary = (questionId: string): string => {
    const answer = answers[questionId];
    const question = questionnaire.find(q => q.id === questionId);
    if (!question || !answer) return '';

    if (Array.isArray(answer)) {
      return answer.map(val => {
        const option = question.options.find(o => o.value === val);
        return option ? `${option.emoji || ''} ${option.text}` : val;
      }).join(', ');
    } else {
      const option = question.options.find(o => o.value === answer);
      return option ? `${option.emoji || ''} ${option.text}` : answer;
    }
  };

  // Loading state while checking questionnaire status
  if (checkingStatus) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Verificando estado...</Text>
      </View>
    );
  }

  // Dynamic styles based on screen size
  const cardWidth = isMobile ? '100%' : isTablet ? '90%' : 700;
  const cardPadding = isMobile ? spacing.xl : isTablet ? spacing.xxl : 48;
  const questionFontSize = isMobile ? 20 : isTablet ? 24 : 28;

  return (
    <View style={styles.container}>
      {/* Progress bar at top */}
      {!isWelcome && (
        <View style={[styles.progressWrapper, { paddingHorizontal: isMobile ? spacing.md : spacing.xl }]}>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {isReview ? 'Revisión final' : `Paso ${currentStep} de ${questionnaire.length}`}
          </Text>
        </View>
      )}

      {/* Main content area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: isWelcome ? (isMobile ? 40 : 80) : (isMobile ? 24 : 40) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              padding: cardPadding,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Welcome Screen */}
          {isWelcome && (
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeEmoji}>👋</Text>
              <Text style={[styles.welcomeTitle, { fontSize: isMobile ? 28 : 36 }]}>
                ¡Hola!
              </Text>
              <Text style={[styles.welcomeSubtitle, { fontSize: isMobile ? 18 : 22 }]}>
                Vamos a encontrar el especialista perfecto para ti.
              </Text>
              <Text style={[styles.welcomeDescription, { fontSize: isMobile ? 15 : 16 }]}>
                Este cuestionario toma solo 3-4 minutos. Tus respuestas nos ayudarán a conectarte con profesionales que se ajusten a tus necesidades.
              </Text>

              <View style={styles.welcomeFeatures}>
                <View style={styles.welcomeFeature}>
                  <View style={styles.welcomeFeatureIcon}>
                    <Ionicons name="shield-checkmark" size={20} color={heraLanding.primary} />
                  </View>
                  <Text style={styles.welcomeFeatureText}>100% confidencial</Text>
                </View>
                <View style={styles.welcomeFeature}>
                  <View style={styles.welcomeFeatureIcon}>
                    <Ionicons name="time" size={20} color={heraLanding.primary} />
                  </View>
                  <Text style={styles.welcomeFeatureText}>Solo 3-4 minutos</Text>
                </View>
                <View style={styles.welcomeFeature}>
                  <View style={styles.welcomeFeatureIcon}>
                    <Ionicons name="heart" size={20} color={heraLanding.primary} />
                  </View>
                  <Text style={styles.welcomeFeatureText}>Matching personalizado</Text>
                </View>
              </View>
            </View>
          )}

          {/* Question Screen */}
          {currentQuestion && (
            <View style={styles.questionContent}>
              <Text style={[styles.questionText, { fontSize: questionFontSize }]}>
                {currentQuestion.text}
              </Text>

              {currentQuestion.helpText && (
                <Text style={styles.helpText}>{currentQuestion.helpText}</Text>
              )}

              {currentQuestion.type === 'multiple' && !currentQuestion.helpText && (
                <View style={styles.multipleHint}>
                  <Ionicons name="information-circle-outline" size={16} color={heraLanding.primary} />
                  <Text style={styles.multipleHintText}>Puedes seleccionar varias opciones</Text>
                </View>
              )}

              <View style={styles.optionsContainer}>
                {currentQuestion.options.map((option) => {
                  const selected = isOptionSelected(option.value);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.option,
                        selected && styles.optionSelected,
                        isMobile && styles.optionMobile,
                      ]}
                      onPress={() => handleOptionSelect(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        {option.emoji && (
                          <Text style={styles.optionEmoji}>{option.emoji}</Text>
                        )}
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option.text}
                        </Text>
                      </View>
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected && (
                          <Ionicons name="checkmark" size={16} color={heraLanding.cardBackground} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Review Screen */}
          {isReview && (
            <View style={styles.reviewContent}>
              <Text style={[styles.reviewTitle, { fontSize: isMobile ? 24 : 28 }]}>
                Resumen de tus preferencias
              </Text>
              <Text style={styles.reviewSubtitle}>
                Revisa que todo esté correcto antes de buscar especialistas
              </Text>

              <ScrollView style={styles.reviewList} nestedScrollEnabled>
                {questionnaire.map((q) => {
                  const summary = getAnswerSummary(q.id);
                  if (!summary) return null;

                  return (
                    <View key={q.id} style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>
                        {categoryLabels[q.category] || q.category}
                      </Text>
                      <Text style={styles.reviewValue}>{summary}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={[styles.footer, { paddingHorizontal: isMobile ? spacing.md : spacing.xl }]}>
        <View style={[styles.footerContent, isMobile && styles.footerContentMobile]}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.backButton, loading && styles.buttonDisabled]}
              onPress={handlePrevious}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={20} color={heraLanding.textSecondary} />
              <Text style={styles.backButtonText}>Atrás</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              !canGoNext() && styles.nextButtonDisabled,
              loading && styles.buttonDisabled,
              currentStep === 0 && styles.nextButtonFullWidth,
            ]}
            onPress={handleNext}
            disabled={!canGoNext() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color={heraLanding.cardBackground} />
                <Text style={styles.nextButtonText}>Buscando...</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {isWelcome ? 'Comenzar' : isReview ? 'Buscar especialistas' : 'Continuar'}
                </Text>
                <Ionicons
                  name={isReview ? "search" : "arrow-forward"}
                  size={20}
                  color={heraLanding.cardBackground}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeButton, { top: isMobile ? 16 : 24, right: isMobile ? 16 : 24 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background, // #F5F7F5 Light Sage - CRITICAL
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },

  // Progress bar
  progressWrapper: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: spacing.md,
    backgroundColor: heraLanding.background,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: heraLanding.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: heraLanding.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },

  // Scroll content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 120,
  },

  // Card
  card: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.xl,
    maxWidth: 700,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      },
    }),
  },

  // Welcome screen
  welcomeContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 28,
  },
  welcomeDescription: {
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 480,
    marginBottom: spacing.xxl,
  },
  welcomeFeatures: {
    width: '100%',
    maxWidth: 400,
  },
  welcomeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  welcomeFeatureText: {
    fontSize: 16,
    color: heraLanding.textPrimary,
    fontWeight: '500',
  },

  // Question screen
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontWeight: '600',
    color: heraLanding.textPrimary,
    lineHeight: 36,
    marginBottom: spacing.md,
  },
  helpText: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  multipleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  multipleHintText: {
    fontSize: 14,
    color: heraLanding.primaryDark,
    fontWeight: '500',
  },

  // Options
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: heraLanding.cardBackground,
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 56,
  },
  optionMobile: {
    padding: spacing.md,
  },
  optionSelected: {
    borderColor: heraLanding.primary,
    backgroundColor: heraLanding.primaryMuted,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 16,
    color: heraLanding.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: heraLanding.primaryDark,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: heraLanding.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.cardBackground,
  },
  checkboxSelected: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },

  // Review screen
  reviewContent: {
    flex: 1,
  },
  reviewTitle: {
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  reviewSubtitle: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  reviewList: {
    maxHeight: 400,
  },
  reviewItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  reviewValue: {
    fontSize: 16,
    color: heraLanding.textPrimary,
    lineHeight: 22,
  },

  // Footer / Navigation
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: heraLanding.background,
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  footerContentMobile: {
    flexDirection: 'column-reverse',
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: heraLanding.border,
    backgroundColor: heraLanding.cardBackground,
    gap: spacing.xs,
    minWidth: 120,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
    gap: spacing.sm,
    minWidth: 160,
    flex: 1,
    marginLeft: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: heraLanding.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextButtonFullWidth: {
    marginLeft: 0,
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: heraLanding.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.cardBackground,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Close button
  closeButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: heraLanding.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
