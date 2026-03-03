/**
 * MindConnect App
 * Main entry point for the application
 * Sets up navigation and providers
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST, ANALYTICS_ENABLED } from './src/config/analytics';
import { setPostHogClient } from './src/services/analyticsService';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import type { RootStackParamList } from './src/constants/types';

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
      ResetPassword: {
        path: 'reset',
        parse: {
          token: (token: string) => token,
        },
      },
      PublicSpecialistProfile: {
        path: 'especialista/:specialistId',
        parse: {
          specialistId: (specialistId: string) => specialistId,
        },
      },
      // Add other deep link routes as needed
      Landing: '',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
    },
  },
};

// Inject global scrollbar styles for web
const injectWebStyles = () => {
  if (Platform.OS !== 'web') return;

  const styleId = 'hera-global-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Custom Scrollbar Styles - HERA Design System */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #F5F7F5;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: #C5CFC5;
      border-radius: 4px;
      border: 1px solid #F5F7F5;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #8B9D83;
    }
    ::-webkit-scrollbar-corner {
      background: #F5F7F5;
    }
    * {
      scrollbar-width: thin;
      scrollbar-color: #C5CFC5 #F5F7F5;
    }
    html {
      scroll-behavior: smooth;
    }
  `;
  document.head.appendChild(style);
};

/** Bridges PostHogProvider context to our analytics singleton */
function PostHogBridge() {
  const posthog = usePostHog();
  useEffect(() => {
    if (posthog) {
      setPostHogClient(posthog);
    }
  }, [posthog]);
  return null;
}

export default function App() {
  // Inject web-specific styles on mount
  useEffect(() => {
    injectWebStyles();
  }, []);

  if (!ANALYTICS_ENABLED) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        enableSessionReplay: false,
      }}
      autocapture={false}
    >
      <PostHogBridge />
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </PostHogProvider>
  );
}
