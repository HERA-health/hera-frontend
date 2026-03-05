import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, heraLanding } from '../../constants/colors';

// =============================================================================
// TYPES
// =============================================================================

interface Professional {
  id: string;
  name: string;
  specialization: string;
  experienceYears: number;
  avatar?: string;
  isAvailable: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Emergency contact colors - coral/amber for urgency without panic
const EMERGENCY_COLORS = {
  accent: '#E89D88',       // Coral - warm urgency
  accentDark: '#D4826E',   // Darker coral for hover
  accentLight: '#F5B8A8',  // Light coral for backgrounds
  sage: heraLanding.primary,         // #8B9D83 - trust
  sageLight: heraLanding.primaryLight, // #A8B8A0
  background: heraLanding.background,  // #F5F7F5 - calm
  cardBg: '#FFFFFF',
  text: heraLanding.textPrimary,       // #2C3E2C - forest
  textSecondary: heraLanding.textSecondary, // #6B7B6B
  textMuted: heraLanding.textMuted,    // #9BA89B
  success: '#7BA377',      // Mint green for availability
};

// Crisis hotlines for Spain
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
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Pulsing availability dot - indicates real-time availability
 */
const PulsingDot: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
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
          { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
            inputRange: [1, 1.3],
            outputRange: [0.6, 0],
          }) },
        ]}
      />
      <View style={styles.pulsingDotInner} />
    </View>
  );
};

/**
 * Hero Section - Immediate reassurance
 */
const HeroSection: React.FC<{ onContactNow: () => void }> = ({ onContactNow }) => (
  <View style={styles.heroSection}>
    {/* Icon */}
    <View style={styles.heroIconContainer}>
      <LinearGradient
        colors={[EMERGENCY_COLORS.sage, EMERGENCY_COLORS.sageLight]}
        style={styles.heroIcon}
      >
        <Ionicons name="heart" size={40} color="#FFFFFF" />
      </LinearGradient>
    </View>

    {/* Title */}
    <Text style={styles.heroTitle} accessibilityRole="header">
      Estamos aquí para ti, 24/7
    </Text>

    {/* Subtitle */}
    <Text style={styles.heroSubtitle}>
      Si estás pasando por un momento difícil, nuestro equipo de psicólogos
      está disponible para ayudarte ahora mismo.
    </Text>

    {/* Primary CTA - Large and prominent */}
    <TouchableOpacity
      style={styles.primaryCTA}
      onPress={onContactNow}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Contactar ahora con un psicólogo"
      accessibilityHint="Te conectará con un profesional disponible"
    >
      <LinearGradient
        colors={[EMERGENCY_COLORS.accent, EMERGENCY_COLORS.accentDark]}
        style={styles.primaryCTAGradient}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
        <Text style={styles.primaryCTAText}>Contactar ahora</Text>
      </LinearGradient>
    </TouchableOpacity>

    {/* Trust indicator */}
    <View style={styles.trustIndicator}>
      <Ionicons name="flash" size={16} color={EMERGENCY_COLORS.success} />
      <Text style={styles.trustIndicatorText}>
        Respuesta en menos de 5 minutos
      </Text>
    </View>
  </View>
);

/**
 * When to Use Section - Clear guidance
 */
