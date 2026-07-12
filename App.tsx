/**
 * HERA App — Main entry point
 * Sets up navigation, providers, fonts, and theming.
 */

import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FontDisplay, useFonts, type FontSource } from 'expo-font';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import './src/config/calendarLocale';
import { POSTHOG_API_KEY, POSTHOG_HOST, ANALYTICS_ENABLED } from './src/config/analytics';
import { setPostHogClient } from './src/services/analyticsService';
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

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'hera://'],
  config: {
    screens: {
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
      ResetPassword: {
        path: 'reset',
        parse: {
          token: (token: string) => token,
        },
      },
      PublicSpecialistProfile: {
        path: 'especialista/:specialistId',
        alias: ['e/:specialistId'],
        parse: {
          specialistId: (specialistId: string) => specialistId,
        },
      },
      PublicSpecialists: 'especialistas',
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
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: ${track}; border-radius: 4px; }
    ::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: 4px; border: 1px solid ${track}; }
    ::-webkit-scrollbar-thumb:hover { background: ${thumbHover}; }
    ::-webkit-scrollbar-corner { background: ${track}; }
    * { scrollbar-width: thin; scrollbar-color: ${thumb} ${track}; }

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

/** Bridges PostHogProvider context to our analytics singleton */
function PostHogBridge() {
  const posthog = usePostHog();
  useEffect(() => {
    if (posthog) setPostHogClient(posthog);
  }, [posthog]);
  return null;
}

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
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );

  if (!ANALYTICS_ENABLED) return appContent;

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{ host: POSTHOG_HOST, enableSessionReplay: false }}
      autocapture={false}
    >
      <PostHogBridge />
      {appContent}
    </PostHogProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(heraFonts);
  const shouldWaitForFonts = Platform.OS !== 'web' && !fontsLoaded && !fontError;

  if (shouldWaitForFonts) {
    return <View style={{ flex: 1, backgroundColor: lightTheme.bg }} />;
  }

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
