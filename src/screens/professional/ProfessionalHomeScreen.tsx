import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { AnimatedPressable, Button } from '../../components/common';
import { TourTarget } from '../../components/onboarding/TourTarget';
import { useProfessionalTourAutoStart } from '../../components/onboarding/professionalTourContext';
import {
  ActivationHero,
  AttentionPanel,
  NextSessionHero,
  TodayAgenda,
  WeeklyPulse,
} from '../../components/professional/home/ProfessionalHomeCards';
import { createProfessionalHomeStyles } from '../../components/professional/home/professionalHomeStyles';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileCompletion } from '../../contexts/ProfileCompletionContext';
import { useProfessionalWorkspace } from '../../contexts/ProfessionalWorkspaceContext';
import { useTheme } from '../../contexts/ThemeContext';
import { trackProfessionalWorkspaceEvent } from '../../services/professionalWorkspaceAnalytics';
import * as professionalService from '../../services/professionalService';

const MADRID_TIME_ZONE = 'Europe/Madrid';

type HomeAnalyticsModule = 'activation' | 'next_session' | 'attention' | 'today' | 'weekly_summary';
type HomeAnalyticsAction = 'profile' | 'availability' | 'detail' | 'join' | 'create' | 'agenda' | 'billing' | 'support' | 'statistics';

const trackHomeAction = (module: HomeAnalyticsModule, action: HomeAnalyticsAction): void => {
  trackProfessionalWorkspaceEvent({
    event: 'professional_home_module_action_selected',
    properties: { module, action },
  });
};