const WhenToUseSection: React.FC<{ onRegularBooking: () => void }> = ({ onRegularBooking }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>¿Cuándo usar este servicio?</Text>

    <View style={styles.whenToUseCard}>
      <Text style={styles.whenToUseIntro}>
        Este servicio es para situaciones que no pueden esperar:
      </Text>

      <View style={styles.checklistContainer}>
        {[
          'Crisis emocional o ansiedad severa',
          'Pensamientos que te preocupan',
          'Situación de emergencia personal',
          'Necesitas apoyo profesional inmediato',
        ].map((item, index) => (
          <View key={index} style={styles.checklistItem}>
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={14} color={EMERGENCY_COLORS.sage} />
            </View>
            <Text style={styles.checklistText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Link to regular booking */}
      <TouchableOpacity
        style={styles.regularBookingLink}
        onPress={onRegularBooking}
        accessibilityRole="link"
      >
        <Text style={styles.regularBookingText}>
          Para sesiones regulares,{' '}
          <Text style={styles.regularBookingLinkText}>reserva una cita aquí →</Text>
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * How It Works Section - Simple 3-step process
 */
const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: 'chatbubbles-outline' as const,
      title: 'Contacta',
      description: 'Llámanos o inicia un chat',
    },
    {
      icon: 'people-outline' as const,
      title: 'Conexión inmediata',
      description: 'Te conectamos con un psicólogo',
    },
    {
      icon: 'heart-outline' as const,
      title: 'Apoyo profesional',
      description: 'Sesión de soporte y orientación',
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cómo funciona</Text>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepIconContainer}>
              <Ionicons
                name={step.icon}
                size={28}
                color={EMERGENCY_COLORS.sage}
              />
            </View>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Contact Methods Section - Phone and Chat cards
 */
const ContactMethodsSection: React.FC<{
  onPhoneCall: () => void;
  onOpenChat: () => void;
}> = ({ onPhoneCall, onOpenChat }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Elige cómo contactar</Text>

    <View style={styles.contactCardsContainer}>
      {/* Phone Card */}
      <TouchableOpacity
        style={styles.contactCard}
        onPress={onPhoneCall}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Llamar por teléfono"
      >
        <View style={styles.contactIconContainer}>
          <Ionicons name="call" size={32} color={EMERGENCY_COLORS.sage} />
        </View>
        <Text style={styles.contactTitle}>Llamar</Text>
        <Text style={styles.contactDescription}>
          Habla directamente con un psicólogo
        </Text>
        <View style={styles.contactAction}>
          <Text style={styles.contactActionText}>+34 900 123 456</Text>
          <Ionicons name="chevron-forward" size={20} color={EMERGENCY_COLORS.sage} />
        </View>
      </TouchableOpacity>

      {/* Chat Card */}
      <TouchableOpacity
        style={styles.contactCard}
        onPress={onOpenChat}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat"
      >
        <View style={styles.contactIconContainer}>
          <Ionicons name="chatbubble-ellipses" size={32} color={EMERGENCY_COLORS.sage} />
        </View>
        <Text style={styles.contactTitle}>Chat</Text>
        <Text style={styles.contactDescription}>
          Escribe si prefieres texto
        </Text>
        <View style={styles.contactAction}>
          <Text style={styles.contactActionText}>Abrir chat</Text>
          <Ionicons name="chevron-forward" size={20} color={EMERGENCY_COLORS.sage} />
        </View>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Available Professionals Section - Shows who's on duty
 */
const AvailableProfessionalsSection: React.FC<{
  professionals: Professional[];
  loading: boolean;
  onSelectProfessional: (id: string) => void;
}> = ({ professionals, loading, onSelectProfessional }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Profesionales disponibles</Text>
      <View style={styles.availabilityBadge}>
        <PulsingDot />
        <Text style={styles.availabilityText}>En línea ahora</Text>
      </View>
    </View>

    {loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={EMERGENCY_COLORS.sage} />
        <Text style={styles.loadingText}>Buscando profesionales...</Text>
      </View>
    ) : professionals.length === 0 ? (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={48} color={EMERGENCY_COLORS.textMuted} />
        <Text style={styles.emptyText}>
          No hay profesionales disponibles en este momento
        </Text>
        <Text style={styles.emptySubtext}>
          Usa los recursos de crisis a continuación o intenta de nuevo en unos minutos
        </Text>
      </View>
    ) : (
      professionals.map((professional) => (
        <TouchableOpacity
          key={professional.id}
          style={styles.professionalCard}
          onPress={() => onSelectProfessional(professional.id)}
          activeOpacity={0.85}
        >
          {/* Available badge */}
          <View style={styles.professionalAvailableBadge}>
            <PulsingDot />
            <Text style={styles.professionalAvailableText}>Disponible</Text>
          </View>

          <View style={styles.professionalContent}>
            {/* Avatar */}
            <LinearGradient
              colors={[EMERGENCY_COLORS.sage, EMERGENCY_COLORS.sageLight]}
              style={styles.professionalAvatar}
            >
              <Text style={styles.professionalAvatarText}>
                {professional.name.charAt(0)}
              </Text>
            </LinearGradient>

            {/* Info */}
            <View style={styles.professionalInfo}>
              <Text style={styles.professionalName}>{professional.name}</Text>
              <Text style={styles.professionalSpecialization}>
                {professional.specialization}
              </Text>
              <View style={styles.experienceBadge}>
                <Ionicons name="ribbon" size={14} color={EMERGENCY_COLORS.textSecondary} />
                <Text style={styles.experienceText}>
                  {professional.experienceYears} años de experiencia
                </Text>
              </View>
            </View>

            {/* Action */}
            <Ionicons name="chevron-forward" size={24} color={EMERGENCY_COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      ))
    )}
  </View>
);

/**
 * What to Expect Section - Transparency
 */
const WhatToExpectSection: React.FC = () => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Qué esperar</Text>

    <View style={styles.expectCard}>
      {[
        { icon: 'time-outline' as const, text: 'Sesión de 20-30 minutos' },
        { icon: 'clipboard-outline' as const, text: 'Valoración inicial de tu situación' },
        { icon: 'chatbubbles-outline' as const, text: 'Orientación y apoyo inmediato' },
        { icon: 'document-text-outline' as const, text: 'Recomendaciones de seguimiento' },
      ].map((item, index) => (
        <View key={index} style={styles.expectItem}>
          <Ionicons name={item.icon} size={20} color={EMERGENCY_COLORS.sage} />
          <Text style={styles.expectText}>{item.text}</Text>
        </View>
      ))}

      {/* FREE Service Callout - No barriers to access */}
      <View style={styles.freeServiceBox}>
        <View style={styles.freeServiceBadge}>
          <Ionicons name="checkmark-circle" size={20} color={EMERGENCY_COLORS.sage} />
          <Text style={styles.freeServiceBadgeText}>100% Gratuito</Text>
        </View>
        <Text style={styles.freeServiceDescription}>
          Este servicio es completamente gratuito. Accede a ayuda profesional sin preocuparte por el costo.
        </Text>
      </View>

      {/* Optional donation note - subtle, not pushy */}
      <View style={styles.donationNote}>
        <Ionicons name="heart" size={14} color={EMERGENCY_COLORS.textMuted} />
        <Text style={styles.donationNoteText}>
          Si la sesión te ayudó y deseas apoyar este servicio, puedes hacer un donativo voluntario después. Totalmente opcional.
        </Text>
      </View>
    </View>
  </View>
);

/**
 * Crisis Resources Section - External support
 */
const CrisisResourcesSection: React.FC = () => {
  const handleCallResource = (phone: string) => {
    const phoneUrl = `tel:${phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'No se puede realizar la llamada');
      }
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Otros recursos de apoyo</Text>
      <Text style={styles.sectionSubtitle}>
        Si no es una emergencia inmediata, estos servicios también pueden ayudarte:
      </Text>

      <View style={styles.resourcesContainer}>
        {CRISIS_RESOURCES.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            style={styles.resourceCard}
            onPress={() => handleCallResource(resource.phone)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Llamar a ${resource.name}`}
          >
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>{resource.name}</Text>
              <Text style={styles.resourceDescription}>{resource.description}</Text>
            </View>
            <View style={styles.resourcePhone}>
              <Ionicons name="call-outline" size={16} color={EMERGENCY_COLORS.sage} />
              <Text style={styles.resourcePhoneText}>{resource.phone}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/**
 * Privacy Note - Always visible
 */
const PrivacyNote: React.FC = () => (
  <View style={styles.privacyNote}>
    <Ionicons name="lock-closed" size={16} color={EMERGENCY_COLORS.textMuted} />
    <Text style={styles.privacyText}>
      Tu privacidad está protegida. Todas las conversaciones son confidenciales y seguras.
    </Text>
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OnDutyPsychologistScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [availableProfessionals, setAvailableProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableProfessionals();
  }, []);

  const loadAvailableProfessionals = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.get('/specialists/on-duty');

      setTimeout(() => {
        setAvailableProfessionals([
          {
            id: '1',
            name: 'María González',
            specialization: 'Psicóloga Clínica',
            experienceYears: 8,
            isAvailable: true,
          },
          {
            id: '2',
            name: 'Carlos Martínez',
            specialization: 'Terapeuta Cognitivo-Conductual',
            experienceYears: 12,
            isAvailable: true,
          },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading on-duty professionals:', error);
      Alert.alert('Error', 'No se pudieron cargar los profesionales de guardia');
      setLoading(false);
    }
  };

  const handleContactNow = () => {
    // Scroll to contact methods or open chat directly
    Alert.alert(
      'Conectando...',
      'Te estamos conectando con un psicólogo disponible. Por favor espera unos segundos.',
      [{ text: 'OK' }]
    );
  };

  const handlePhoneCall = () => {
    const phoneUrl = 'tel:+34900123456';
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Número de contacto', '+34 900 123 456');
      }
    });
  };

  const handleOpenChat = () => {
    // TODO: Implement chat functionality
    Alert.alert(
      'Chat de emergencia',
      'La funcionalidad de chat está siendo implementada. Por favor, utiliza la opción de llamada.',
      [{ text: 'Entendido' }]
    );
  };

  const handleRegularBooking = () => {
    navigation.navigate('Specialists');
  };

  const handleSelectProfessional = (professionalId: string) => {
    Alert.alert(
      '¡Solicitud enviada!',
      'El profesional confirmará tu sesión en 5-10 minutos. Recibirás una notificación cuando esté listo.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Sessions'),
        },
      ]
    );
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
      {/* Hero Section */}
      <HeroSection onContactNow={handleContactNow} />

      {/* Main content wrapper */}
      <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
        {/* When to Use */}
        <WhenToUseSection onRegularBooking={handleRegularBooking} />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Contact Methods */}
        <ContactMethodsSection
          onPhoneCall={handlePhoneCall}
          onOpenChat={handleOpenChat}
        />

        {/* Available Professionals */}
        <AvailableProfessionalsSection
          professionals={availableProfessionals}
          loading={loading}
          onSelectProfessional={handleSelectProfessional}
        />

        {/* What to Expect */}
        <WhatToExpectSection />

        {/* Crisis Resources */}
        <CrisisResourcesSection />

        {/* Privacy Note */}
        <PrivacyNote />
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: EMERGENCY_COLORS.background, // #F5F7F5 - Critical!
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  contentDesktop: {
    paddingHorizontal: spacing.xxxl,
    maxWidth: 1000,
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

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
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
    shadowColor: EMERGENCY_COLORS.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: EMERGENCY_COLORS.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 18,
    color: EMERGENCY_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xl,
    maxWidth: 500,
  },
  primaryCTA: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: EMERGENCY_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    gap: spacing.sm,
    minHeight: 56, // Accessibility - large touch target
  },
  primaryCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  trustIndicatorText: {
    fontSize: 14,
    color: EMERGENCY_COLORS.textSecondary,
    fontWeight: '500',
  },

  // Section styles
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: EMERGENCY_COLORS.text,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: EMERGENCY_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // When to Use
  whenToUseCard: {
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  whenToUseIntro: {
    fontSize: 16,
    color: EMERGENCY_COLORS.text,
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
    backgroundColor: `${EMERGENCY_COLORS.sage}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistText: {
    fontSize: 15,
    color: EMERGENCY_COLORS.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  regularBookingLink: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
  },
  regularBookingText: {
    fontSize: 14,
    color: EMERGENCY_COLORS.textSecondary,
  },
  regularBookingLinkText: {
    color: EMERGENCY_COLORS.sage,
    fontWeight: '600',
  },

  // How It Works - Steps
  stepsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  stepCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stepIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${EMERGENCY_COLORS.sage}15`,
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
    backgroundColor: EMERGENCY_COLORS.sage,
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
    color: EMERGENCY_COLORS.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: 13,
    color: EMERGENCY_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Contact Methods
  contactCardsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  contactCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: heraLanding.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contactIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${EMERGENCY_COLORS.sage}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: EMERGENCY_COLORS.text,
    marginBottom: spacing.xs,
  },
  contactDescription: {
    fontSize: 14,
    color: EMERGENCY_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  contactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
  },
  contactActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: EMERGENCY_COLORS.sage,
  },

  // Available Professionals
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${EMERGENCY_COLORS.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: EMERGENCY_COLORS.success,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: EMERGENCY_COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: EMERGENCY_COLORS.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: EMERGENCY_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  professionalCard: {
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  professionalAvailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${EMERGENCY_COLORS.success}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  professionalAvailableText: {
    fontSize: 12,
    fontWeight: '600',
    color: EMERGENCY_COLORS.success,
  },
  professionalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  professionalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 17,
    fontWeight: '700',
    color: EMERGENCY_COLORS.text,
    marginBottom: 2,
  },
  professionalSpecialization: {
    fontSize: 14,
    color: EMERGENCY_COLORS.textSecondary,
    marginBottom: spacing.xs,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  experienceText: {
    fontSize: 13,
    color: EMERGENCY_COLORS.textSecondary,
  },

  // Pulsing Dot
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
    backgroundColor: EMERGENCY_COLORS.success,
  },
  pulsingDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: EMERGENCY_COLORS.success,
  },

  // What to Expect
  expectCard: {
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  expectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  expectText: {
    fontSize: 15,
    color: EMERGENCY_COLORS.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  // FREE Service Callout - No barriers to access
  freeServiceBox: {
    backgroundColor: `${EMERGENCY_COLORS.sage}12`,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: `${EMERGENCY_COLORS.sage}30`,
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
    color: EMERGENCY_COLORS.sage,
  },
  freeServiceDescription: {
    fontSize: 15,
    color: EMERGENCY_COLORS.textSecondary,
    lineHeight: 22,
  },
  // Optional donation note - subtle, not pushy
  donationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  donationNoteText: {
    flex: 1,
    fontSize: 13,
    color: EMERGENCY_COLORS.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Crisis Resources
  resourcesContainer: {
    gap: spacing.sm,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: EMERGENCY_COLORS.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: EMERGENCY_COLORS.text,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 13,
    color: EMERGENCY_COLORS.textSecondary,
  },
  resourcePhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${EMERGENCY_COLORS.sage}10`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  resourcePhoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: EMERGENCY_COLORS.sage,
  },

  // Privacy Note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
  },
  privacyText: {
    fontSize: 13,
    color: EMERGENCY_COLORS.textMuted,
    textAlign: 'center',
    flex: 1,
    lineHeight: 18,
  },
});

export default OnDutyPsychologistScreen;
