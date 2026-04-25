import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { LEGAL_DOCUMENTS } from '../../constants/legal';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

type LegalDocumentRoute = AppRouteProp<'LegalDocument'>;

export function LegalDocumentScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<LegalDocumentRoute>();
  const { theme, isDark } = useTheme();
  const document = LEGAL_DOCUMENTS[route.params.documentKey];

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.shell}>
        <AnimatedPressable
          onPress={goBack}
          hoverLift={false}
          pressScale={0.96}
          style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.bgCard }]}
        >
          <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
          <Text style={[styles.backText, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>
            Volver
          </Text>
        </AnimatedPressable>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
            HERA Legal
          </Text>
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
            {document.title}
          </Text>
          <Text style={[styles.summary, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            {document.summary}
          </Text>
          <Text style={[styles.version, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
            Versión {document.version}. Borrador operativo pendiente de revisión legal final.
          </Text>
        </View>

        <View style={styles.sections}>
          {document.sections.map((section) => (
            <View
              key={section.title}
              style={[
                styles.section,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark ? theme.bgCard : theme.bgMuted,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>
                {section.title}
              </Text>
              {section.body.map((paragraph) => (
                <Text
                  key={paragraph}
                  style={[styles.paragraph, { color: theme.textSecondary, fontFamily: theme.fontSans }]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  shell: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xl,
  },
  backText: {
    fontSize: 14,
  },
  header: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 42,
    lineHeight: 48,
    marginBottom: spacing.md,
  },
  summary: {
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 720,
  },
  version: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  sections: {
    gap: spacing.md,
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
});