const formatLongDate = (iso: string): string => new Intl.DateTimeFormat('es-ES', {
  timeZone: MADRID_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date(iso));

const getGreeting = (): string => {
  const hour = Number(new Intl.DateTimeFormat('es-ES', {
    timeZone: MADRID_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date()));
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

export function ProfessionalHomeScreen(): React.ReactElement {
  const navigation = useNavigation<AppNavigationProp>();
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { snapshot, status: profileStatus } = useProfileCompletion();
  const {
    homeData: data,
    homeStatus,
    homeError,
    unreadSupport,
    supportStatus,
    refreshHome,
  } = useProfessionalWorkspace();
  const isWide = width >= 1280;
  const isMobile = width < 680;
  const [joining, setJoining] = useState(false);
  const entryAnimation = useRef(new Animated.Value(0)).current;
  const styles = useMemo(
    () => createProfessionalHomeStyles(theme, isMobile),
    [isMobile, theme],
  );
  const profileItems = snapshot?.role === 'PROFESSIONAL' ? snapshot.items : [];
  const actionableProfileItems = profileItems.filter((item) => item.state === 'ACTION_REQUIRED');

  useProfessionalTourAutoStart('professional_home_v1', Boolean(data));

  useEffect(() => {
    if (!data) return;
    Animated.timing(entryAnimation, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [data, entryAnimation]);

  const openSession = (sessionId: string): void => {
    navigation.navigate('ProfessionalSessions', { focusSessionId: sessionId });
  };

  const joinSession = async (sessionId: string): Promise<void> => {
    setJoining(true);
    try {
      const meeting = await professionalService.getMeetingLink(sessionId);
      if (!meeting.canJoin || !meeting.meetingLink) {
        showAppAlert(appAlert, 'Aún no es el momento', meeting.message);
        return;
      }
      if (!await Linking.canOpenURL(meeting.meetingLink)) {
        showAppAlert(appAlert, 'No se pudo abrir', 'Tu dispositivo no puede abrir el enlace de la videollamada.');
        return;
      }
      await Linking.openURL(meeting.meetingLink);
    } catch {
      showAppAlert(appAlert, 'No se pudo unir', 'Comprueba la conexión e inténtalo de nuevo.');
    } finally {
      setJoining(false);
    }
  };

  if (homeStatus === 'loading' && !data) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.bg }]}>
        <View style={[styles.loadingMark, { backgroundColor: theme.primaryAlpha12 }]}>
          <ActivityIndicator color={theme.primary} />
        </View>
        <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Preparando tu día…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.bg }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={theme.textMuted} />
        <Text style={[styles.errorTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>No pudimos cargar tu inicio</Text>
        <Button onPress={() => { void refreshHome(true); }} size="small">Reintentar</Button>
      </View>
    );
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Hera';
  const isNewSpecialist = !data.nextSession && data.week.totalSessions === 0 && profileItems.length > 0;
  const attentionReady = homeStatus === 'ready'
    && supportStatus === 'ready'
    && profileStatus === 'ready'
    && snapshot !== null;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <Animated.View
        style={{
          opacity: entryAnimation,
          transform: [{
            translateY: entryAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          }],
        }}
      >
        <View style={styles.pageHeader}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>TU JORNADA</Text>
            <Text style={[styles.greeting, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{getGreeting()}, {firstName}</Text>
          </View>
          <Text style={[styles.date, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>{formatLongDate(new Date().toISOString())}</Text>
        </View>

        {homeStatus === 'stale' ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
            <Ionicons name="refresh-outline" size={18} color={theme.warning} />
            <Text style={[styles.errorBannerText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{homeError}. Mostramos la última información disponible.</Text>
            <AnimatedPressable onPress={() => { void refreshHome(true); }} hoverLift={false} style={styles.retryLink}>
              <Text style={[styles.retryText, { color: theme.link, fontFamily: theme.fontSansSemiBold }]}>Reintentar</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        <View style={[styles.priorityGrid, (!isWide || isNewSpecialist) ? styles.priorityGridStacked : null]}>
          {isNewSpecialist ? (
            <ActivationHero
              pendingSteps={profileItems.length}
              onProfile={() => {
                trackHomeAction('activation', 'profile');
                navigation.navigate('ProfessionalProfile');
              }}
              onAvailability={() => {
                trackHomeAction('activation', 'availability');
                navigation.navigate('ProfessionalAvailability');
              }}
            />
          ) : (
            <TourTarget id="professional.home.next-session" fill style={isWide ? styles.priorityColumn : styles.stackedColumn}>
              <NextSessionHero
                session={data.nextSession}
                joining={joining}
                onOpen={(sessionId) => {
                  trackHomeAction('next_session', 'detail');
                  openSession(sessionId);
                }}
                onJoin={(sessionId) => {
                  trackHomeAction('next_session', 'join');
                  void joinSession(sessionId);
                }}
                onCreate={() => {
                  trackHomeAction('next_session', 'create');
                  navigation.navigate('ProfessionalSessions', { openCreateSession: true });
                }}
              />
            </TourTarget>
          )}

          <TourTarget id="professional.home.attention" fill style={isWide && !isNewSpecialist ? styles.priorityColumn : styles.stackedColumn}>
            <AttentionPanel
              data={data}
              profileItems={actionableProfileItems.length}
              unreadSupport={unreadSupport}
              ready={attentionReady}
              onAgenda={() => {
                trackHomeAction('attention', 'agenda');
                navigation.navigate('ProfessionalSessions');
              }}
              onBilling={() => {
                trackHomeAction('attention', 'billing');
                navigation.navigate('ProfessionalBilling');
              }}
              onProfile={() => {
                trackHomeAction('attention', 'profile');
                navigation.navigate('ProfessionalProfile');
              }}
              onSupport={() => {
                trackHomeAction('attention', 'support');
                navigation.navigate('ProfessionalHelp', { section: 'help' });
              }}
            />
          </TourTarget>
        </View>

        <View style={[styles.mainGrid, !isWide ? styles.mainGridStacked : null]}>
          <TourTarget id="professional.home.today" fill style={isWide ? styles.mainColumn : styles.stackedColumn}>
            <TodayAgenda
              sessions={data.today.sessions}
              onOpen={(sessionId) => {
                trackHomeAction('today', 'detail');
                openSession(sessionId);
              }}
              onAgenda={() => {
                trackHomeAction('today', 'agenda');
                navigation.navigate('ProfessionalSessions');
              }}
            />
          </TourTarget>
          <TourTarget id="professional.home.week-pulse" fill style={isWide ? styles.mainColumn : styles.stackedColumn}>
            <WeeklyPulse
              data={data}
              onNavigate={(route) => {
                trackHomeAction(
                  'weekly_summary',
                  route === 'ProfessionalSessions'
                    ? 'agenda'
                    : route === 'ProfessionalAvailability'
                      ? 'availability'
                      : 'statistics',
                );
                navigation.navigate(route);
              }}
            />
          </TourTarget>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

export default ProfessionalHomeScreen;
