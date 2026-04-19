import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Card } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { ClinicalQuestionnaireAnswers } from '../../services/clinicalService';
import type {
  QuestionnaireAvailability,
  QuestionnaireSummary,
} from '../../services/professionalService';
import { buildQuestionnaireReviewItems } from '../../utils/questionnaireReview';

interface ClinicalQuestionnairePanelProps {
  isTablet: boolean;
  completedQuestionnaire?: boolean;
  questionnaireAvailability?: QuestionnaireAvailability;
  summary?: QuestionnaireSummary | null;
  answers?: ClinicalQuestionnaireAnswers | null;
}

const ANSWER_PAGE_SIZE = 5;

const summaryFieldLabels: Array<{
  label: string;
  key:
    | 'therapeuticApproach'
    | 'sessionStyle'
    | 'preferredModality'
    | 'preferredAvailability'
    | 'frequency'
    | 'budgetRange';
}> = [
  { label: 'Enfoque', key: 'therapeuticApproach' },
  { label: 'Estilo de sesión', key: 'sessionStyle' },
  { label: 'Modalidad', key: 'preferredModality' },
  { label: 'Disponibilidad', key: 'preferredAvailability' },
  { label: 'Frecuencia', key: 'frequency' },
  { label: 'Presupuesto', key: 'budgetRange' },
];

