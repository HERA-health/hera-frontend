import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { questionnaire } from '../../utils/questionnaireData';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAnswers, calculateMatching } from '../../utils/matchingAlgorithm';
import { mockSpecialists } from '../../utils/mockData';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

export function QuestionnaireScreen() {
  const navigation = useNavigation<any>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});

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

  const handleNext = () => {
    if (isLastQuestion) {
      const results = calculateMatching(answers, mockSpecialists);
      navigation.navigate('QuestionnaireResults', { results });
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
      {/* Decorative background */}
      <LinearGradient
        colors={[colors.primary[50], colors.neutral.white, colors.primary[50]]}
        style={styles.backgroundGradient}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      <View style={[styles.decorCircle, styles.decorCircle3]} />

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
                colors={[colors.primary.light, colors.primary.main]}
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
                style={styles.secondaryButton}
                onPress={handlePrevious}
              >
                <Ionicons name="arrow-back" size={20} color={colors.neutral.gray700} />
                <Text style={styles.secondaryButtonText}>Anterior</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canGoNext() && styles.primaryButtonDisabled,
                !isFirstQuestion && { flex: 1 }
              ]}
              onPress={handleNext}
              disabled={!canGoNext()}
            >
              <Text style={styles.primaryButtonText}>
                {isLastQuestion ? 'Ver Resultados' : 'Siguiente'}
              </Text>
              <Ionicons
                name={isLastQuestion ? "checkmark" : "arrow-forward"}
                size={20}
                color={colors.neutral.white}
              />
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
    backgroundColor: colors.neutral.gray50,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.4,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.primary[100],
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary.light + '30',
    bottom: -50,
    left: -50,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    backgroundColor: colors.secondary.purple + '20',
    top: '40%',
    right: -75,
  },
  mainCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    marginHorizontal: screenWidth > 768 ? spacing.xxxl * 3 : spacing.lg,
    marginVertical: spacing.xl,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
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
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    gap: spacing.xs,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.neutral.gray300,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
