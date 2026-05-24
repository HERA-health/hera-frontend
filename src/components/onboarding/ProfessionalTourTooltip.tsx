import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RenderProps } from 'react-native-spotlight-tour';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import type { ProfessionalTourStepDefinition } from './professionalTourTypes';

interface ProfessionalTourTooltipProps extends RenderProps {
  onNext: () => void;
  onSkip: () => void;
  routeName: string;
  step: ProfessionalTourStepDefinition;
  totalSteps: number;
  tourId: string;
}

export function ProfessionalTourTooltip({
  current,
  isFirst,
  isLast,
  onNext,
  onSkip,
  previous,
  routeName,
  step,
  totalSteps,
  tourId,
}: ProfessionalTourTooltipProps): React.ReactElement {
  const { theme } = useTheme();
  const { height, width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalInset = isCompact ? spacing.sm : spacing.md;
  const cardWidth = Math.min(width - horizontalInset * 2, width < 768 ? 336 : 360);
  const maxCardHeight = Math.max(220, Math.min(height - 48, width < 768 ? 420 : 520));
  const bodyMaxHeight = Math.max(88, maxCardHeight - 158);

  useEffect(() => {
    analyticsService.track('professional_tour_step_viewed', {
      route: routeName,
      stepId: step.id,
      tourId,
    });
  }, [routeName, step.id, tourId]);

  return (
    <View
      testID="professional-tour-tooltip"
      style={[
        styles.card,
        {
          backgroundColor: theme.bgElevated,
          borderColor: theme.border,
          shadowColor: theme.shadowCard,
          maxHeight: maxCardHeight,
          width: cardWidth,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconShell, { backgroundColor: theme.primaryAlpha12 }]}>
          <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
        </View>
        <Text
          style={[styles.progress, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}
        >
          {current + 1}/{totalSteps}
        </Text>
      </View>

      <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
        {step.title}
      </Text>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.bodyScrollContent}
        showsVerticalScrollIndicator={false}
        style={[styles.bodyScroll, { maxHeight: bodyMaxHeight }]}
      >
        <Text style={[styles.body, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          {step.body}
        </Text>
      </ScrollView>

      <View style={[styles.actions, isCompact && styles.actionsCompact]}>
        <AnimatedPressable
          onPress={onSkip}
          hoverLift={false}
          pressScale={0.96}
          style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
          accessibilityLabel="Omitir guía"
        >
          <Text
            style={[styles.secondaryText, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}
          >
            Omitir
          </Text>
        </AnimatedPressable>

        <View style={styles.navigationActions}>
          {!isFirst ? (
            <AnimatedPressable
              onPress={previous}
              hoverLift={false}
              pressScale={0.94}
              style={[styles.iconButton, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
              accessibilityLabel="Paso anterior"
            >
              <Ionicons name="chevron-back" size={18} color={theme.textSecondary} />
            </AnimatedPressable>
          ) : null}

          <AnimatedPressable
            onPress={onNext}
            hoverLift={false}
            pressScale={0.96}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            accessibilityLabel={isLast ? 'Terminar guía' : 'Siguiente paso'}
          >
            <Text
              style={[styles.primaryText, { color: theme.textOnPrimary, fontFamily: theme.fontSansSemiBold }]}
            >
              {isLast ? 'Terminar' : 'Siguiente'}
            </Text>
            {!isLast ? (
              <Ionicons name="chevron-forward" size={16} color={theme.textOnPrimary} />
            ) : null}
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    fontSize: 12,
    lineHeight: 16,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
  },
  bodyScroll: {
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  bodyScrollContent: {
    paddingBottom: 1,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionsCompact: {
    alignItems: 'stretch',
  },
  navigationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    flex: 1,
    minWidth: 156,
  },
  secondaryButton: {
    minHeight: 38,
    minWidth: 84,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryText: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 38,
    minWidth: 104,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  primaryText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
