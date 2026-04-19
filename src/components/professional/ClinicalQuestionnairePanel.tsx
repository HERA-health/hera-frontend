import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  ClinicalQuestionnaireAnswers,
} from '../../services/clinicalService';
import type { QuestionnaireSummary } from '../../services/professionalService';
import type { QuestionnaireAvailability } from '../../services/professionalService';
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
      ) : (
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

              {visibleItemsCount < reviewItems.length ? (
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => setVisibleItemsCount((current) => current + ANSWER_PAGE_SIZE)}
                >
                  Ver más respuestas
                </Button>
              ) : null}
            </View>
          ) : questionnaireAvailability === 'REQUIRES_REFRESH' ? (
            <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
              <Ionicons name="refresh-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
                Hace falta actualizar el cuestionario
              </Text>
              <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
                Este paciente figura como cuestionario completado, pero sus respuestas ya no están
                disponibles en el expediente. Para volver a consultarlas, el paciente debe
                actualizar su cuestionario desde su cuenta.
              </Text>
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
