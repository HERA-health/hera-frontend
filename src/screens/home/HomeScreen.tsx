/**
 * HomeScreen - Client Dashboard
 * Modern, clean dashboard with quick actions, upcoming sessions, and specialist recommendations
 * Follows HERA design language with sage green and lavender palette
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius, shadows } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { getMatchedSpecialists, SpecialistData } from '../../services/specialistsService';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [topSpecialists, setTopSpecialists] = useState<SpecialistData[]>([]);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await getMatchedSpecialists();
        setHasCompletedQuestionnaire(response.hasCompletedQuestionnaire);
        if (response.hasCompletedQuestionnaire && response.specialists.length > 0) {
          setTopSpecialists(response.specialists.slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setHasCompletedQuestionnaire(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getFirstName = () => {
    if (!user?.name) return '';
    return user.name.split(' ')[0];
  };

  // Mock upcoming sessions (in real app, this would come from API)
  const upcomingSessions = [
    {
      id: '1',
      specialistName: 'Dra. Elena Rodríguez',
      specialization: 'Psicóloga Clínica',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      type: 'video',
      price: 65,
      avatar: null,
    },
  ];

  // Quick action cards data
  const quickActions = [
    {
      id: 'next-session',
      icon: 'calendar',
      title: 'Próxima sesión',
      content: upcomingSessions.length > 0
        ? formatSessionDate(upcomingSessions[0].date)
        : 'Sin sesiones',
      actionText: upcomingSessions.length > 0 ? 'Ver detalles' : null,
      color: heraLanding.primary,
      bgColor: heraLanding.primaryMuted,
      onPress: () => navigation.navigate('Sessions'),
    },
    {
      id: 'find-specialist',
      icon: 'search',
      title: 'Buscar especialista',
      content: 'Encuentra tu match perfecto',
      actionText: hasCompletedQuestionnaire ? 'Ver matches' : 'Hacer cuestionario',
      color: heraLanding.secondary,
      bgColor: heraLanding.secondaryMuted,
      highlight: true,
      onPress: () => navigation.navigate(hasCompletedQuestionnaire ? 'Specialists' : 'Questionnaire'),
    },
    {
      id: 'history',
      icon: 'document-text',
      title: 'Tus sesiones',
      content: '0 sesiones completadas',
      actionText: 'Ver historial',
      color: heraLanding.primary,
      bgColor: heraLanding.primaryMuted,
      onPress: () => navigation.navigate('Sessions'),
    },
  ];

  function formatSessionDate(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} - ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // Render welcome header
  const renderWelcomeHeader = () => (
    <Animated.View
      style={[
        styles.welcomeHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeGreeting}>
          {getGreeting()}, {getFirstName()}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          ¿Cómo te sientes hoy?
        </Text>
      </View>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={24} color={heraLanding.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render quick action cards
  const renderQuickActions = () => (
    <View style={styles.section}>
      <View style={[
        styles.quickActionsGrid,
        isDesktop && styles.quickActionsGridDesktop,
      ]}>
        {quickActions.map((action, index) => (
          <Animated.View
            key={action.id}
            style={[
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: slideAnim,
                }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                action.highlight && styles.quickActionCardHighlight,
                isDesktop && styles.quickActionCardDesktop,
              ]}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                <Ionicons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionContent}>{action.content}</Text>
              {action.actionText && (
                <View style={styles.quickActionButton}>
                  <Text style={[styles.quickActionButtonText, { color: action.color }]}>
                    {action.actionText}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={action.color} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  // Render upcoming sessions section
  const renderUpcomingSessions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Próximas sesiones</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Sessions')}>
          <Text style={styles.sectionLink}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      {upcomingSessions.length > 0 ? (
        <View style={styles.sessionsList}>
          {upcomingSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              activeOpacity={0.85}
            >
              <View style={styles.sessionAvatar}>
                {session.avatar ? (
                  <Image source={{ uri: session.avatar }} style={styles.sessionAvatarImage} />
                ) : (
                  <LinearGradient
                    colors={[heraLanding.primary, heraLanding.primaryDark]}
                    style={styles.sessionAvatarGradient}
                  >
                    <Text style={styles.sessionAvatarText}>
                      {session.specialistName.charAt(0)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionSpecialistName}>{session.specialistName}</Text>
                <Text style={styles.sessionSpecialization}>{session.specialization}</Text>
                <View style={styles.sessionMeta}>
                  <Ionicons name="calendar-outline" size={14} color={heraLanding.textSecondary} />
                  <Text style={styles.sessionMetaText}>
                    {formatSessionDate(session.date)}
                  </Text>
                </View>
                <View style={styles.sessionMeta}>
                  <Ionicons name="videocam-outline" size={14} color={heraLanding.textSecondary} />
                  <Text style={styles.sessionMetaText}>Videollamada</Text>
                  <Text style={styles.sessionPrice}>€{session.price}</Text>
                </View>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.joinSessionButton}>
                  <LinearGradient
                    colors={[heraLanding.primary, heraLanding.primaryDark]}
                    style={styles.joinSessionGradient}
                  >
                    <Text style={styles.joinSessionText}>Unirse</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={48} color={heraLanding.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No tienes sesiones programadas</Text>
          <Text style={styles.emptyDescription}>
            Encuentra un especialista y reserva tu primera sesión
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate(hasCompletedQuestionnaire ? 'Specialists' : 'Questionnaire')}
          >
            <Text style={styles.emptyButtonText}>Encontrar especialista</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render recommended specialists
  const renderRecommendedSpecialists = () => {
    if (!hasCompletedQuestionnaire || topSpecialists.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Especialistas recomendados</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Specialists')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialistsScroll}
        >
          {topSpecialists.map((specialist) => (
            <TouchableOpacity
              key={specialist.id}
              style={styles.specialistCard}
              onPress={() => navigation.navigate('SpecialistDetail', { specialistId: specialist.id })}
              activeOpacity={0.85}
            >
              <View style={styles.specialistAvatarContainer}>
                {specialist.avatar ? (
                  <Image source={{ uri: specialist.avatar }} style={styles.specialistAvatar} />
                ) : (
                  <LinearGradient
                    colors={[heraLanding.secondary, heraLanding.secondaryDark]}
                    style={styles.specialistAvatar}
                  >
                    <Text style={styles.specialistAvatarText}>
                      {specialist.user.name.charAt(0)}
                    </Text>
                  </LinearGradient>
                )}
                {specialist.firstVisitFree && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Gratis</Text>
                  </View>
                )}
              </View>
              <Text style={styles.specialistName} numberOfLines={1}>
                {specialist.user.name}
              </Text>
              <Text style={styles.specialistSpecialization} numberOfLines={2}>
                {specialist.specialization}
              </Text>
              <View style={styles.specialistRating}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.specialistRatingText}>
                  {specialist.rating} ({specialist.reviewsCount})
                </Text>
              </View>
              <Text style={styles.specialistPrice}>€{specialist.pricePerSession}/sesión</Text>
              <TouchableOpacity style={styles.viewProfileButton}>
                <Text style={styles.viewProfileText}>Ver perfil</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render CTA for users who haven't completed questionnaire
  const renderQuestionnaireCTA = () => {
    if (hasCompletedQuestionnaire) return null;

    return (
      <View style={styles.section}>
        <LinearGradient
          colors={[heraLanding.primary, heraLanding.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaIconContainer}>
              <Ionicons name="heart" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.ctaTitle}>Encuentra tu match perfecto</Text>
            <Text style={styles.ctaDescription}>
              Completa nuestro cuestionario de 5 minutos y te conectaremos con el especialista ideal para ti.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Questionnaire')}
            >
              <Text style={styles.ctaButtonText}>Comenzar cuestionario</Text>
              <Ionicons name="arrow-forward" size={20} color={heraLanding.primary} />
            </TouchableOpacity>
            <View style={styles.ctaInfo}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.ctaInfoText}>Solo 5 minutos • Gratuito</Text>
            </View>
          </View>
          {/* Decorative elements */}
          <View style={[styles.ctaDecorCircle, styles.ctaDecorCircle1]} />
          <View style={[styles.ctaDecorCircle, styles.ctaDecorCircle2]} />
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeHeader()}
        {renderQuickActions()}
        {renderQuestionnaireCTA()}
        {renderUpcomingSessions()}
        {renderRecommendedSpecialists()}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  scrollContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: heraLanding.textSecondary,
  },

  // Welcome Header
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: heraLanding.textSecondary,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // Quick Actions
  quickActionsGrid: {
    gap: 16,
  },
  quickActionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...shadows.md,
  },
  quickActionCardHighlight: {
    borderWidth: 2,
    borderColor: heraLanding.secondaryLight,
  },
  quickActionCardDesktop: {
    flex: 1,
    minWidth: 280,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  quickActionContent: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Sessions
  sessionsList: {
    gap: 16,
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...shadows.md,
  },
  sessionAvatar: {
    marginRight: 16,
  },
  sessionAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  sessionAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionSpecialistName: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  sessionSpecialization: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sessionMetaText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  sessionPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primary,
    marginLeft: 'auto',
  },
  sessionActions: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  joinSessionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  joinSessionGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  joinSessionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Specialists
  specialistsScroll: {
    paddingRight: 20,
    gap: 16,
  },
  specialistCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...shadows.md,
  },
  specialistAvatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  specialistAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialistAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  freeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: heraLanding.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  specialistName: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  specialistSpecialization: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 36,
  },
  specialistRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  specialistRatingText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  specialistPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.primary,
    marginBottom: 12,
  },
  viewProfileButton: {
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // CTA Card
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaContent: {
    zIndex: 1,
  },
  ctaIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  ctaDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 400,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
    ...shadows.md,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  ctaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  ctaInfoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  ctaDecorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaDecorCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
  },
  ctaDecorCircle2: {
    width: 150,
    height: 150,
    bottom: -40,
    right: 60,
  },
});
