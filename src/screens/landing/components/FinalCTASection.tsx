import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { useTheme } from '../../../contexts/ThemeContext';

interface FinalCTASectionProps {
  onFindSpecialist: () => void;
  professionalActionLabel: string;
  onProfessionalAction: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({
  onFindSpecialist,
  professionalActionLabel,
  onProfessionalAction,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 900;

  return (
    <View
      style={[
        styles.container,
        isDesktop && styles.containerDesktop,
        { backgroundColor: theme.landingCanvas },
      ]}
    >
      <View
        style={[
          styles.panel,
          isDesktop && styles.panelDesktop,
          {
            backgroundColor: theme.landingCta,
            borderColor: theme.landingPanelBorder,
          },
        ]}
      >
        <View style={styles.content}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.landingCtaMutedText, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            DOS FORMAS DE EMPEZAR
          </Text>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              isDesktop && styles.titleDesktop,
              { color: theme.landingCtaText, fontFamily: theme.fontDisplay },
            ]}
          >
            Empieza por lo que necesitas hoy
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.landingCtaMutedText, fontFamily: theme.fontSans },
            ]}
          >
            Explora apoyo profesional o construye un espacio más claro para tu consulta.
          </Text>

          <View style={[styles.doors, isDesktop && styles.doorsDesktop]}>
            <AnimatedPressable
              onPress={onFindSpecialist}
              pressScale={0.98}
              hoverLift={false}
              accessibilityRole="link"
              accessibilityLabel="Explorar profesionales"
              style={[
                styles.door,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderLight,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="search-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.doorCopy}>
                <Text
                  style={[
                    styles.doorEyebrow,
                    { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  BUSCO APOYO
                </Text>
                <Text
                  style={[
                    styles.doorTitle,
                    { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                  ]}
                >
                  Explorar profesionales
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={21} color={theme.primary} />
            </AnimatedPressable>

            <AnimatedPressable
              onPress={onProfessionalAction}
              pressScale={0.98}
              hoverLift={false}
              accessibilityRole="button"
              accessibilityLabel={professionalActionLabel}
              style={[
                styles.door,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderLight,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.secondaryAlpha12 }]}>
                <Ionicons name="briefcase-outline" size={24} color={theme.secondaryDark} />
              </View>
              <View style={styles.doorCopy}>
                <Text
                  style={[
                    styles.doorEyebrow,
                    { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  SOY PROFESIONAL
                </Text>
                <Text
                  style={[
                    styles.doorTitle,
                    { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                  ]}
                >
                  {professionalActionLabel}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={21} color={theme.secondaryDark} />
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 60,
  },
  panel: {
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 64,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  panelDesktop: {
    borderRadius: 12,
    paddingVertical: 84,
    paddingHorizontal: 60,
  },
  content: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 35,
    lineHeight: 43,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 44,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 34,
  },
  doors: {
    width: '100%',
    gap: 14,
  },
  doorsDesktop: {
    flexDirection: 'row',
  },
  door: {
    flex: 1,
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorCopy: {
    flex: 1,
  },
  doorEyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  doorTitle: {
    fontSize: 17,
    lineHeight: 23,
  },
});
