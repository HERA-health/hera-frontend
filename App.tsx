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
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { Fraunces_900Black } from '@expo-google-fonts/fraunces/900Black';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST, ANALYTICS_ENABLED } from './src/config/analytics';
import { setPostHogClient } from './src/services/analyticsService';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { AlertProvider } from './src/components/common/alert';
import type { RootStackParamList } from './src/constants/types';
import {
  getLegalDocumentKeyFromSlug,
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocumentKey,
} from './src/constants/legal';

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

  const track = isDark ? '#131519' : '#F5F7F5';
  const thumb = isDark ? '#343848' : '#C5CFC5';
  const thumbHover = isDark ? '#B7A6D8' : '#8B9D83';

  style.textContent = `
    /* HERA Design System — Global Web Styles */

    /* CSS custom properties for dark mode */
    :root {
      --bg: ${isDark ? '#0A0D0B' : '#F5F7F5'};
      --bg-card: ${isDark ? '#131519' : '#FFFFFF'};
      --text-primary: ${isDark ? '#E8F0E8' : '#2C3E2C'};
      --primary: ${isDark ? '#B7A6D8' : '#8B9D83'};
      --border: ${isDark ? '#2A2C34' : '#E2E8E2'};
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
          <AlertProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <RootNavigator />
            </NavigationContainer>
          </AlertProvider>
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
  const [fontsLoaded, fontError] = useFonts({
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Fraunces': Fraunces_400Regular,
    'Fraunces-Italic': Fraunces_400Regular_Italic,
    'Fraunces-Bold': Fraunces_700Bold,
    'Fraunces-Black': Fraunces_900Black,
  });

  // Wait for fonts — show blank white/dark while loading
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#F5F7F5' }} />;
  }

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
