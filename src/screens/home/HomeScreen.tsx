/**
 * HomeScreen - Client Dashboard
 * Two-column desktop layout with staggered animations.
 * Follows HERA "Premium Healthcare" design language: sage green + lavender.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { heraLanding, shadows, spacing } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { getMatchedSpecialists, SpecialistData } from '../../services/specialistsService';
import { getMySessions } from '../../services/sessionsService';
import { useAuth } from '../../contexts/AuthContext';
import { VerificationBanner } from '../../components/auth';
import { ApiSession } from '../sessions/types';
import {
  isUpcomingSession,
  getSessionTypeIcon,
  getSessionTypeLabel,
  getStatusLabel,
  formatTime,
  getDateLabel,
} from '../sessions/utils/sessionHelpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = ['😊', '😌', '😐', '😟', '😢'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCurrentDate = (): string =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getCountdown = (dateStr: string): { label: string; isUrgent: boolean } => {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { label: 'En curso', isUrgent: true };
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return { label: `En ${minutes}min`, isUrgent: true };
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return { label: `En ${hours}h`, isUrgent: false };
  const days = Math.floor(diff / 86400000);
  return { label: days === 1 ? 'Mañana' : `En ${days} días`, isUrgent: false };
};

const getAffinityColor = (affinity: number): string => {
  const pct = affinity > 1 ? affinity : affinity * 100;
  if (pct >= 80) return heraLanding.success;
  if (pct >= 60) return heraLanding.warningAmber;
  return heraLanding.secondary;
};

const getAffinityLabel = (affinity: number): string =>
  `${Math.round(affinity > 1 ? affinity : affinity * 100)}%`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  // ── State ──────────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [topSpecialists, setTopSpecialists] = useState<SpecialistData[]>([]);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [countdownText, setCountdownText] = useState('');
  const [countdownUrgent, setCountdownUrgent] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────
  const upcomingSorted = useMemo(
    () =>
      sessions
        .filter(isUpcomingSession)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions]
  );
  const nextSession: ApiSession | null = upcomingSorted[0] ?? null;
  const upcomingList = upcomingSorted.slice(0, 3);
  const stats = useMemo(() => {
    const done = sessions.filter(s => s.status === 'COMPLETED');
    return {
      completed: done.length,
      hours: Math.round(done.reduce((sum, s) => sum + s.duration, 0) / 60),
      specialists: new Set(done.map(s => s.specialist.id)).size,
    };
  }, [sessions]);

  const recentSessionsList = useMemo(
    () =>
      sessions
        .filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2),
    [sessions]
  );

  // ── Animation refs ─────────────────────────────────────────────────────────
  // Staggered entrance: 0=header, 1=nextSession, 2=stats, 3=upcoming, 4=specialists, 5=cta
  const sectionAnims = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))).current;
  // Stat cards: spring scale-in (replaces counting animation)
  const statScaleAnims = useRef([0, 1, 2].map(() => new Animated.Value(0.72))).current;
  // Pulse for imminent session join button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Breathing decoration on hero card
  const breatheAnim = useRef(new Animated.Value(0)).current;
  // Avatar ring breathing
  const ringAnim = useRef(new Animated.Value(0)).current;
  // Mood emoji springs
  const moodScaleAnims = useRef(MOODS.map(() => new Animated.Value(1))).current;

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.allSettled([getMySessions(), getMatchedSpecialists()]).then(([sessRes, specRes]) => {
      if (sessRes.status === 'fulfilled') setSessions(sessRes.value);
      if (specRes.status === 'fulfilled') {
        setHasCompletedQuestionnaire(specRes.value.hasCompletedQuestionnaire);
        setTopSpecialists(specRes.value.specialists.slice(0, 4));
      }
      setLoading(false);
    });
  }, [user]);

  // ── Live countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nextSession) return;
    const update = () => {
      const { label, isUrgent } = getCountdown(nextSession.date);
      setCountdownText(label);
      setCountdownUrgent(isUrgent);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [nextSession?.date]);

  // ── Animations ─────────────────────────────────────────────────────────────
  const runBreatheAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();

    // Avatar ring: slightly faster, offset phase
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [breatheAnim, ringAnim]);

  useEffect(() => {
    if (!loading) {
      sectionAnims.forEach(a => a.setValue(0));
      statScaleAnims.forEach(a => a.setValue(0.72));

      Animated.stagger(80, sectionAnims.map(anim =>
        Animated.timing(anim, { toValue: 1, duration: 420, useNativeDriver: true })
      )).start(() => {
        // After entrance: spring-in each stat card with a small stagger
        Animated.stagger(100, statScaleAnims.map(anim =>
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true })
        )).start();
        runBreatheAnimation();
      });
    }
  }, [loading]);

  // Pulse join button when session is imminent
  const isImminent = useMemo(() => {
    if (!nextSession) return false;
    const diff = new Date(nextSession.date).getTime() - Date.now();
    return diff > 0 && diff <= 15 * 60 * 1000;
  }, [nextSession]);

  useEffect(() => {
    if (!isImminent) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isImminent]);

  // ── Mood ───────────────────────────────────────────────────────────────────
  const handleMoodPress = (index: number) => {
    setSelectedMood(index);
    moodScaleAnims.forEach((a, i) => { if (i !== index) a.setValue(1); });
    Animated.sequence([
      Animated.spring(moodScaleAnims[index], { toValue: 1.35, useNativeDriver: true, friction: 3, tension: 200 }),
      Animated.spring(moodScaleAnims[index], { toValue: 1.1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  // ── Animation helpers ──────────────────────────────────────────────────────
  const animStyle = (i: number) => ({
    opacity: sectionAnims[i],
    transform: [{ translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  const breatheScale = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const breatheOpacity = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.17] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  const getFirstName = () => user?.name?.split(' ')[0] ?? '';

  // ── Section: Hero Header ───────────────────────────────────────────────────
  const renderHeroHeader = () => (
    <Animated.View style={[styles.heroCard, animStyle(0)]}>
      {/* Greeting + avatar */}
      <View style={styles.heroTop}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroDate}>{getCurrentDate()}</Text>
          <Text style={styles.heroGreeting}>{getGreeting()},</Text>
          <Text style={styles.heroName}>{getFirstName()}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[styles.avatarRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[heraLanding.primary, heraLanding.secondary]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarInitial}>{getFirstName().charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.heroDivider} />

      {/* Mood — integrado en la misma tarjeta */}
      <View style={styles.heroMoodSection}>
        <Text style={styles.moodLabel}>¿Cómo te sientes hoy?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((emoji, i) => (
            <TouchableOpacity key={i} onPress={() => handleMoodPress(i)} activeOpacity={0.8}>
              <Animated.View
                style={[
                  styles.moodEmoji,
                  selectedMood === i && styles.moodEmojiSelected,
                  selectedMood !== null && selectedMood !== i && styles.moodEmojiDimmed,
                  { transform: [{ scale: moodScaleAnims[i] }] },
                ]}
              >
                <Text style={styles.moodEmojiText}>{emoji}</Text>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick nav pills */}
      <View style={styles.heroQuickActions}>
        {([
          { icon: 'calendar-outline', label: 'Sesiones', screen: 'Sessions', color: heraLanding.secondary, bg: heraLanding.secondaryMuted },
          { icon: 'search', label: 'Buscar', screen: hasCompletedQuestionnaire ? 'Specialists' : 'Questionnaire', color: heraLanding.primary, bg: heraLanding.successBg },
          { icon: 'person-outline', label: 'Mi perfil', screen: 'Profile', color: heraLanding.textSecondary, bg: heraLanding.background },
        ] as Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; label: string; screen: string; color: string; bg: string }>).map(({ icon, label, screen, color, bg }) => (
          <TouchableOpacity
            key={label}
            style={[styles.heroQuickPill, { backgroundColor: bg }]}
            onPress={() => navigation.navigate(screen as any)}
            activeOpacity={0.8}
          >
            <Ionicons name={icon} size={14} color={color} />
            <Text style={[styles.heroQuickPillText, { color }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  // ── Section: Next Session Hero Card ───────────────────────────────────────
  const renderNextSessionCard = () => (
    <Animated.View style={animStyle(1)}>
      {nextSession ? (
        <TouchableOpacity activeOpacity={0.92} onPress={() => navigation.navigate('Sessions')}>
          <LinearGradient
            colors={['#7A9172', '#A89AC4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextSessionCard}
          >
            <Animated.View style={[styles.decorCircle, styles.decorCircle1, { transform: [{ scale: breatheScale }], opacity: breatheOpacity }]} />
            <Animated.View style={[styles.decorCircle, styles.decorCircle2, { transform: [{ scale: breatheScale }], opacity: breatheOpacity }]} />

            <View style={styles.nextSessionTopRow}>
              <Text style={styles.nextSessionLabel}>Próxima sesión</Text>
              <View style={[styles.countdownBadge, countdownUrgent && styles.countdownBadgeUrgent]}>
                <Ionicons name={countdownUrgent ? 'flash' : 'time-outline'} size={11} color="rgba(255,255,255,0.95)" />
                <Text style={styles.countdownText}>{countdownText}</Text>
              </View>
            </View>

            <View style={styles.nextSessionSpecialist}>
              <View style={styles.nextSessionAvatarWrap}>
                {nextSession.specialist.avatar || nextSession.specialist.user.avatar ? (
                  <Image
                    source={{ uri: (nextSession.specialist.avatar || nextSession.specialist.user.avatar) as string }}
                    style={styles.nextSessionAvatar}
                  />
                ) : (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
                    style={styles.nextSessionAvatar}
                  >
                    <Text style={styles.nextSessionAvatarInitial}>
                      {nextSession.specialist.user.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.nextSessionInfo}>
                <Text style={styles.nextSessionName}>{nextSession.specialist.user.name}</Text>
                <Text style={styles.nextSessionSpec}>{nextSession.specialist.specialization}</Text>
                <View style={styles.nextSessionTypePill}>
                  <Ionicons name={getSessionTypeIcon(nextSession.type) as any} size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.nextSessionTypeText}>{getSessionTypeLabel(nextSession.type)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.nextSessionFooter}>
              <View>
                <Text style={styles.nextSessionDateTime}>
                  {getDateLabel(nextSession.date)} · {formatTime(nextSession.date)}
                </Text>
                <Text style={styles.nextSessionPrice}>€{nextSession.specialist.pricePerSession}</Text>
              </View>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity style={styles.joinButton} activeOpacity={0.85}>
                  <Ionicons name={getSessionTypeIcon(nextSession.type) as any} size={15} color={heraLanding.primaryDark} />
                  <Text style={styles.joinButtonText}>Unirse</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={styles.noSessionCard}>
          <View style={styles.noSessionIconWrap}>
            <Ionicons name="calendar-outline" size={38} color={heraLanding.textMuted} />
          </View>
          <Text style={styles.noSessionTitle}>Sin sesiones próximas</Text>
          <Text style={styles.noSessionDesc}>Reserva tu primera sesión con un especialista</Text>
          <TouchableOpacity
            style={styles.noSessionCTA}
            onPress={() => navigation.navigate(hasCompletedQuestionnaire ? 'Specialists' : 'Questionnaire')}
            activeOpacity={0.85}
          >
            <Text style={styles.noSessionCTAText}>Encontrar especialista</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  // ── Section: Stats ────────────────────────────────────────────────────────
  const renderStats = () => {
    const statDefs: Array<{
      label: string;
      value: number;
      icon: React.ComponentProps<typeof Ionicons>['name'];
      colors: [string, string];
    }> = [
      { label: 'Sesiones', value: stats.completed, icon: 'checkmark-circle', colors: [heraLanding.primary, heraLanding.primaryDark] },
      { label: 'Horas', value: stats.hours, icon: 'time', colors: [heraLanding.secondary, heraLanding.secondaryDark] },
      { label: 'Especialistas', value: stats.specialists, icon: 'people', colors: ['#8BA8C4', '#6B88A4'] },
    ];
    return (
      <Animated.View style={[styles.statsRow, animStyle(2)]}>
        {statDefs.map((stat, i) => (
          <Animated.View
            key={stat.label}
            style={[styles.statCard, { transform: [{ scale: statScaleAnims[i] }] }]}
          >
            <LinearGradient colors={stat.colors} style={styles.statIconCircle}>
              <Ionicons name={stat.icon} size={17} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Animated.View>
        ))}
      </Animated.View>
    );
  };

  // ── Section: Sessions list (reusable for upcoming and recent) ────────────
  const renderSessionsSection = (list: ApiSession[], title: string, animIdx: number) => {
    if (list.length === 0) return null;
    return (
      <Animated.View style={[styles.section, animStyle(animIdx)]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Sessions')}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sessionsList}>
          {list.map(session => {
            const statusKey = session.status.toLowerCase() as keyof typeof heraLanding.status;
            const statusTokens = heraLanding.status[statusKey];
            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => navigation.navigate('Sessions')}
                activeOpacity={0.85}
              >
                <View style={styles.sessionAvatarWrap}>
                  {session.specialist.avatar || session.specialist.user.avatar ? (
                    <Image
                      source={{ uri: (session.specialist.avatar || session.specialist.user.avatar) as string }}
                      style={styles.sessionAvatar}
                    />
                  ) : (
                    <LinearGradient
                      colors={[heraLanding.primary, heraLanding.primaryDark]}
                      style={styles.sessionAvatar}
                    >
                      <Text style={styles.sessionAvatarInitial}>
                        {session.specialist.user.name.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>{session.specialist.user.name}</Text>
                  <Text style={styles.sessionSpec}>{session.specialist.specialization}</Text>
                  <View style={styles.sessionMeta}>
                    <Ionicons name="calendar-outline" size={11} color={heraLanding.textMuted} />
                    <Text style={styles.sessionMetaText}>
                      {getDateLabel(session.date)} · {formatTime(session.date)}
                    </Text>
                  </View>
                  <View style={styles.sessionMeta}>
                    <Ionicons name={getSessionTypeIcon(session.type) as any} size={11} color={heraLanding.textMuted} />
                    <Text style={styles.sessionMetaText}>{getSessionTypeLabel(session.type)}</Text>
                  </View>
                </View>
                <View style={styles.sessionRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusTokens?.bg ?? heraLanding.primaryMuted }]}>
                    <Text style={[styles.statusText, { color: statusTokens?.text ?? heraLanding.primary }]}>
                      {getStatusLabel(session.status)}
                    </Text>
                  </View>
                  <Text style={styles.sessionPrice}>€{session.specialist.pricePerSession}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  // ── Section: Recommended Specialists ─────────────────────────────────────
  const renderSpecialistItem = (specialist: SpecialistData, compact = false) => (
    <TouchableOpacity
      key={specialist.id}
      style={compact ? styles.specialistCardCompact : styles.specialistCard}
      onPress={() => navigation.navigate('SpecialistDetail', { specialistId: specialist.id })}
      activeOpacity={0.85}
    >
      <View style={styles.specialistAvatarWrap}>
        {specialist.avatar ? (
          <Image source={{ uri: specialist.avatar }} style={compact ? styles.specialistAvatarSm : styles.specialistAvatar} />
        ) : (
          <LinearGradient
            colors={[heraLanding.secondary, heraLanding.secondaryDark]}
            style={compact ? styles.specialistAvatarSm : styles.specialistAvatar}
          >
            <Text style={compact ? styles.specialistAvatarInitialSm : styles.specialistAvatarInitial}>
              {specialist.user.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        {specialist.affinity != null && (
          <View style={[styles.affinityBadge, { backgroundColor: getAffinityColor(specialist.affinity) }]}>
            <Text style={styles.affinityText}>{getAffinityLabel(specialist.affinity)}</Text>
          </View>
        )}
        {specialist.firstVisitFree && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>Gratis</Text>
          </View>
        )}
      </View>
      <Text style={compact ? styles.specialistNameSm : styles.specialistName} numberOfLines={1}>
        {specialist.user.name}
      </Text>
      <Text style={compact ? styles.specialistSpecSm : styles.specialistSpec} numberOfLines={compact ? 1 : 2}>
        {specialist.specialization}
      </Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={11} color={heraLanding.starRating} />
        <Text style={styles.ratingText}>{specialist.rating} ({specialist.reviewCount})</Text>
      </View>
      <Text style={styles.specialistPrice}>€{specialist.pricePerSession}/ses.</Text>
      {!compact && (
        <View style={styles.viewProfileBtn}>
          <Text style={styles.viewProfileText}>Ver perfil</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderRecommendedSpecialists = () => {
    if (!hasCompletedQuestionnaire || topSpecialists.length === 0) return null;
    return (
      <Animated.View style={[styles.section, animStyle(4)]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recomendados</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Specialists')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {isDesktop ? (
          <View style={styles.specialistsGrid}>
            {topSpecialists.map(s => renderSpecialistItem(s, true))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specialistsScroll}>
            {topSpecialists.map(s => renderSpecialistItem(s, false))}
          </ScrollView>
        )}
      </Animated.View>
    );
  };

  // ── Section: CTA ──────────────────────────────────────────────────────────
  const renderCTA = () => (
    <Animated.View style={[styles.section, animStyle(5)]}>
      {!hasCompletedQuestionnaire ? (
        <LinearGradient
          colors={[heraLanding.primary, heraLanding.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={[styles.decorCircle, styles.ctaCircle1]} />
          <View style={[styles.decorCircle, styles.ctaCircle2]} />
          <View style={styles.ctaIconWrap}>
            <Ionicons name="heart" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaTitle}>Encuentra tu match perfecto</Text>
          <Text style={styles.ctaDesc}>
            Completa nuestro cuestionario de 5 minutos y te conectaremos con el especialista ideal para ti.
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Questionnaire')} activeOpacity={0.85}>
            <Text style={styles.ctaButtonText}>Comenzar</Text>
            <Ionicons name="arrow-forward" size={16} color={heraLanding.primary} />
          </TouchableOpacity>
          <View style={styles.ctaInfo}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.ctaInfoText}>Solo 5 minutos · Gratuito</Text>
          </View>
        </LinearGradient>
      ) : (
        <TouchableOpacity style={styles.refineCard} onPress={() => navigation.navigate('Questionnaire')} activeOpacity={0.85}>
          <View style={styles.refineLeft}>
            <View style={styles.refineIconWrap}>
              <Ionicons name="options-outline" size={20} color={heraLanding.primary} />
            </View>
            <View style={styles.refineText}>
              <Text style={styles.refineTitle}>Refina tus matches</Text>
              <Text style={styles.refineDesc}>Actualiza tus preferencias para mejores resultados.</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={heraLanding.primary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <VerificationBanner />
        {renderHeroHeader()}

        {isDesktop ? (
          // ── Desktop: two-column grid ──────────────────────────────────────
          <View style={styles.desktopGrid}>
            <View style={styles.colLeft}>
              {renderNextSessionCard()}
              {renderSessionsSection(
                upcomingList.length > 0 ? upcomingList : recentSessionsList,
                upcomingList.length > 0 ? 'Próximas sesiones' : 'Sesiones recientes',
                3
              )}
            </View>
            <View style={styles.colRight}>
              {renderStats()}
              {renderRecommendedSpecialists()}
              {renderCTA()}
            </View>
          </View>
        ) : (
          // ── Mobile / Tablet: single column ───────────────────────────────
          <>
            {renderNextSessionCard()}
            {renderStats()}
            {renderSessionsSection(
              upcomingList.length > 0 ? upcomingList : recentSessionsList,
              upcomingList.length > 0 ? 'Próximas sesiones' : 'Sesiones recientes',
              3
            )}
            {renderRecommendedSpecialists()}
            {renderCTA()}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: 20,
  },
  scrollContentMobile: {
    paddingTop: 56,
  },
  scrollContentDesktop: {
    maxWidth: 1280,
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
    fontSize: 15,
    color: heraLanding.textSecondary,
  },

  // ── Two-column desktop grid ─────────────────────────────────────────────────
  desktopGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  colLeft: {
    flex: 1.1,
    gap: 20,
  },
  colRight: {
    flex: 1,
    gap: 16,
  },

  // ── Hero Card (unified: greeting + mood) ───────────────────────────────────
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTextBlock: {
    flex: 1,
  },
  heroDate: {
    fontSize: 12,
    fontWeight: '500',
    color: heraLanding.textMuted,
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  heroGreeting: {
    fontSize: 28,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    lineHeight: 32,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '800',
    color: heraLanding.primary,
    lineHeight: 32,
  },
  heroDivider: {
    height: 1,
    backgroundColor: heraLanding.borderLight,
    marginVertical: 20,
  },
  heroMoodSection: {
    gap: 14,
  },
  heroQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  heroQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
  },
  heroQuickPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Avatar with breathing ring
  avatarWrapper: {
    width: 56,
    height: 56,
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: heraLanding.primary,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  moodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(244,237,228,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmojiSelected: {
    backgroundColor: heraLanding.secondaryMuted,
    borderWidth: 2,
    borderColor: heraLanding.secondaryLight,
  },
  moodEmojiDimmed: {
    opacity: 0.38,
  },
  moodEmojiText: {
    fontSize: 24,
  },

  // ── Next Session Card ───────────────────────────────────────────────────────
  nextSessionCard: {
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
    gap: 18,
    ...shadows.lg,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
  },
  decorCircle1: {
    width: 240,
    height: 240,
    top: -90,
    right: -70,
  },
  decorCircle2: {
    width: 170,
    height: 170,
    bottom: -55,
    right: 50,
  },
  nextSessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextSessionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  countdownBadgeUrgent: {
    backgroundColor: 'rgba(239,68,68,0.82)',
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  nextSessionSpecialist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nextSessionAvatarWrap: {
    ...shadows.md,
  },
  nextSessionAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  nextSessionAvatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextSessionInfo: {
    flex: 1,
    gap: 4,
  },
  nextSessionName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextSessionSpec: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
  },
  nextSessionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
    marginTop: 2,
  },
  nextSessionTypeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  nextSessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextSessionDateTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  nextSessionPrice: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 14,
    ...shadows.sm,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.primaryDark,
  },

  // ── No Session Empty State ──────────────────────────────────────────────────
  noSessionCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    ...shadows.sm,
  },
  noSessionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  noSessionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  noSessionDesc: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  noSessionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: heraLanding.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  noSessionCTAText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Stats Row ───────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: heraLanding.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: heraLanding.textMuted,
    textAlign: 'center',
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // ── Upcoming Sessions ───────────────────────────────────────────────────────
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    ...shadows.sm,
  },
  sessionAvatarWrap: {},
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sessionAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  sessionSpec: {
    fontSize: 11,
    color: heraLanding.textSecondary,
    marginBottom: 2,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 11,
    color: heraLanding.textMuted,
    textTransform: 'capitalize',
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 7,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sessionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  // ── Recommended Specialists (mobile: horizontal scroll) ────────────────────
  specialistsScroll: {
    gap: 12,
    paddingRight: 20,
  },
  specialistCard: {
    width: 164,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    ...shadows.md,
  },
  specialistAvatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  specialistAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  specialistAvatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Compact variants for desktop grid
  specialistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialistCardCompact: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    ...shadows.sm,
  },
  specialistAvatarSm: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  specialistAvatarInitialSm: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  specialistNameSm: {
    fontSize: 12,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  specialistSpecSm: {
    fontSize: 10,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },
  affinityBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  affinityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  freeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: heraLanding.success,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  specialistName: {
    fontSize: 13,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  specialistSpec: {
    fontSize: 11,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    minHeight: 28,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: heraLanding.textSecondary,
  },
  specialistPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  viewProfileBtn: {
    borderWidth: 1.5,
    borderColor: heraLanding.border,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  viewProfileText: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },

  // ── CTA Card ────────────────────────────────────────────────────────────────
  ctaCard: {
    borderRadius: 18,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    gap: 8,
    ...shadows.md,
  },
  ctaCircle1: {
    width: 180,
    height: 180,
    top: -60,
    right: -40,
    opacity: 0.1,
  },
  ctaCircle2: {
    width: 120,
    height: 120,
    bottom: -30,
    right: 50,
    opacity: 0.08,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  ctaTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 11,
    marginTop: 4,
    ...shadows.sm,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  ctaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  ctaInfoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
  },

  // ── Refine Card ─────────────────────────────────────────────────────────────
  refineCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: heraLanding.primaryMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    ...shadows.sm,
  },
  refineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  refineIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refineText: {
    flex: 1,
  },
  refineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  refineDesc: {
    fontSize: 11,
    color: heraLanding.textSecondary,
    lineHeight: 16,
    marginTop: 1,
  },
});