export function ClinicalQuestionnairePanel({
  isTablet,
  completedQuestionnaire,
  questionnaireAvailability,
  summary,
  answers,
}: ClinicalQuestionnairePanelProps) {
  const { theme } = useTheme();
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const [visibleItemsCount, setVisibleItemsCount] = useState(ANSWER_PAGE_SIZE);
  const [isExpanded, setIsExpanded] = useState(false);

  const reviewItems = useMemo(() => buildQuestionnaireReviewItems(answers), [answers]);
  const visibleReviewItems = useMemo(
    () => reviewItems.slice(0, visibleItemsCount),
    [reviewItems, visibleItemsCount]
  );
  const summaryFields = useMemo(
    () =>
      summaryFieldLabels
        .map((field) => ({
          label: field.label,
          value: summary?.[field.key] ?? null,
        }))
        .filter((item): item is { label: string; value: string } => Boolean(item.value)),
    [summary]
  );
  const concernChips = summary?.concerns ?? [];
  const hasQuestionnaireContent =
    reviewItems.length > 0 || summaryFields.length > 0 || concernChips.length > 0;

  useEffect(() => {
    setIsExpanded(false);
    setVisibleItemsCount(ANSWER_PAGE_SIZE);
  }, [completedQuestionnaire, questionnaireAvailability, reviewItems.length, summaryFields.length, concernChips.length]);

  const handleToggleExpanded = () => {
    setIsExpanded((current) => {
      const nextValue = !current;
      if (!nextValue) {
        setVisibleItemsCount(ANSWER_PAGE_SIZE);
      }
      return nextValue;
    });
  };

  const collapsedDescription =
    reviewItems.length > 0
      ? `${reviewItems.length} ${reviewItems.length === 1 ? 'bloque de respuestas disponible' : 'bloques de respuestas disponibles'}. Ábrelo solo cuando necesites revisar el detalle.`
      : 'Mantén este bloque cerrado para consultar primero el resto del expediente.';

  return (
    <Card variant="default" padding="large">
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.textPrimary }, displayTitleStyle]}>
            Cuestionario inicial
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Recoge lo que el paciente compartió antes de empezar. Úsalo como contexto para la
            primera valoración y el seguimiento.
          </Text>
        </View>
        {reviewItems.length > 0 ? (
          <View style={[styles.statusPill, { backgroundColor: theme.primaryAlpha12 }]}>
            <Ionicons name="document-text-outline" size={14} color={theme.primary} />
            <Text style={[styles.statusPillText, { color: theme.primary }, labelStyle]}>
              {reviewItems.length} {reviewItems.length === 1 ? 'respuesta' : 'respuestas'}
            </Text>
          </View>
        ) : null}
      </View>

      {!completedQuestionnaire || questionnaireAvailability === 'NOT_STARTED' ? (
        <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
          <Ionicons name="chatbox-ellipses-outline" size={22} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
            El paciente aún no ha completado el cuestionario
          </Text>
          <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
            Cuando lo haga, aquí podrás revisar tanto un resumen como las respuestas que dio al
            iniciar el proceso.
          </Text>
        </View>
      ) : questionnaireAvailability === 'REQUIRES_REFRESH' && !hasQuestionnaireContent ? (
        <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
          <Ionicons name="refresh-outline" size={22} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
            Hace falta actualizar el cuestionario
          </Text>
          <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
            Este paciente figura como cuestionario completado, pero sus respuestas ya no están
            disponibles en el expediente. Para volver a consultarlas, el paciente debe actualizar
            su cuestionario desde su cuenta.
          </Text>
        </View>
      ) : hasQuestionnaireContent ? (
        <View style={styles.panelStack}>
          <AnimatedPressable
            onPress={handleToggleExpanded}
            pressScale={0.995}
            hoverLift={true}
            style={[
              styles.disclosureCard,
              {
                backgroundColor: theme.bgMuted,
                borderColor: theme.border,
                shadowColor: theme.shadowCard,
              },
            ]}
          >
            <View style={[styles.disclosureIconWrap, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Ionicons
                name={isExpanded ? 'folder-open-outline' : 'folder-outline'}
                size={18}
                color={theme.primary}
              />
            </View>

            <View style={styles.disclosureCopy}>
              <Text style={[styles.disclosureTitle, { color: theme.textPrimary }, emphasisStyle]}>
                {isExpanded ? 'Cuestionario desplegado' : 'Ver cuestionario completo'}
              </Text>
              <Text style={[styles.disclosureDescription, { color: theme.textSecondary }]}>
                {collapsedDescription}
              </Text>
            </View>

            <View style={styles.disclosureAction}>
              <Text style={[styles.disclosureActionText, { color: theme.primary }, labelStyle]}>
                {isExpanded ? 'Ocultar' : 'Ver'}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={theme.primary}
              />
            </View>
          </AnimatedPressable>

          {isExpanded ? (
            <View style={styles.contentStack}>
              {concernChips.length > 0 || summaryFields.length > 0 ? (
                <View style={[styles.summaryPanel, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
                  {concernChips.length > 0 ? (
                    <View style={styles.summaryBlock}>
                      <Text style={[styles.blockLabel, { color: theme.textMuted }, labelStyle]}>
                        Motivos principales
                      </Text>
                      <View style={styles.chipRow}>
                        {concernChips.map((concern) => (
                          <View
                            key={concern}
                            style={[styles.chip, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                          >
                            <Text style={[styles.chipText, { color: theme.textSecondary }, labelStyle]}>
                              {concern}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {summaryFields.length > 0 ? (
                    <View style={[styles.summaryGrid, !isTablet && styles.summaryGridMobile]}>
                      {summaryFields.map((item) => (
                        <View key={item.label} style={styles.summaryItem}>
                          <Text style={[styles.blockLabel, { color: theme.textMuted }, labelStyle]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.summaryValue, { color: theme.textPrimary }, emphasisStyle]}>
                            {item.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {reviewItems.length > 0 ? (
                <View style={styles.answerStack}>
                  {visibleReviewItems.map((item) => (
                    <View
                      key={item.questionId}
                      style={[styles.answerCard, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}
                    >
                      <Text style={[styles.blockLabel, { color: theme.primary }, labelStyle]}>
                        {item.categoryLabel}
                      </Text>
                      <Text style={[styles.questionText, { color: theme.textPrimary }, emphasisStyle]}>
                        {item.question}
                      </Text>
                      <View style={styles.answerList}>
                        {item.answers.map((answer) => (
                          <View
                            key={`${item.questionId}-${answer}`}
                            style={[styles.answerChip, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                          >
                            <Text style={[styles.answerChipText, { color: theme.textSecondary }]}>
                              {answer}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}

                  <View style={[styles.answerActions, !isTablet && styles.answerActionsMobile]}>
                    {visibleItemsCount < reviewItems.length ? (
                      <Button
                        variant="secondary"
                        size="small"
                        onPress={() => setVisibleItemsCount((current) => current + ANSWER_PAGE_SIZE)}
                      >
                        Ver más respuestas
                      </Button>
                    ) : <View />}

                    <Button variant="ghost" size="small" onPress={handleToggleExpanded}>
                      Ocultar cuestionario
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
          <Ionicons name="document-outline" size={22} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
            Las respuestas completas no están disponibles en esta ficha
          </Text>
          <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
            El cuestionario ya figura como completado, pero no se ha podido recuperar el detalle
            de las respuestas.
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
  },
  description: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  statusPillText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  panelStack: {
    gap: spacing.md,
  },
  disclosureCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  disclosureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosureCopy: {
    flex: 1,
    gap: 4,
  },
  disclosureTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  disclosureDescription: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  disclosureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  disclosureActionText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  contentStack: {
    gap: spacing.lg,
  },
  summaryPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryBlock: {
    gap: spacing.sm,
  },
  blockLabel: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryGridMobile: {
    gap: spacing.sm,
  },
  summaryItem: {
    minWidth: 180,
    flex: 1,
    gap: 6,
  },
  summaryValue: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  answerStack: {
    gap: spacing.md,
  },
  answerCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    gap: spacing.md,
  },
  questionText: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  answerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  answerChip: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  answerChipText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
  answerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  answerActionsMobile: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
});
