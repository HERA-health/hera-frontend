/**
 * MindConnect App
 * Main entry point for the application
 * Sets up navigation and providers
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

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

export default function App() {
  // Inject web-specific styles on mount
  useEffect(() => {
    injectWebStyles();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
