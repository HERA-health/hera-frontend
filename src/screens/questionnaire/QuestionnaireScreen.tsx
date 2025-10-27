import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { questionnaire } from '../../utils/questionnaireData';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAnswers } from '../../utils/matchingAlgorithm';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

export function QuestionnaireScreen() {
  const navigation = useNavigation<any>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [loading, setLoading] = useState(false);

  const currentQuestion = questionnaire[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questionnaire.length) * 100;
  const isLastQuestion = currentQuestionIndex === questionnaire.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const currentAnswer = answers[currentQuestion.id];

  const handleOptionSelect = (optionValue: string) => {
    if (currentQuestion.type === 'single') {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: optionValue,
      }));
    } else {
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
    if (!currentAnswer) return false;
    if (Array.isArray(currentAnswer)) {
      return currentAnswer.includes(optionValue);
    }
    return currentAnswer === optionValue;
  };

  const canGoNext = (): boolean => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'single') {
      return !!answer;
    } else {
      return Array.isArray(answer) && answer.length > 0;
    }
  };

  const submitQuestionnaire = async (answersData: UserAnswers) => {
    console.log('📤 Submitting questionnaire answers:', JSON.stringify(answersData, null, 2));

    try {
      const response = await api.post('/questionnaire/submit', {
        answers: answersData
      });
      console.log('✅ Questionnaire submitted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error submitting questionnaire:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      try {
        setLoading(true);

        // Submit answers to backend and get matched specialists
        const response = await submitQuestionnaire(answers);
        console.log('📊 Backend returned specialists:', response.data);

        // Map backend data to MatchResult format
        const backendSpecialists = response.data.specialists;
        const results = backendSpecialists.map((s: any) => {
          const name = s.user.name;
          const initial = name.charAt(0).toUpperCase();

          // Map matched attributes to readable labels
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

        console.log('✅ Mapped results for display:', results);

        // Navigate to results screen with real backend data
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
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main content card - floating */}
      <View style={styles.mainCard}>
        {/* Header with progress */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.neutral.gray900} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#2196F3', '#00897B']}
                style={[styles.progressFill, { width: `${progress}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressText}>
              Pregunta {currentQuestionIndex + 1} de {questionnaire.length}
            </Text>
          </View>
        </View>

        {/* Question content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionContainer}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>
                Pregunta {currentQuestionIndex + 1}
              </Text>
            </View>

            <Text style={styles.questionText}>{currentQuestion.text}</Text>

            {currentQuestion.type === 'multiple' && (
              <View style={styles.multipleHintContainer}>
                <Ionicons name="information-circle" size={16} color={colors.primary.main} />
                <Text style={styles.multipleHint}>Puedes seleccionar varias opciones</Text>
              </View>
            )}
          </View>

          {/* Options - modern grid layout */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option) => {
              const selected = isOptionSelected(option.value);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.option,
                    selected && styles.optionSelected
                  ]}
                  onPress={() => handleOptionSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
                      {selected && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option.text}
                    </Text>
                  </View>
                  {selected && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Navigation buttons - modern floating style */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {!isFirstQuestion && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  loading && styles.secondaryButtonDisabled
                ]}
                onPress={handlePrevious}
                disabled={loading}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={loading ? colors.neutral.gray400 : colors.neutral.gray700}
                />
                <Text style={[
                  styles.secondaryButtonText,
                  loading && styles.secondaryButtonTextDisabled
                ]}>
                  Anterior
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButtonWrapper,
                !isFirstQuestion && { flex: 1 }
              ]}
              onPress={handleNext}
              disabled={!canGoNext() || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!canGoNext() || loading) ? ['#D1D5DB', '#9CA3AF'] : ['#2196F3', '#00897B']}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.neutral.white} />
                    <Text style={styles.primaryButtonText}>Guardando...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {isLastQuestion ? 'Ver Resultados' : 'Siguiente'}
                    </Text>
                    <Ionicons
                      name={isLastQuestion ? "checkmark" : "arrow-forward"}
                      size={20}
                      color={colors.neutral.white}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    marginHorizontal: screenWidth > 768 ? spacing.xxxl * 3 : spacing.lg,
    marginVertical: spacing.xl,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
  },
  closeButton: {
    marginRight: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  questionContainer: {
    marginBottom: spacing.xl,
  },
  questionBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  questionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.main,
  },
  questionText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.neutral.gray900,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  multipleHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  multipleHint: {
    fontSize: 13,
    color: colors.primary.dark,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    minHeight: 72,
  },
  optionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary[50],
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radioButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  radioButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.neutral.white,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral.gray700,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    gap: spacing.xs,
    minWidth: 120,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonTextDisabled: {
    color: colors.neutral.gray400,
  },
  primaryButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
