import { PrivacyControls } from './src/components/common/PrivacyControls';
import { parseDashboardFilters, serializeDashboardFilters } from './src/utils/adminMetricsFilters';
import { captureClinicalPinResetUrl } from './src/services/clinicalPinResetIntent';
import { captureReferralUrl } from './src/services/pendingReferralIntent';
/**
 * HERA App — Main entry point
 * Sets up navigation, providers, fonts, and theming.
 */

import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { captureCalendarUrl } from './src/services/googleCalendarIntent';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FontDisplay, useFonts, type FontSource } from 'expo-font';

import './src/config/calendarLocale';
import { AuthProvider } from './src/contexts/AuthContext';
import { ProfileCompletionProvider } from './src/contexts/ProfileCompletionContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDocumentTitleForRoute } from './src/navigation/documentTitles';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { AlertProvider } from './src/components/common/alert';
import type { RootStackParamList } from './src/constants/types';
import {
  getLegalDocumentKeyFromSlug,
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocumentKey,
} from './src/constants/legal';
import { darkTheme, lightTheme } from './src/constants/theme';
import { GuestConsentPublicScreen } from './src/screens/consent/GuestConsentPublicScreen';
import { getClinicGuestConsentRequestId } from './src/screens/clinic/clinicGuestConsentRoute';
import { getClinicalGuestConsentRequestId } from './src/screens/clinical/clinicalGuestConsentRoute';

const heraFonts: Record<string, FontSource> = {
  HeraDisplay: {
    uri: require('./assets/fonts/Lustria-Regular.ttf'),
    display: FontDisplay.SWAP,
  },
  HeraSans: {
    uri: require('./assets/fonts/GlacialIndifference-Regular.otf'),
    display: FontDisplay.SWAP,
  },
  'HeraSans-Bold': {
    uri: require('./assets/fonts/GlacialIndifference-Bold.otf'),
    display: FontDisplay.SWAP,
  },
};

// Deep linking configuration
const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'hera://'],
  getInitialURL: async () => captureCalendarUrl(captureReferralUrl(captureClinicalPinResetUrl(await Linking.getInitialURL()))),
  subscribe: (listener) => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const cleanUrl = captureCalendarUrl(captureReferralUrl(captureClinicalPinResetUrl(url)));
      if (cleanUrl) listener(cleanUrl);
    });
    return () => subscription.remove();
  },
  config: {
      screens: {
      GoogleCalendarIntegration: 'integrations/google-calendar',
      GoogleCalendarSession: 'calendar/session/:sessionId',
      EmailVerification: {
        path: 'verify',
        parse: {
          token: (token: string) => token,
        },
      },
      ClinicalConsent: {
        path: 'clinical-consent/:requestId/:token',
        parse: {
          requestId: (requestId: string) => requestId,
          token: (token: string) => token,
        },
      },
      ClinicConsent: {
        path: 'clinic-consent/:requestId/:token',
        parse: {
          requestId: (requestId: string) => requestId,
          token: (token: string) => token,
        },
      },
      PublicReview: {
        path: 'review/:token',
        parse: {
          token: (token: string) => token,
        },
      },
      LegalDocument: {
        path: 'legal/:documentKey',
        parse: {
          documentKey: (slug: string) => getLegalDocumentKeyFromSlug(slug),
        },
        stringify: {
          documentKey: (documentKey) => LEGAL_DOCUMENT_SLUGS[documentKey as LegalDocumentKey],
        },
      },
      ClinicalPinReset: 'clinical-pin/reset',
      ResetPassword: {
        path: 'reset',
        parse: {
          token: (token: string) => token,
        },
      },
      PublicSpecialistProfile: {
        path: 'especialista/:profileRef',
        alias: ['e/:profileRef'],
        parse: {
          profileRef: (profileRef: string) => profileRef,
        },
      },
      Booking: {
        path: 'reservar/:specialistId',
        parse: {
          specialistId: (specialistId: string) => specialistId,
          initialDate: (initialDate: string) => initialDate,
          initialSlotStartTime: (initialSlotStartTime: string) => initialSlotStartTime,
          initialSlotEndTime: (initialSlotEndTime: string) => initialSlotEndTime,
        },
      },
      ProfessionalHelp: {
        path: 'ayuda',
        parse: {
          section: (section: string) => section === 'help' ? 'help' : 'feedback',
          requestId: (requestId: string) => requestId,
        },
      },
      AdminPanel: {
        path: 'admin',
        parse: {
          initialTab: (initialTab: string) => {
            if (
              initialTab === 'management'
              || initialTab === 'dashboard'
              || initialTab === 'verifications'
              || initialTab === 'commissions'
              || initialTab === 'help'
              || initialTab === 'feedback'
            ) return initialTab;
            return 'dashboard';
          },
          dashboardSection: (section: string) => section === 'growth' || section === 'demand' || section === 'agenda' || section === 'economy' || section === 'operations' ? section : 'overview',
          dashboardFilters: parseDashboardFilters,
          requestId: (requestId: string) => requestId,
        },
        stringify: { dashboardFilters: serializeDashboardFilters },
      },
      Referrals: { path: 'derivaciones/:id?' },
      Collaborations: { path: 'colaboradores/:id?' },
      HeraCommissions: { path: 'comisiones-hera/:accountId?', parse: { admin: (value: string) => value === 'true' } },
      ProfessionalClinicWorkspace: {
        path: 'mi-clinica/:clinicId?/:section?',
        parse: {
          clinicId: (value: string) => value,
          section: (value: string) => value as 'home' | 'agenda' | 'patients' | 'agreement' | 'finance' | 'info',
        },
      },
      ProfessionalClinicPatientDetail: 'mi-clinica/:clinicId/pacientes/:clinicPatientId',
      PublicSpecialists: 'especialistas',
      ProfessionalShowcase: 'profesionales/recorrido',
      Landing: '',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
    },
  },
};

