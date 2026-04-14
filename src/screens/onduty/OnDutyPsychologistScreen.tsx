import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { borderRadius, shadows, spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import { Button, AnimatedPressable, Card } from '../../components/common';
import type { RootStackParamList } from '../../constants/types';

type OnDutyNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CRISIS_RESOURCES = [
  {
    id: 'esperanza',
    name: 'Teléfono de la Esperanza',
    phone: '717 003 717',
    description: 'Atención emocional 24h',
  },
  {
    id: 'suicidio',
    name: 'Línea de Atención a la Conducta Suicida',
    phone: '024',
    description: 'Línea gratuita 24h',
  },
  {
    id: 'violencia',
    name: 'Atención a Víctimas de Violencia',
    phone: '016',
    description: 'Atención especializada 24h',
  },
] as const;

const getOnDutyPalette = (theme: Theme, isDark: boolean) => ({
  accent: isDark ? '#C7B3F2' : '#A88BE0',
  accentDark: isDark ? '#AA8DDD' : '#8F71CF',
  accentLight: isDark ? 'rgba(199, 179, 242, 0.14)' : 'rgba(168, 139, 224, 0.12)',
  sage: theme.secondary,
  sageLight: theme.primaryLight,
  background: theme.bg,
  cardBg: theme.bgCard,
  text: theme.textPrimary,
  textSecondary: theme.textSecondary,
  textMuted: theme.textMuted,
  success: theme.success,
  border: theme.border,
  borderLight: theme.borderLight,
  successBg: theme.successBg,
  successLight: theme.successLight,
  surfaceMuted: isDark ? theme.surfaceMuted : theme.bgMuted,
});

type OnDutyPalette = ReturnType<typeof getOnDutyPalette>;

const useOnDutyUi = () => {
  const { theme, isDark } = useTheme();
  const palette = useMemo(() => getOnDutyPalette(theme, isDark), [theme, isDark]);
  const styles = useMemo(() => createStyles(theme, isDark, palette), [theme, isDark, palette]);
  return { theme, isDark, palette, styles };
};

const PulsingDot: React.FC = () => {
  const { palette, styles } = useOnDutyUi();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.pulsingDotContainer}>
      <Animated.View
        style={[
          styles.pulsingDotOuter,
          {
            backgroundColor: palette.success,
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.35],
              outputRange: [0.55, 0],
            }),
          },
        ]}
      />
      <View style={[styles.pulsingDotInner, { backgroundColor: palette.success }]} />
    </View>
  );
};

const HeroSection: React.FC<{
  onExploreSpecialists: () => void;
  onViewSessions: () => void;
}> = ({ onExploreSpecialists, onViewSessions }) => {
  const { palette, styles } = useOnDutyUi();

  return (
    <View style={styles.heroSection}>
      <View style={styles.heroIconContainer}>
        <LinearGradient colors={[palette.accent, palette.accentDark]} style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={38} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text style={styles.heroEyebrow}>Vista previa informativa</Text>
      <Text style={styles.heroTitle} accessibilityRole="header">
        Estamos desplegando este servicio por fases
      </Text>
      <Text style={styles.heroSubtitle}>
        Esta pantalla muestra cómo funcionará el servicio de psicólogo de guardia.
        De momento mantenemos una demo honesta, con recursos reales de apoyo y acceso
        directo a especialistas y seguimiento.
      </Text>

      <View style={styles.heroActions}>
        <Button
          onPress={onExploreSpecialists}
          size="large"
          icon={<Ionicons name="search" size={20} color="#FFFFFF" />}
        >
          Explorar especialistas
        </Button>
        <Button
          onPress={onViewSessions}
          variant="secondary"
          size="large"
          icon={<Ionicons name="calendar-outline" size={18} color={palette.text} />}
        >
          Ver mis sesiones
        </Button>
      </View>

      <View style={styles.trustIndicator}>
        <Ionicons name="information-circle" size={16} color={palette.accent} />
        <Text style={styles.trustIndicatorText}>Demo del servicio, no canal operativo 24/7</Text>
      </View>
    </View>
  );
};

