import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AmbientBackground } from '../../components/common/AmbientBackground';
import { Button } from '../../components/common/Button';
import { MotionView } from '../../components/common/MotionView';
import { spacing } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { LandingHeader } from '../landing/components/LandingHeader';
import type { LandingSectionAnchor } from '../landing/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

const CTA_BULLETS = {
  client: [
    'Explora perfiles profesionales verificados',
    'Compara modalidad, precio y disponibilidad',
    'Consulta y organiza tus próximas sesiones',
  ],
  professional: [
    'Publica tu perfil y recibe reservas',
    'Gestiona agenda, pacientes y sesiones',
    'Reúne documentos, consentimientos y facturación',
  ],
  clinic: [
    'Conecta equipo, pacientes y agenda',
    'Gestiona facturación y reparto económico',
    'Trabaja desde un panel propio para el centro',
  ],
} as const;

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const useHorizontalLayout = width >= 900;

  const handleGoBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  }, [navigation]);

  const handleLandingSection = React.useCallback(
    (section: LandingSectionAnchor) => {
      navigation.navigate('Landing', { section });
    },
    [navigation]
  );

  const handleLandingHome = React.useCallback(() => {
    navigation.navigate('Landing');
  }, [navigation]);

  const handleFindSpecialist = React.useCallback(() => {
    navigation.navigate('PublicSpecialists');
  }, [navigation]);

  const handleExploreProfessionals = React.useCallback(() => {
    navigation.navigate('Landing', { section: 'forSpecialists' });
  }, [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <AmbientBackground variant="auth" />

      <LandingHeader
        context="access"
        isScrolled
        accessLabel="Volver"
        accessIconName="arrow-back"
        onLogoPress={handleLandingHome}
        onFindSpecialist={handleFindSpecialist}
        onExploreProfessionals={handleExploreProfessionals}
        onAccess={handleGoBack}
        onScrollToSection={handleLandingSection}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          useHorizontalLayout && styles.scrollContentHorizontal,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <MotionView entering="fadeInUp" delay={0} style={styles.intro}>
          <View
            style={[
              styles.eyebrow,
              {
                backgroundColor: theme.primaryAlpha12,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="log-in-outline" size={15} color={theme.primary} />
            <Text
              style={[
                styles.eyebrowText,
                {
                  color: theme.primary,
                  fontFamily: theme.fontSansSemiBold,
                },
              ]}
            >
              ACCESO A HERA
            </Text>
          </View>

          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color: theme.textPrimary,
                fontFamily: theme.fontDisplay,
              },
            ]}
          >
            ¿Cómo quieres acceder?
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.textSecondary,
                fontFamily: theme.fontSans,
              },
            ]}
          >
            Elige tu espacio para continuar como paciente, profesional o clínica.
          </Text>
        </MotionView>

        <View
          style={[
            styles.cardGrid,
            useHorizontalLayout ? styles.cardGridHorizontal : styles.cardGridVertical,
          ]}
        >
          <MotionView
            entering="fadeInUp"
            delay={80}
            style={useHorizontalLayout ? styles.cardWrapperHorizontal : undefined}
          >
            <View
              style={[
                styles.accessCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.primaryMuted,
                  shadowColor: theme.shadowCard,
                },
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="people-outline" size={30} color={theme.primary} />
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: theme.textPrimary,
                    fontFamily: theme.fontDisplay,
                  },
                ]}
              >
                Busco terapia
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  {
                    color: theme.textSecondary,
                    fontFamily: theme.fontSans,
                  },
                ]}
              >
                Accede a tus sesiones y seguimiento.
              </Text>

              <View style={styles.bulletList}>
                {CTA_BULLETS.client.map((bullet) => (
                  <View key={bullet} style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={17} color={theme.primary} />
                    <Text
                      style={[
                        styles.bulletText,
                        {
                          color: theme.textSecondary,
                          fontFamily: theme.fontSans,
                        },
                      ]}
                    >
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
                variant="primary"
                size="large"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={19} color={theme.actionPrimaryText} />}
                iconPosition="right"
                style={styles.cardButton}
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Acceder como paciente
              </Button>
            </View>
          </MotionView>

          <MotionView
            entering="fadeInUp"
            delay={140}
            style={useHorizontalLayout ? styles.cardWrapperHorizontal : undefined}
          >
            <View
              style={[
                styles.accessCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.secondaryLight + '40',
                  shadowColor: theme.shadowCard,
                },
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: theme.secondaryAlpha12 }]}>
                <Ionicons name="briefcase-outline" size={30} color={theme.secondary} />
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: theme.textPrimary,
                    fontFamily: theme.fontDisplay,
                  },
                ]}
              >
                Soy profesional
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  {
                    color: theme.textSecondary,
                    fontFamily: theme.fontSans,
                  },
                ]}
              >
                Accede a la gestión de tu consulta.
              </Text>

              <View style={styles.bulletList}>
                {CTA_BULLETS.professional.map((bullet) => (
                  <View key={bullet} style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={17} color={theme.secondary} />
                    <Text
                      style={[
                        styles.bulletText,
                        {
                          color: theme.textSecondary,
                          fontFamily: theme.fontSans,
                        },
                      ]}
                    >
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}
                variant="secondary"
                size="large"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={19} color={theme.secondaryDark} />}
                iconPosition="right"
                style={styles.cardButton}
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Acceder como profesional
              </Button>
            </View>
          </MotionView>

          <MotionView
            entering="fadeInUp"
            delay={200}
            style={useHorizontalLayout ? styles.cardWrapperHorizontal : undefined}
          >
            <View
              style={[
                styles.accessCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderStrong,
                  shadowColor: theme.shadowCard,
                },
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="business-outline" size={30} color={theme.primary} />
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: theme.textPrimary,
                    fontFamily: theme.fontDisplay,
                  },
                ]}
              >
                Gestiono una clínica
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  {
                    color: theme.textSecondary,
                    fontFamily: theme.fontSans,
                  },
                ]}
              >
                Accede al espacio de tu centro.
              </Text>

              <View style={styles.bulletList}>
                {CTA_BULLETS.clinic.map((bullet) => (
                  <View key={bullet} style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={17} color={theme.primary} />
                    <Text
                      style={[
                        styles.bulletText,
                        {
                          color: theme.textSecondary,
                          fontFamily: theme.fontSans,
                        },
                      ]}
                    >
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                onPress={() => navigation.navigate('Login', { userType: 'CLINIC' })}
                variant="outline"
                size="large"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={19} color={theme.link} />}
                iconPosition="right"
                style={styles.cardButton}
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Acceder como clínica
              </Button>
            </View>
          </MotionView>
        </View>

        <Text
          style={[
            styles.helperText,
            {
              color: theme.textMuted,
              fontFamily: theme.fontSans,
            },
          ]}
        >
          Si todavía no tienes cuenta, podrás crearla desde la siguiente pantalla.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    paddingTop: 92,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  scrollContentHorizontal: {
    minHeight: '100%',
    paddingTop: 98,
    justifyContent: 'flex-start',
  },
  intro: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eyebrow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.9,
  },
  title: {
    maxWidth: 760,
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 680,
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  cardGrid: {
    width: '100%',
    gap: spacing.md,
  },
  cardGridHorizontal: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardGridVertical: {
    flexDirection: 'column',
  },
  cardWrapperHorizontal: {
    flex: 1,
    minWidth: 0,
  },
  accessCard: {
    flex: 1,
    minHeight: 390,
    padding: 22,
    borderWidth: 1,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  cardIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.45,
    textAlign: 'center',
  },
  cardSubtitle: {
    minHeight: 42,
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  bulletList: {
    flex: 1,
    gap: 9,
    marginTop: 16,
    marginBottom: 18,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  cardButton: {
    marginTop: 'auto',
  },
  helperText: {
    marginTop: 18,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
