import React from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';

export function QuestionnaireAccessNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.bgMuted,
        borderRadius: 14,
        padding: compact ? 0 : 16,
        marginBottom: compact ? 0 : 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <Ionicons name="leaf-outline" size={22} color={theme.textPrimary} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={{
            fontFamily: theme.fontSansSemiBold,
            fontSize: 15,
            lineHeight: 21,
            color: theme.textPrimary,
          }}
        >
          Tu cuestionario está listo para guardar
        </Text>
        <Text
          style={{
            fontFamily: theme.fontSans,
            fontSize: 14,
            lineHeight: 21,
            color: theme.textSecondary,
          }}
        >
          Accede con una cuenta de paciente para guardar tus respuestas y
          consultar los profesionales recomendados. Hasta entonces, el borrador
          permanece en esta pestaña.
        </Text>
      </View>
    </View>
  );
}

/** Only wraps access screens reached with a prepared questionnaire. */
export function QuestionnaireAccessLayout({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  if (!active) return <>{children}</>;
  const wide = width >= 1000;
  return (
    <View
      style={{
        flexDirection: wide ? 'row' : 'column',
        backgroundColor: theme.bgCard,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.borderLight,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: wide ? '36%' : '100%',
          padding: wide ? 32 : 20,
          backgroundColor: theme.bgMuted,
          gap: 20,
        }}
      >
        {wide ? (
          <>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: theme.bgCard,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={28} color={theme.textPrimary} />
            </View>
            <Text
              style={{
                fontFamily: theme.fontDisplay,
                fontSize: wide ? 32 : 26,
                lineHeight: wide ? 42 : 34,
                color: theme.textPrimary,
              }}
            >
              Ya has dado el primer paso.
            </Text>
          </>
        ) : null}
        <QuestionnaireAccessNotice compact={!wide} />
        {wide ? (
          <Image
            source={require('../../../../assets/questionnaire/still-life-desktop.webp')}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: '100%',
              height: 230,
              borderRadius: 18,
              opacity: isDark ? 0.78 : 1,
            }}
            resizeMode="cover"
          />
        ) : null}
      </View>
      <View
        style={{
          flex: wide ? 1 : undefined,
          minWidth: 0,
          padding: wide ? 32 : 20,
        }}
      >
        {children}
      </View>
    </View>
  );
}
