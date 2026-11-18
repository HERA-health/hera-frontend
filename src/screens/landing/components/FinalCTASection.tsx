import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import { AnimatedPressable } from "../../../components/common/AnimatedPressable";
interface FinalCTASectionProps {
  onFindSpecialist: () => void;
  professionalActionLabel: string;
  onProfessionalAction: () => void;
}
export function FinalCTASection({
  onFindSpecialist,
}: FinalCTASectionProps): React.ReactElement {
  const { theme } = useTheme();
  const wide = useWindowDimensions().width >= 900;
  return (
    <View
      style={{ padding: wide ? 48 : 20, backgroundColor: theme.landingCanvas }}
    >
      <View
        style={{
          maxWidth: 1280,
          width: "100%",
          alignSelf: "center",
          padding: wide ? 54 : 30,
          borderRadius: 20,
          backgroundColor: theme.landingCta,
          gap: 20,
        }}
      >
        <Text
          style={{
            color: theme.landingCtaMutedText,
            fontFamily: theme.fontSansSemiBold,
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          A TU RITMO, CON ACOMPAÑAMIENTO
        </Text>
        <Text
          accessibilityRole="header"
          aria-level={2}
          style={{
            color: theme.landingCtaText,
            fontFamily: theme.fontDisplay,
            fontSize: wide ? 40 : 30,
            maxWidth: 760,
          }}
        >
          El primer paso puede ser encontrar a alguien con quien hablar.
        </Text>
        <Text
          style={{
            color: theme.landingCtaMutedText,
            fontFamily: theme.fontSans,
            fontSize: 17,
            lineHeight: 27,
            maxWidth: 670,
          }}
        >
          Conoce a nuestros psicólogos y psicólogas, descubre su forma de
          trabajar y elige con quién te gustaría empezar.
        </Text>
        <AnimatedPressable
          href="/especialistas"
          onPress={onFindSpecialist}
          accessibilityRole="link"
          hoverLift={false}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 15,
            paddingHorizontal: 24,
            borderRadius: 8,
            backgroundColor: theme.bgCard,
          }}
        >
          <Text
            style={{
              color: theme.textPrimary,
              fontFamily: theme.fontSansSemiBold,
              fontSize: 16,
            }}
          >
            Buscar psicólogo/a →
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