const WhenToUseSection: React.FC<{ onRegularBooking: () => void }> = ({ onRegularBooking }) => {
  const { palette, styles } = useOnDutyUi();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cuándo usar este servicio</Text>
      <Card style={styles.surfaceCard}>
        <Text style={styles.whenToUseIntro}>Esta vista te ayuda a entender el servicio y a usar alternativas reales mientras se despliega:</Text>

        <View style={styles.checklistContainer}>
          {[
            'Conocer cómo será el servicio cuando esté listo',
            'Acceder ya a recursos de apoyo verificables',
            'Reservar una sesión regular con seguimiento real',
            'Retomar tu proceso si ya tienes agenda abierta',
          ].map((item) => (
            <View key={item} style={styles.checklistItem}>
              <View style={[styles.checkmark, { backgroundColor: palette.accentLight }]}>
                <Ionicons name="checkmark" size={14} color={palette.accentDark} />
              </View>
              <Text style={styles.checklistText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.inlineActionRow}>
          <Text style={styles.inlineActionLabel}>Si necesitas apoyo real ahora:</Text>
          <AnimatedPressable onPress={onRegularBooking} style={styles.inlineLink}>
            <Text style={[styles.inlineLinkText, { color: palette.accent }]}>ver especialistas disponibles</Text>
            <Ionicons name="arrow-forward" size={16} color={palette.accent} />
          </AnimatedPressable>
        </View>
      </Card>
    </View>
  );
};

const HowItWorksSection: React.FC = () => {
  const { palette, styles } = useOnDutyUi();
  const steps = [
    {
      icon: 'eye-outline' as const,
      title: 'Entiende el servicio',
      description: 'Te mostramos cómo será el acceso inmediato cuando esté operativo.',
    },
    {
      icon: 'people-outline' as const,
      title: 'Usa opciones reales hoy',
      description: 'Mientras tanto, puedes reservar con especialistas o revisar tu agenda.',
    },
    {
      icon: 'heart-outline' as const,
      title: 'Vuelve cuando esté listo',
      description: 'Este espacio evolucionará al acceso directo del servicio de guardia.',
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Qué estamos preparando</Text>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <Card key={step.title} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={[styles.stepIconContainer, { backgroundColor: palette.accentLight }]}>
              <Ionicons name={step.icon} size={28} color={palette.accent} />
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
};

const ContactMethodsSection: React.FC<{
  onExploreSpecialists: () => void;
  onViewSessions: () => void;
}> = ({ onExploreSpecialists, onViewSessions }) => {
  const { palette, styles } = useOnDutyUi();
  const methods = [
    {
      id: 'specialists',
      icon: 'search',
      title: 'Especialistas',
      description: 'Reserva una sesión real con profesionales compatibles.',
      action: 'Ver especialistas',
      onPress: onExploreSpecialists,
    },
    {
      id: 'sessions',
      icon: 'calendar',
      title: 'Mis sesiones',
      description: 'Retoma tu seguimiento y revisa próximas sesiones o historial.',
      action: 'Abrir agenda',
      onPress: onViewSessions,
    },
  ] as const;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Qué puedes hacer ahora</Text>
      <View style={styles.contactCardsContainer}>
        {methods.map((method) => (
          <AnimatedPressable key={method.id} onPress={method.onPress} style={styles.contactCard}>
            <View style={[styles.contactIconContainer, { backgroundColor: palette.accentLight }]}>
              <Ionicons name={method.icon} size={30} color={palette.accent} />
            </View>
            <Text style={styles.contactTitle}>{method.title}</Text>
            <Text style={styles.contactDescription}>{method.description}</Text>
            <View style={styles.contactAction}>
              <Text style={[styles.contactActionText, { color: palette.accent }]}>{method.action}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.accent} />
            </View>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
};

const DemoStatusSection: React.FC<{
  onExploreSpecialists: () => void;
  onViewSessions: () => void;
}> = ({ onExploreSpecialists, onViewSessions }) => {
  const { palette, styles } = useOnDutyUi();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Estado actual del servicio</Text>
        <View style={styles.availabilityBadge}>
          <Ionicons name="construct-outline" size={14} color={palette.accent} />
          <Text style={[styles.availabilityText, { color: palette.accent }]}>En despliegue</Text>
        </View>
      </View>

      <Card style={styles.emptyState}>
        <Ionicons name="information-circle-outline" size={44} color={palette.accent} />
        <Text style={styles.emptyText}>Esta pantalla es una demo del servicio de guardia</Text>
        <Text style={styles.emptySubtext}>
          Todavía no mostramos profesionales ni simulamos conexiones inmediatas. Mientras
          terminamos el despliegue, puedes usar recursos reales o seguir tu proceso
          desde especialistas y sesiones.
        </Text>
        <View style={styles.demoActions}>
          <Button
            onPress={onExploreSpecialists}
            size="medium"
            icon={<Ionicons name="search" size={16} color="#FFFFFF" />}
          >
            Ir a especialistas
          </Button>
          <Button
            onPress={onViewSessions}
            variant="secondary"
            size="medium"
            icon={<Ionicons name="calendar-outline" size={16} color={palette.text} />}
          >
            Ver mis sesiones
          </Button>
        </View>
      </Card>
    </View>
  );
};

const WhatToExpectSection: React.FC = () => {
  const { palette, styles } = useOnDutyUi();
  const items = [
    { icon: 'time-outline' as const, text: 'Sesion orientativa de 20-30 minutos' },
    { icon: 'clipboard-outline' as const, text: 'Valoracion inicial de tu situacion' },
    { icon: 'chatbubbles-outline' as const, text: 'Apoyo inmediato y orientacion clara' },
    { icon: 'document-text-outline' as const, text: 'Recomendaciones para el siguiente paso' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Qué incluirá cuando esté activo</Text>
      <Card style={styles.surfaceCard}>
        {items.map((item) => (
          <View key={item.text} style={styles.expectItem}>
            <Ionicons name={item.icon} size={20} color={palette.accent} />
            <Text style={styles.expectText}>{item.text}</Text>
          </View>
        ))}

        <View style={[styles.freeServiceBox, { backgroundColor: palette.accentLight, borderColor: `${palette.accent}33` }]}>
          <View style={styles.freeServiceBadge}>
            <Ionicons name="checkmark-circle" size={20} color={palette.accent} />
            <Text style={[styles.freeServiceBadgeText, { color: palette.accent }]}>Despliegue progresivo</Text>
          </View>
          <Text style={styles.freeServiceDescription}>
            Antes de abrirlo como funcionalidad operativa, estamos validando experiencia,
            seguridad y utilidad clínica para no prometer algo que aún no sea fiable.
          </Text>
        </View>

        <View style={styles.donationNote}>
          <Ionicons name="heart" size={14} color={palette.textMuted} />
          <Text style={styles.donationNoteText}>
            Hoy esta pantalla funciona solo como vista previa informativa. Los recursos
            de apoyo que ves más abajo sí son utilizables.
          </Text>
        </View>
      </Card>
    </View>
  );
};

const CrisisResourcesSection: React.FC = () => {
  const { palette, styles } = useOnDutyUi();

  const handleCallResource = (phone: string) => {
    const phoneUrl = `tel:${phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('No disponible', `No se puede iniciar la llamada al ${phone}.`);
      }
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Otros recursos de apoyo</Text>
      <Text style={styles.sectionSubtitle}>
        Si prefieres otra via o necesitas un recurso adicional, estos servicios tambien pueden ayudarte.
      </Text>

      <View style={styles.resourcesContainer}>
        {CRISIS_RESOURCES.map((resource) => (
          <AnimatedPressable
            key={resource.id}
            onPress={() => handleCallResource(resource.phone)}
            style={styles.resourceCard}
          >
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>{resource.name}</Text>
              <Text style={styles.resourceDescription}>{resource.description}</Text>
            </View>
            <View style={[styles.resourcePhone, { backgroundColor: palette.accentLight }]}>
              <Ionicons name="call-outline" size={16} color={palette.accent} />
              <Text style={[styles.resourcePhoneText, { color: palette.accent }]}>{resource.phone}</Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
};

const PrivacyNote: React.FC = () => {
  const { palette, styles } = useOnDutyUi();

  return (
    <View style={styles.privacyNote}>
      <Ionicons name="lock-closed" size={16} color={palette.textMuted} />
      <Text style={styles.privacyText}>
        Tu privacidad esta protegida. Todas las conversaciones se tratan con confidencialidad y criterio profesional.
      </Text>
    </View>
  );
};

export function OnDutyPsychologistScreen() {
  const navigation = useNavigation<OnDutyNavigationProp>();
  const { width } = useWindowDimensions();
  const { styles } = useOnDutyUi();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const handleExploreSpecialists = () => {
    navigation.navigate('Specialists');
  };

  const handleViewSessions = () => {
    navigation.navigate('Sessions');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isDesktop && styles.contentDesktop,
        isTablet && styles.contentTablet,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <HeroSection
        onExploreSpecialists={handleExploreSpecialists}
        onViewSessions={handleViewSessions}
      />

      <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
        <WhenToUseSection onRegularBooking={handleExploreSpecialists} />
        <HowItWorksSection />
        <ContactMethodsSection
          onExploreSpecialists={handleExploreSpecialists}
          onViewSessions={handleViewSessions}
        />
        <DemoStatusSection
          onExploreSpecialists={handleExploreSpecialists}
          onViewSessions={handleViewSessions}
        />
        <WhatToExpectSection />
        <CrisisResourcesSection />
        <PrivacyNote />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme, isDark: boolean, palette: OnDutyPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    contentDesktop: {
      paddingHorizontal: spacing.xxxl,
      maxWidth: 1080,
      alignSelf: 'center',
      width: '100%',
    },
    contentTablet: {
      paddingHorizontal: spacing.xxl,
    },
    mainContent: {
      gap: spacing.xxl,
    },
    mainContentDesktop: {
      gap: spacing.xxxl,
    },

    heroSection: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.lg,
    },
    heroIconContainer: {
      marginBottom: spacing.lg,
    },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
    },
    heroEyebrow: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.accent,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    heroTitle: {
      fontSize: 34,
      fontWeight: '800',
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.md,
      lineHeight: 40,
    },
    heroSubtitle: {
      fontSize: 18,
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: spacing.xl,
      maxWidth: 620,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.md,
    },
    trustIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      gap: spacing.xs,
    },
    trustIndicatorText: {
      fontSize: 14,
      color: palette.textSecondary,
      fontWeight: '500',
    },

    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: palette.text,
      marginBottom: spacing.md,
    },
    sectionSubtitle: {
      fontSize: 15,
      color: palette.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      flexWrap: 'wrap',
      marginBottom: spacing.md,
    },
    surfaceCard: {
      backgroundColor: palette.cardBg,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.md,
    },

    whenToUseIntro: {
      fontSize: 16,
      color: palette.text,
      marginBottom: spacing.md,
      fontWeight: '500',
    },
    checklistContainer: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checklistText: {
      fontSize: 15,
      color: palette.textSecondary,
      flex: 1,
      lineHeight: 22,
    },
    inlineActionRow: {
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
      gap: spacing.sm,
    },
    inlineActionLabel: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    inlineLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
    },
    inlineLinkText: {
      fontSize: 14,
      fontWeight: '700',
    },

    stepsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    stepCard: {
      flex: 1,
      minWidth: 170,
      backgroundColor: palette.cardBg,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      ...shadows.md,
    },
    stepIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    stepNumber: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: palette.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    stepDescription: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },

    contactCardsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    contactCard: {
      flex: 1,
      minWidth: 220,
      backgroundColor: palette.cardBg,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: palette.border,
      ...shadows.md,
    },
    contactIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    contactTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.text,
      marginBottom: spacing.xs,
    },
    contactDescription: {
      fontSize: 14,
      color: palette.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    contactAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    contactActionText: {
      fontSize: 15,
      fontWeight: '600',
    },

    availabilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.successBg,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      gap: spacing.xs,
    },
    availabilityText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.success,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 16,
      color: palette.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      backgroundColor: palette.cardBg,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: borderRadius.lg,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 15,
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    demoActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },

    pulsingDotContainer: {
      width: 10,
      height: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulsingDotOuter: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    pulsingDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    expectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    expectText: {
      fontSize: 15,
      color: palette.textSecondary,
      flex: 1,
      lineHeight: 22,
    },
    freeServiceBox: {
      borderRadius: 12,
      padding: spacing.md,
      marginTop: spacing.md,
      borderWidth: 1,
    },
    freeServiceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    freeServiceBadgeText: {
      fontSize: 18,
      fontWeight: '700',
    },
    freeServiceDescription: {
      fontSize: 15,
      color: palette.textSecondary,
      lineHeight: 22,
    },
    donationNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    donationNoteText: {
      flex: 1,
      fontSize: 13,
      color: palette.textMuted,
      lineHeight: 18,
      fontStyle: 'italic',
    },

    resourcesContainer: {
      gap: spacing.sm,
    },
    resourceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.cardBg,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    resourceInfo: {
      flex: 1,
      paddingRight: spacing.md,
    },
    resourceName: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
    },
    resourceDescription: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    resourcePhone: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    resourcePhoneText: {
      fontSize: 14,
      fontWeight: '600',
    },

    privacyNote: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      marginTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    privacyText: {
      fontSize: 13,
      color: palette.textMuted,
      textAlign: 'center',
      flex: 1,
      lineHeight: 18,
    },
  });

export default OnDutyPsychologistScreen;
