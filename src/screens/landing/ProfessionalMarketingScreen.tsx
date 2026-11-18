import React from "react";
import { ScrollView, Text, View, Linking, Image } from "react-native";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import type {
  RootStackParamList,
  AppNavigationProp,
} from "../../constants/types";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../../components/common/Button";
import { professionalPages } from "../../seo/professionalContent";

const pages = {
  ProfessionalSoftware: "software",
  ProfessionalAgenda: "agenda",
  ProfessionalPatients: "patients",
  ProfessionalBillingInfo: "billing",
} as const;
export function ProfessionalMarketingScreen(): React.ReactElement {
  const route = useRoute<RouteProp<RootStackParamList, keyof typeof pages>>();
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, isDark } = useTheme();
  const page = professionalPages[pages[route.name]];
  return (
    <ScrollView
      style={{ backgroundColor: theme.landingCanvas }}
      contentContainerStyle={{ padding: 24, gap: 24 }}
    >
      <Text
        style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold }}
      >
        {page.eyebrow}
      </Text>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 36,
          color: theme.textPrimary,
        }}
      >
        {page.heading}
      </Text>
      <Text
        style={{
          fontFamily: theme.fontSans,
          fontSize: 18,
          lineHeight: 28,
          color: theme.textSecondary,
        }}
      >
        {page.intro}
      </Text>
      <Button onPress={() => navigation.navigate("Pricing")}>
        Ver planes y precios
      </Button>
      <Image
        source={{
          uri:
            "https://www.health-hera.com/marketing/product/" +
            page.image +
            (isDark ? "-dark" : "-light") +
            "-1600.webp",
        }}
        accessibilityLabel={page.eyebrow + " · Datos de demostración"}
        style={{ width: "100%", aspectRatio: 1.6, borderRadius: 12 }}
        resizeMode="contain"
      />
      <Button onPress={() => navigation.navigate("ProfessionalShowcase")}>
        Ver HERA por dentro
      </Button>
      {page.sections.map((section) => (
        <View key={section.title} style={{ gap: 16, paddingVertical: 20 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: theme.fontDisplay,
              fontSize: 28,
              color: theme.textPrimary,
            }}
          >
            {section.title}
          </Text>
          <Text
            style={{
              fontFamily: theme.fontSans,
              fontSize: 16,
              lineHeight: 26,
              color: theme.textSecondary,
            }}
          >
            {section.text}
          </Text>
          {section.link ? (
            <Button
              children={section.link.label}
              onPress={() =>
                void Linking.openURL(
                  "https://www.health-hera.com" + section.link?.href,
                )
              }
            />
          ) : null}
        </View>
      ))}
      {page.faqs.map((faq) => (
        <View key={faq.question} style={{ gap: 10 }}>
          <Text
            style={{
              fontFamily: theme.fontSansSemiBold,
              color: theme.textPrimary,
              fontSize: 18,
            }}
          >
            {faq.question}
          </Text>
          <Text
            style={{
              fontFamily: theme.fontSans,
              color: theme.textSecondary,
              lineHeight: 24,
            }}
          >
            {faq.answer}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
