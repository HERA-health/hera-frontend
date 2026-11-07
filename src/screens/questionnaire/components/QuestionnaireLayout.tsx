import React, { useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import type { QuestionnaireDefinition } from '../../../services/questionnaireService';

export function QuestionnaireIntroduction({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <View style={{ gap: compact ? 10 : 14 }}>
      <Text
        style={{
          fontFamily: theme.fontSansSemiBold,
          fontSize: 12,
          letterSpacing: 1.2,
          color: theme.primary,
        }}
      >
        CUESTIONARIO DE AFINIDAD
      </Text>
      <Text
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: compact ? 24 : 28,
          lineHeight: compact ? 31 : 36,
          color: theme.textPrimary,
        }}
      >
        Un espacio para empezar a cuidarte.
      </Text>
      {!compact ? (
        <>
          <Text
            style={{
              fontFamily: theme.fontSans,
              fontSize: 15,
              lineHeight: 22,
              color: theme.textSecondary,
            }}
          >
            Cuéntanos qué necesitas. Te ayudamos a dar el siguiente paso, con
            calma.
          </Text>
          <View style={{ gap: 10, marginTop: 2 }}>
            {(
              [
                ['time-outline', 'A tu ritmo, paso a paso'],
                [
                  'chatbubble-ellipses-outline',
                  'Los campos abiertos son opcionales',
                ],
                ['person-circle-outline', 'Accede al terminar para guardar'],
              ] as const
            ).map(([icon, label]) => (
              <View
                key={icon}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
              >
                <Ionicons name={icon} size={22} color={theme.textPrimary} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: theme.fontSans,
                    fontSize: 14,
                    lineHeight: 21,
                    color: theme.textSecondary,
                  }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <Image
            source={require('../../../../assets/questionnaire/still-life-desktop.webp')}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            resizeMode="cover"
            style={{
              width: '100%',
              height: height < 800 ? 140 : 190,
              borderRadius: 20,
              marginTop: 4,
              opacity: isDark ? 0.78 : 1,
            }}
          />
        </>
      ) : null}
    </View>
  );
}

interface Props {
  children: React.ReactNode;
  footer: React.ReactNode;
  definition: QuestionnaireDefinition | null;
  step: number;
  onStep: (step: number) => void;
  onFormLayout: (event: LayoutChangeEvent) => void;
  scrollRef: React.RefObject<ScrollView | null>;
  headerHeight: number;
}

export function QuestionnaireLayout({
  children,
  footer,
  definition,
  step,
  onStep,
  onFormLayout,
  scrollRef,
  headerHeight,
}: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 1280;
  const desktop = width >= 900;
  const [stepsOpen, setStepsOpen] = useState(false);
  const steps = (
    <View testID="questionnaire-sidebar" style={{ gap: 2 }}>
      <Text
        style={{
          fontFamily: theme.fontSansSemiBold,
          fontSize: 12,
          letterSpacing: 1,
          color: theme.textSecondary,
          marginBottom: 10,
        }}
      >
        TU RECORRIDO
      </Text>
      {definition?.steps.map((item, index) => {
        const active = index + 1 === step;
        const complete = index + 1 < step;
        return (
          <AnimatedPressable
            hoverLift={false}
            pressScale={1}
            key={item.shortTitle}
            disabled={index + 1 > step}
            accessibilityRole="button"
            accessibilityLabel={`Ir al paso ${index + 1}: ${item.shortTitle}`}
            accessibilityState={{
              disabled: index + 1 > step,
              selected: active,
            }}
            onPress={() => {
              onStep(index + 1);
              setStepsOpen(false);
            }}
            style={{
              ...(Platform.OS === 'web' ? { outlineColor: theme.focus } : {}),
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 4,
              paddingRight: 8,
              borderRightWidth: 2,
              borderRightColor: active ? theme.actionPrimary : 'transparent',
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: active ? theme.actionPrimary : theme.bgMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {complete ? (
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={theme.textPrimary}
                />
              ) : (
                <Text
                  style={{
                    fontFamily: theme.fontSansSemiBold,
                    fontSize: 13,
                    color: active
                      ? theme.actionPrimaryText
                      : theme.textSecondary,
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: active ? theme.fontSansSemiBold : theme.fontSans,
                fontSize: 14,
                lineHeight: 20,
                color: active ? theme.textPrimary : theme.textSecondary,
              }}
            >
              {item.shortTitle}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
  return (
    <ScrollView
      testID="questionnaire-form-scroll"
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, marginTop: headerHeight }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: width < 600 ? 16 : 32,
        paddingTop: desktop ? 18 : 16,
        paddingBottom: 18,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 1600,
          flexDirection: wide ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: 20,
        }}
      >
        {wide ? (
          <View style={{ width: width >= 1600 ? 280 : 240, paddingTop: 12 }}>
            <QuestionnaireIntroduction />
          </View>
        ) : step === 0 && desktop ? (
          <QuestionnaireIntroduction compact />
        ) : null}
        <View
          style={{
            flex: wide ? 1 : undefined,
            width: wide ? undefined : '100%',
            minWidth: 0,
            backgroundColor: theme.bgCard,
            borderWidth: 1,
            borderColor: theme.borderLight,
            borderRadius: 24,
            padding: desktop ? 20 : 16,
            flexDirection: desktop ? 'row' : 'column',
            gap: desktop ? 20 : 12,
            shadowColor: theme.shadowCard,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            shadowOpacity: 0.45,
          }}
        >
          {desktop ? (
            <View
              style={{
                width: 180,
                borderRightWidth: 1,
                borderRightColor: theme.borderLight,
                paddingRight: 16,
              }}
            >
              {steps}
            </View>
          ) : (
            <>
              <AnimatedPressable
                hoverLift={false}
                pressScale={1}
                accessibilityRole="button"
                accessibilityLabel={stepsOpen ? 'Ocultar pasos' : 'Ver pasos'}
                accessibilityState={{ expanded: stepsOpen }}
                onPress={() => setStepsOpen(!stepsOpen)}
                style={{
                  ...(Platform.OS === 'web'
                    ? { outlineColor: theme.focus }
                    : {}),
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: theme.fontSansSemiBold,
                    fontSize: 14,
                    color: theme.textSecondary,
                  }}
                >
                  {stepsOpen ? 'Ocultar pasos' : 'Ver pasos'}
                </Text>
                <Ionicons
                  name={stepsOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textSecondary}
                />
              </AnimatedPressable>
              {stepsOpen ? steps : null}
            </>
          )}
          <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 14 }}>
            <View onLayout={onFormLayout} style={{ gap: 8 }}>
              {children}
            </View>
            {footer}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
