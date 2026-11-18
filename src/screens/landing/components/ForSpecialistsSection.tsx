import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import { AnimatedPressable } from "../../../components/common/AnimatedPressable";
interface ForSpecialistsSectionProps {
  primaryActionLabel: string;
  showLoginAction: boolean;
  onProductTour: () => void;
  onViewPlans: () => void;
  onPrimaryAction: () => void;
  onLogin: () => void;
  onClinicAccess: () => void;
}
export function ForSpecialistsSection({
  onPrimaryAction,
}: ForSpecialistsSectionProps): React.ReactElement {
  const { theme } = useTheme();
  const wide = useWindowDimensions().width >= 900;
  return (
    <View
      style={{
        backgroundColor: theme.landingCanvas,
        paddingHorizontal: wide ? 40 : 20,
        paddingVertical: 40,
      }}
    >
      <View
        style={{
          maxWidth: 1280,
          width: "100%",
          alignSelf: "center",
          backgroundColor: theme.landingProfessional,
          borderRadius: 18,
          padding: wide ? 40 : 26,
          flexDirection: wide ? "row" : "column",
          alignItems: wide ? "center" : "flex-start",
          gap: 28,
        }}
      >
        <View style={{ flex: 1, gap: 12 }}>
          <Text
            style={{
              fontFamily: theme.fontSansSemiBold,
              color: theme.primary,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            PARA QUIENES ACOMPAÑAN
          </Text>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={{
              fontFamily: theme.fontDisplay,
              color: theme.textPrimary,
              fontSize: wide ? 32 : 27,
            }}
          >
            Tu consulta también tiene su espacio en HERA
          </Text>
          <Text
            style={{
              fontFamily: theme.fontSans,
              color: theme.textSecondary,
              fontSize: 16,
              lineHeight: 25,
              maxWidth: 700,
            }}
          >
            Descubre las herramientas para organizar tu agenda, tus pacientes y
            la gestión de tu consulta de psicología.
          </Text>
        </View>
        <AnimatedPressable
          onPress={onPrimaryAction}
          href="/software-para-psicologos"
          accessibilityRole="link"
          hoverLift={false}
          style={{
            minHeight: 48,
            paddingHorizontal: 22,
            paddingVertical: 14,
            borderRadius: 8,
            backgroundColor: theme.actionPrimary,
          }}
        >
          <Text
            style={{
              color: theme.actionPrimaryText,
              fontFamily: theme.fontSansSemiBold,
              fontSize: 15,
            }}
          >
            Conocer HERA para profesionales →
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