// Inject global scrollbar + dark mode CSS for web
const injectWebStyles = (isDark: boolean) => {
  if (Platform.OS !== 'web') return;

  const styleId = 'hera-global-styles';
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = styleId;

  const webTheme = isDark ? darkTheme : lightTheme;
  const track = webTheme.scrollbarTrack;
  const thumb = webTheme.scrollbarThumb;
  const thumbHover = webTheme.scrollbarThumbHover;

  style.textContent = `
    /* HERA Design System - Global Web Styles */

    /* CSS custom properties for dark mode */
    :root {
      --bg: ${webTheme.bg};
      --bg-card: ${webTheme.bgCard};
      --text-primary: ${webTheme.textPrimary};
      --primary: ${webTheme.primary};
      --border: ${webTheme.border};
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar { display: block !important; width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: ${track}; border-radius: 4px; }
    ::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: 4px; border: 1px solid ${track}; }
    ::-webkit-scrollbar-thumb:hover { background: ${thumbHover}; }
    ::-webkit-scrollbar-corner { background: ${track}; }
    * { scrollbar-width: thin !important; scrollbar-color: ${thumb} ${track}; }

    [data-testid="hera-sidebar-scroll"] { scrollbar-color: transparent transparent; }
    [data-testid="hera-sidebar-scroll"]:hover,
    [data-testid="hera-sidebar-scroll"]:focus-within { scrollbar-color: ${thumb} transparent; }
    [data-testid="hera-sidebar-scroll"]::-webkit-scrollbar-track,
    [data-testid="hera-sidebar-scroll"]::-webkit-scrollbar-corner { background: transparent; }
    [data-testid="hera-sidebar-scroll"]::-webkit-scrollbar-thumb { background: transparent; border: 0; }
    [data-testid="hera-sidebar-scroll"]:hover::-webkit-scrollbar-thumb,
    [data-testid="hera-sidebar-scroll"]:focus-within::-webkit-scrollbar-thumb { background: ${thumb}; }
    @media (hover: none) {
      [data-testid="hera-sidebar-scroll"] { scrollbar-color: ${thumb} transparent; }
      [data-testid="hera-sidebar-scroll"]::-webkit-scrollbar-thumb { background: ${thumb}; }
    }

    /* Smooth scrolling */
    html { scroll-behavior: smooth; }

    /* Pointer cursors for interactive elements */
    [role="button"], button { cursor: pointer; }
    [role="button"] { user-select: none; -webkit-user-select: none; }

    /* Remove tap highlight on mobile web */
    * { -webkit-tap-highlight-color: transparent; }

    /* Neutralize browser autofill background inside auth inputs */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    textarea:-webkit-autofill,
    textarea:-webkit-autofill:hover,
    textarea:-webkit-autofill:focus,
    select:-webkit-autofill,
    select:-webkit-autofill:hover,
    select:-webkit-autofill:focus {
      -webkit-text-fill-color: var(--text-primary) !important;
      caret-color: var(--text-primary) !important;
      -webkit-box-shadow: 0 0 0 1000px var(--bg-card) inset !important;
      box-shadow: 0 0 0 1000px var(--bg-card) inset !important;
      border-radius: 12px !important;
      transition: background-color 9999s ease-out 0s;
    }

    /* Backdrop filter support check */
    @supports (backdrop-filter: blur(1px)) {
      .glass-supported { backdrop-filter: var(--glass-blur, blur(20px)) saturate(180%); }
    }
  `;
  document.head.appendChild(style);
};

/** Inner app that has access to ThemeContext */
function ThemedApp() {
  const { isDark } = useTheme();

  useEffect(() => {
    injectWebStyles(isDark);
  }, [isDark]);

  const appContent = (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <PrivacyControls>
          <View style={{ flex: 1 }}>
          <ProfileCompletionProvider>
            <AlertProvider>
              <NavigationContainer
                linking={linking}
                documentTitle={{
                  formatter: (_options, route) =>
                    getDocumentTitleForRoute(route?.name, route?.params),
                }}
              >
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <RootNavigator />
              </NavigationContainer>
            </AlertProvider>
          </ProfileCompletionProvider>
          </View>
          </PrivacyControls>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );

  return appContent;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(heraFonts);
  const shouldWaitForFonts = Platform.OS !== 'web' && !fontsLoaded && !fontError;
  const guestConsentRequestId = Platform.OS === 'web' && typeof window !== 'undefined'
    ? getClinicGuestConsentRequestId(window.location.pathname)
    : null;
  const clinicalGuestConsentRequestId = Platform.OS === 'web' && typeof window !== 'undefined'
    ? getClinicalGuestConsentRequestId(window.location.pathname)
    : null;

  if (shouldWaitForFonts) {
    return <View style={{ flex: 1, backgroundColor: lightTheme.bg }} />;
  }

  if (guestConsentRequestId) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <GuestConsentPublicScreen requestId={guestConsentRequestId} />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (clinicalGuestConsentRequestId) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <GuestConsentPublicScreen requestId={clinicalGuestConsentRequestId} flow="specialist" />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
